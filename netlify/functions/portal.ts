import type { Config } from '@netlify/functions'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { orders } from '../../db/schema.js'

// Stripe Customer Portal configuration (Stripe Dashboard → Settings → Billing → Customer portal).
// Can be overridden per environment with STRIPE_PORTAL_CONFIGURATION.
const PORTAL_CONFIGURATION = 'bpc_1UZo132ErYo0uswk0GzT2g4c'

const PAID = new Set(['paid', 'ordered', 'shipped', 'delivered', 'refunded'])

// Opens a Stripe Customer Portal session for the shopper behind an order.
// Requires both the order number and the email used at checkout.
export default async (req: Request) => {
  const stripeKey = Netlify.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) return Response.json({ error: 'Online billing is not available yet.' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const id = String(body.id ?? '').trim().toUpperCase()
  const email = String(body.email ?? '').trim().toLowerCase()
  const notFound = Response.json({ error: "We couldn't match that order number and email." }, { status: 404 })
  if (!id || !email) return notFound

  const [o] = await db.select().from(orders).where(eq(orders.publicId, id)).limit(1)
  if (!o || o.email !== email) return notFound
  if (!PAID.has(o.status)) return Response.json({ error: 'Billing details are available once the order is paid.' }, { status: 409 })

  const auth = { authorization: `Bearer ${stripeKey}` }
  let customer = o.stripeCustomerId
  // Orders paid before customers were saved: recover the customer from the Checkout Session if Stripe created one.
  if (!customer && o.stripeSessionId) {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(o.stripeSessionId)}`, { headers: auth })
    const session = res.ok ? await res.json() : null
    customer = typeof session?.customer === 'string' ? session.customer : null
    if (customer) await db.update(orders).set({ stripeCustomerId: customer }).where(eq(orders.id, o.id))
  }
  if (!customer) {
    return Response.json(
      { error: 'This order was paid as a guest, so there is no billing account to open. Email hello@skabbadeals.com for a receipt.' },
      { status: 409 },
    )
  }

  const origin = new URL(req.url).origin
  const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      customer,
      configuration: Netlify.env.get('STRIPE_PORTAL_CONFIGURATION') || PORTAL_CONFIGURATION,
      return_url: `${origin}/order?id=${encodeURIComponent(o.publicId)}`,
    }),
  })
  const portal = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('Stripe portal error', res.status, portal?.error?.param ?? '', portal?.error?.message)
    return Response.json({ error: 'The billing portal is temporarily unavailable. Please try again in a minute.' }, { status: 502 })
  }
  return Response.json({ url: portal.url })
}

export const config: Config = { path: '/api/portal', method: 'POST' }
