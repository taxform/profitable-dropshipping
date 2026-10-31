import type { Config } from '@netlify/functions'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { orders } from '../../db/schema.js'

// Public order status lookup by the unguessable order id shown to the customer.
export default async (req: Request) => {
  const id = new URL(req.url).searchParams.get('id') ?? ''
  const [o] = await db.select().from(orders).where(eq(orders.publicId, id)).limit(1)
  if (!o) return Response.json({ error: 'Order not found' }, { status: 404 })
  return Response.json({
    id: o.publicId,
    status: o.status,
    items: o.items.map(({ name, qty, unit }) => ({ name, qty, unit })),
    subtotal: o.subtotal,
    discount: o.discount,
    shipping: o.shipping,
    total: o.total,
    trackingNumber: o.trackingNumber,
    createdAt: o.createdAt,
  })
}

export const config: Config = { path: '/api/order' }
