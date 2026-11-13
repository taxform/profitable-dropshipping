import type { Config } from '@netlify/functions'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { orders } from '../../db/schema.js'
import { confirmWithStripe } from '../../lib/payment.js'

// Public order status lookup by the unguessable order id shown to the customer.
export default async (req: Request) => {
  const id = new URL(req.url).searchParams.get('id') ?? ''
  let [o] = await db.select().from(orders).where(eq(orders.publicId, id)).limit(1)
  if (!o) return Response.json({ error: 'Order not found' }, { status: 404 })
  // Don't depend on the webhook alone: if the order still looks unpaid, ask
  // Stripe. The thank-you page sends the Google Ads purchase conversion only
  // for paid orders, so a late webhook would otherwise lose the conversion.
  if (o.status === 'pending_payment' && o.stripeSessionId) {
    try {
      o = (await confirmWithStripe(o.publicId, o.stripeSessionId)) ?? o
    } catch (e: any) {
      console.error('Stripe payment confirmation', e?.message)
    }
  }
  return Response.json({
    id: o.publicId,
    status: o.status,
    items: o.items.map(({ slug, name, qty, unit }) => ({ slug, name, qty, unit })),
    subtotal: o.subtotal,
    discount: o.discount,
    shipping: o.shipping,
    total: o.total,
    trackingNumber: o.trackingNumber,
    createdAt: o.createdAt,
  })
}

export const config: Config = { path: '/api/order' }
