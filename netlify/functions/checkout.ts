import type { Config } from '@netlify/functions'
import { randomBytes } from 'node:crypto'
import { db } from '../../db/index.js'
import { orders } from '../../db/schema.js'
import { quote } from '../../lib/pricing.js'
import { catalog, checkInventory } from '../../lib/sourcing.js'
import { eq } from 'drizzle-orm'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const BRANDING: Record<string, string> = {
  'branding_settings[display_name]': 'Skabba Deals',
  'branding_settings[font_family]': 'inter',
  'branding_settings[border_style]': 'rounded',
  'branding_settings[background_color]': '#fbf8f3',
  'branding_settings[button_color]': '#b4552e',
}

export default async (req: Request) => {
  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  if (!EMAIL.test(email)) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 })

  const products = await catalog()
  const items = Array.isArray(body.items) ? body.items : []
  if (!items.length || items.length > 30) return Response.json({ error: 'Your cart is empty or too large.' }, { status: 400 })
  for (const item of items) {
    const product = products.get(String(item?.slug ?? ''))
    const qty = Math.floor(Number(item?.qty) || 0)
    if (!product || qty < 1 || qty > 20) return Response.json({ error: 'Your cart contains an invalid product or quantity. Please refresh and try again.' }, { status: 400 })
    if (!product.linked || !product.supplier.vid) {
      return Response.json({ error: `${product.name} is not connected to an available CJ product yet. Please try again later.` }, { status: 409 })
    }
  }

  try {
    if (!await checkInventory(items, products)) return Response.json({ error: 'The requested quantity is no longer available. Please update your cart.' }, { status: 409 })
  } catch (e: any) {
    console.error('CJ inventory check', e.message)
    return Response.json({ error: 'Unable to verify supplier inventory. Please try again shortly.' }, { status: 503 })
  }

  const q = quote(items, body.code, products)
  if (q.lines.length === 0 || q.lines.length !== items.length) {
    return Response.json({ error: 'Your cart contains an unavailable product. Please refresh and try again.' }, { status: 400 })
  }
  // Prevent a manually locked price or promotion from charging less than the recorded costs/fees.
  if (q.profit <= 0) return Response.json({ error: 'This cart is temporarily unavailable at the current price. Please contact support.' }, { status: 409 })

  const stripeKey = Netlify.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) return Response.json({ error: 'Online checkout is temporarily unavailable.' }, { status: 503 })

  const publicId = 'SD-' + randomBytes(8).toString('hex').toUpperCase()
  const [order] = await db
    .insert(orders)
    .values({
      publicId,
      email,
      items: q.lines.map((l) => ({ slug: l.slug, name: l.name, qty: l.qty, unit: l.unit, unitCost: l.unitCost, sku: l.sku, vid: l.vid })),
      subtotal: q.subtotal,
      discount: q.discount,
      shipping: q.shipping,
      total: q.total,
      cogs: q.cogs,
      fees: q.fees,
      profit: q.profit,
      promoCode: q.codeValid ? String(body.code).trim().toUpperCase() : null,
    })
    .returning()

  const origin = new URL(req.url).origin
  const funnel = typeof body.funnel === 'string' && products.has(body.funnel) ? body.funnel : null
  const windows = q.lines.map((l) => l.shipsIn.match(/\d+/g)?.map(Number) ?? [6, 12])
  const minDays = Math.min(...windows.map((w) => w[0] ?? 6))
  const maxDays = Math.max(...windows.map((w) => w[1] ?? w[0] ?? 12))
  const form = new URLSearchParams({
    mode: 'payment',
    currency: 'usd',
    'adaptive_pricing[enabled]': 'false',
    customer_email: email,
    customer_creation: 'always',
    client_reference_id: order.publicId,
    'metadata[order_id]': order.publicId,
    success_url: `${origin}/order?id=${order.publicId}&paid=1${funnel ? `&funnel=${funnel}` : ''}`,
    cancel_url: `${origin}/?checkout=cancelled`,
    'shipping_address_collection[allowed_countries][0]': 'US',
    'shipping_address_collection[allowed_countries][1]': 'CA',
    'phone_number_collection[enabled]': 'true',
    'shipping_options[0][shipping_rate_data][type]': 'fixed_amount',
    'shipping_options[0][shipping_rate_data][display_name]': q.shipping === 0 ? 'Free tracked shipping' : 'Tracked shipping',
    'shipping_options[0][shipping_rate_data][fixed_amount][amount]': String(q.shipping),
    'shipping_options[0][shipping_rate_data][fixed_amount][currency]': 'usd',
    'shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]': 'business_day',
    'shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]': String(minDays),
    'shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]': 'business_day',
    'shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]': String(maxDays),
  })
  q.lines.forEach((l, i) => {
    form.set(`line_items[${i}][quantity]`, String(l.qty))
    form.set(`line_items[${i}][price_data][currency]`, 'usd')
    form.set(`line_items[${i}][price_data][unit_amount]`, String(l.unit))
    form.set(`line_items[${i}][price_data][product_data][name]`, l.name)
    form.set(`line_items[${i}][price_data][product_data][images][0]`, l.image.startsWith('http') ? l.image : `${origin}${l.image}`)
  })

  const createSession = (params: URLSearchParams) =>
    fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { authorization: `Bearer ${stripeKey}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: params,
    })
  let branding = true
  let res: Response
  let session: any
  for (;;) {
    const params = new URLSearchParams(form)
    if (branding) for (const [key, value] of Object.entries(BRANDING)) params.set(key, value)
    res = await createSession(params)
    session = await res.json().catch(() => ({}))
    if (res.ok || res.status !== 400) break
    const param = String(session?.error?.param ?? '')
    if (branding && param.startsWith('branding_settings')) {
      console.warn('Stripe rejected branding settings; retrying without them.')
      branding = false
    } else break
  }
  if (!res.ok) {
    await db.update(orders).set({ status: 'cancelled', notes: 'Stripe checkout session creation failed.', updatedAt: new Date() }).where(eq(orders.id, order.id))
    console.error('Stripe session error', res.status, session?.error?.param ?? '', session?.error?.message)
    return Response.json({ error: 'Checkout is temporarily unavailable. Please try again in a minute.' }, { status: 502 })
  }
  await db.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, order.id))
  return Response.json({ orderId: order.publicId, paymentsEnabled: true, redirect: session.url })
}

export const config: Config = { path: '/api/checkout', method: 'POST' }
