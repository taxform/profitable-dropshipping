import type { Config } from '@netlify/functions'
import { count, desc, eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { orders, subscribers } from '../../db/schema.js'
import { authorized } from '../../lib/auth.js'
import { cjEnabled } from '../../lib/cj.js'
import { catalog, sources } from '../../lib/sourcing.js'
import { STRIPE_FEE } from '../../lib/pricing.js'

const STATUSES = ['pending_payment', 'paid', 'ordered', 'shipped', 'delivered', 'cancelled', 'refunded']
const REVENUE_STATUSES = new Set(['paid', 'ordered', 'shipped', 'delivered'])

export default async (req: Request) => {
  const denied = authorized(req)
  if (denied) return denied

  if (req.method === 'PATCH') {
    const body = await req.json().catch(() => ({}))
    const patch: Partial<typeof orders.$inferInsert> = { updatedAt: new Date() }
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) return Response.json({ error: 'Unknown status' }, { status: 400 })
      patch.status = body.status
    }
    for (const key of ['trackingNumber', 'supplierOrderId', 'notes'] as const) {
      if (body[key] !== undefined) patch[key] = String(body[key]).slice(0, 500) || null
    }
    const [o] = await db.update(orders).set(patch).where(eq(orders.publicId, String(body.id))).returning()
    if (!o) return Response.json({ error: 'Order not found' }, { status: 404 })
    return Response.json(o)
  }

  const all = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(500)
  const [{ value: subscriberCount }] = await db.select({ value: count() }).from(subscribers)
  const earning = all.filter((o) => REVENUE_STATUSES.has(o.status))
  const sum = (k: 'total' | 'cogs' | 'fees' | 'profit') => earning.reduce((s, o) => s + o[k], 0)
  const units: Record<string, { name: string; units: number; revenue: number; profit: number }> = {}
  for (const o of earning)
    for (const l of o.items) {
      const u = (units[l.slug] ??= { name: l.name, units: 0, revenue: 0, profit: 0 })
      u.units += l.qty
      u.revenue += l.unit * l.qty
      u.profit += (l.unit - l.unitCost) * l.qty
    }

  return Response.json({
    stats: {
      revenue: sum('total'),
      cogs: sum('cogs'),
      fees: sum('fees'),
      profit: sum('profit'),
      paidOrders: earning.length,
      aov: earning.length ? Math.round(sum('total') / earning.length) : 0,
      toFulfil: all.filter((o) => o.status === 'paid').length,
      abandoned: all.filter((o) => o.status === 'pending_payment').length,
      subscribers: subscriberCount,
    },
    topProducts: Object.entries(units).map(([slug, u]) => ({ slug, ...u })).sort((a, b) => b.profit - a.profit),
    unitEconomics: [...(await catalog()).values()].map((p) => {
      const fee = Math.round((p.price * STRIPE_FEE.pct) / 100 + STRIPE_FEE.fixed)
      return { slug: p.slug, name: p.name, price: p.price, cost: p.cost, fee, margin: p.price - p.cost - fee, sku: p.supplier.sku, supplier: p.supplier.name, linked: !!p.linked }
    }),
    orders: all,
    statuses: STATUSES,
    paymentsEnabled: !!Netlify.env.get('STRIPE_SECRET_KEY'),
    cjEnabled: cjEnabled(),
    // Supplier payment is intentionally never automated; CJ_AUTO_PAY is ignored by sourcing.
    cjAutoPay: false,
    products: [...(await catalog()).values()].map((p) => ({ slug: p.slug, name: p.name, image: p.image, cjQuery: p.cjQuery, compareAt: p.compareAt, inventory: p.inventory, inventoryCheckedAt: p.inventoryCheckedAt })),
    sources: await sources(),
  })
}

export const config: Config = { path: '/api/admin', method: ['GET', 'PATCH'] }
