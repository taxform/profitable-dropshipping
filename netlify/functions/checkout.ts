import type { Config } from '@netlify/functions'
import { randomBytes } from 'node:crypto'
import { db } from '../../db/index.js'
import { orders } from '../../db/schema.js'
import { quote } from '../../lib/pricing.js'
import { catalog } from '../../lib/sourcing.js'
import { eq } from 'drizzle-orm'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Stripe-hosted checkout styled to match the storefront (see public/styles.css).
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

  const q = quote(Array.isArray(body.items) ? body.items : [], body.code, await catalog())
  if (q.lines.length === 0) return Response.json({ error: 'Your cart is empty.' }, { status: 400 })

  const publicId = 'SD-' + randomBytes(4).toString('hex').toUpperCase()
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

  const stripeKey = Netlify.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) {
    return Response.json({ orderId: order.publicId, paymentsEnabled: false, redirect: `/order?id=${order.publicId}` })
  }

  const origin = new URL(req.url).origin
  const live = await catalog()
  const funnel = typeof body.funnel === 'string' && live.has(body.funnel) ? body.funnel : null
  // Delivery window spans the slowest item in the cart.
  const windows = q.lines.map((l) => l.shipsIn.match(/\d+/g)?.map(Number) ?? [6, 12])
  const minDays = Math.min(...windows.map((w) => w[0] ?? 6))
  const maxDays = Math.max(...windows.map((w) => w[1] ?? w[0] ?? 12))
  const form = new URLSearchParams({
    mode: 'payment',
    currency: 'usd',
    // Always charge in USD: stop Stripe from converting to the shopper's local currency (e.g. CAD).
    'adaptive_pricing[enabled]': 'false',
    customer_email: email,
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

  const createSession = (body: URLSearchParams) =>
    fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { authorization: `Bearer ${stripeKey}`, 'content-type': 'application/x-www-form-urlencoded' },
      body,
    })
  const branded = new URLSearchParams(form)
  for (const [k, v] of Object.entries(BRANDING)) branded.set(k, v)
  let res = await createSession(branded)
  let session = await res.json()
  // Branding is cosmetic: if Stripe rejects it (e.g. older API version), still take the payment.
  if (!res.ok && res.status === 400 && String(session?.error?.param ?? '').startsWith('branding_settings')) {
    console.warn('Stripe rejected branding settings, retrying without', session?.error?.message)
    res = await createSession(form)
    session = await res.json()
  }
  if (!res.ok) {
    console.error('Stripe session error', session?.error?.message)
    return Response.json({ error: 'Checkout is temporarily unavailable. Please try again in a minute.' }, { status: 502 })
  }
  await db.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, order.id))
  return Response.json({ orderId: order.publicId, paymentsEnabled: true, redirect: session.url })
}

export const config: Config = { path: '/api/checkout', method: 'POST' }
