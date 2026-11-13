import { and, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { orders } from '../db/schema.js'

// Moves a pending order to "paid" from a Stripe Checkout Session object.
// Shared by the Stripe webhook and the order-status lookup, so a paid order is
// confirmed even when the webhook is slow or fails. Only pending orders change,
// so calling this twice is harmless. Paid orders still wait for owner approval
// in the admin dashboard before anything is sent to the supplier.
export async function markPaidFromSession(publicId: string, session: any) {
  if (session?.payment_status !== 'paid') return null
  const ref = session.metadata?.order_id ?? session.client_reference_id
  if (ref !== publicId) return null
  const details = session.collected_information?.shipping_details ?? session.shipping_details ?? null
  const [paid] = await db
    .update(orders)
    .set({
      status: 'paid',
      paidAt: new Date(),
      updatedAt: new Date(),
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null),
      name: details?.name ?? session.customer_details?.name ?? null,
      shippingAddress: details?.address ? { ...details.address, phone: session.customer_details?.phone ?? null } : null,
    })
    .where(and(eq(orders.publicId, publicId), eq(orders.status, 'pending_payment')))
    .returning()
  return paid ?? null
}

// Asks Stripe directly whether the order's Checkout Session has been paid.
export async function confirmWithStripe(publicId: string, sessionId: string) {
  const key = Netlify.env.get('STRIPE_SECRET_KEY')
  if (!key) return null
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { authorization: `Bearer ${key}` },
  })
  if (!res.ok) {
    console.error('Stripe session lookup failed', res.status)
    return null
  }
  return markPaidFromSession(publicId, await res.json())
}
