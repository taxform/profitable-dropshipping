// Ties the static catalog to live CJdropshipping data: real variants, landed costs, prices,
// order forwarding and tracking.
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '../db/index.js'
import { orders, productSources } from '../db/schema.js'
import { bySlug as baseBySlug, PRODUCTS, type Product } from './catalog.js'
import { suggestPrice } from './pricing.js'
import * as cj from './cj.js'

type Source = typeof productSources.$inferSelect

const shipsIn = (days: string) => {
  const [a, b] = days.split('-').map(Number)
  return a && b ? `${a + 2}–${b + 3} business days` : null
}

function applySource(p: Product, s: Source): Product {
  return {
    ...p,
    price: s.price,
    cost: s.productCost + s.shippingCost,
    image: s.useCjImage && s.cjImage ? s.cjImage : p.image,
    shipsIn: shipsIn(s.shippingDays ?? '') ?? p.shipsIn,
    supplier: { name: 'CJdropshipping', sku: s.cjSku ?? s.cjVid, url: '', vid: s.cjVid },
    linked: true,
  }
}

let cache: { at: number; map: Map<string, Product> } | null = null

// The live catalog: static copy merged with whatever has been linked to CJ.
export async function catalog(): Promise<Map<string, Product>> {
  if (cache && Date.now() - cache.at < 30_000) return cache.map
  let rows: Source[] = []
  try {
    rows = await db.select().from(productSources)
  } catch (e: any) {
    // Never take the storefront down over sourcing data; sell at catalog prices instead.
    console.error('Loading CJ product links failed', e.message)
  }
  const sources = new Map(rows.map((s) => [s.slug, s]))
  const map = new Map(PRODUCTS.map((p) => [p.slug, sources.has(p.slug) ? applySource(p, sources.get(p.slug)!) : p]))
  cache = { at: Date.now(), map }
  return map
}

export async function sources() {
  return db.select().from(productSources)
}

// Links a product to a CJ listing (first variant unless one is given) and prices it from the real landed cost.
export async function linkProduct(slug: string, pid: string, vid?: string | null) {
  if (!baseBySlug.has(slug)) throw new Error('Unknown product')
  const product = await cj.getProduct(pid)
  const variant = (vid && product.variants.find((v) => v.vid === vid)) || product.variants[0]
  if (!variant) throw new Error('That CJ listing has no purchasable variants.')
  const ship = await cj.bestShipping([{ vid: variant.vid, quantity: 1 }])
  const [existing] = await db.select().from(productSources).where(eq(productSources.slug, slug)).limit(1)
  const values = {
    slug,
    cjPid: product.pid,
    cjVid: variant.vid,
    cjSku: variant.sku,
    cjName: product.name,
    cjVariantName: product.variants.length > 1 ? variant.name : null,
    cjImage: variant.image || product.image,
    productCost: variant.price,
    shippingCost: ship.price,
    logisticName: ship.logisticName,
    shippingDays: ship.days,
    price: existing?.priceLocked ? existing.price : suggestPrice(variant.price + ship.price),
    syncedAt: new Date(),
  }
  const [row] = await db.insert(productSources).values(values).onConflictDoUpdate({ target: productSources.slug, set: values }).returning()
  cache = null
  return { ...row, variants: product.variants }
}

// Picks the most-listed of CJ's top matches for the product's search phrase.
export async function autoMatch(slug: string) {
  const base = baseBySlug.get(slug)
  if (!base) throw new Error('Unknown product')
  const top = (await cj.searchProducts(base.cjQuery)).filter((r) => Number.isFinite(r.price)).slice(0, 6)
  if (!top.length) throw new Error(`No CJ results for "${base.cjQuery}". Search manually.`)
  const pick = top.reduce((best, r) => (r.listed > best.listed ? r : best), top[0])
  return linkProduct(slug, pick.pid)
}

export async function refreshProduct(slug: string) {
  const [s] = await db.select().from(productSources).where(eq(productSources.slug, slug)).limit(1)
  if (!s) throw new Error('Product is not linked to CJ yet.')
  return linkProduct(slug, s.cjPid, s.cjVid)
}

export async function updateSource(slug: string, patch: { price?: number | null; useCjImage?: boolean }) {
  const set: Partial<Source> = {}
  if (patch.useCjImage !== undefined) set.useCjImage = !!patch.useCjImage
  if (patch.price === null) {
    const [s] = await db.select().from(productSources).where(eq(productSources.slug, slug)).limit(1)
    if (!s) throw new Error('Product is not linked to CJ yet.')
    Object.assign(set, { priceLocked: false, price: suggestPrice(s.productCost + s.shippingCost) })
  } else if (patch.price !== undefined) {
    const price = Math.round(Number(patch.price))
    if (!(price >= 100)) throw new Error('Enter a price of at least $1.')
    Object.assign(set, { priceLocked: true, price })
  }
  const [row] = await db.update(productSources).set(set).where(eq(productSources.slug, slug)).returning()
  if (!row) throw new Error('Product is not linked to CJ yet.')
  cache = null
  return row
}

export async function unlinkProduct(slug: string) {
  await db.delete(productSources).where(eq(productSources.slug, slug))
  cache = null
}

const COUNTRY_NAMES: Record<string, string> = { US: 'United States', CA: 'Canada' }

type Address = { line1?: string; line2?: string | null; city?: string; state?: string; postal_code?: string; country?: string; phone?: string | null }

// Places a paid order with CJ. CJ rejects duplicate order numbers, so retries are safe.
export async function forwardOrder(publicId: string) {
  const [o] = await db.select().from(orders).where(eq(orders.publicId, publicId)).limit(1)
  if (!o) throw new Error('Order not found')
  if (o.status !== 'paid') throw new Error(`Order is "${o.status}", only paid orders can be sent to CJ.`)
  const a = o.shippingAddress as Address | null
  if (!a?.line1 || !a.country) throw new Error('Order has no shipping address yet.')

  const live = await catalog()
  const products = o.items.map((l) => ({ vid: l.vid || live.get(l.slug)?.supplier.vid || '', quantity: l.qty, name: l.name }))
  const missing = products.filter((p) => !p.vid).map((p) => p.name)
  if (missing.length) throw new Error(`Not linked to a CJ product: ${missing.join(', ')}`)

  try {
    const ship = await cj.bestShipping(products.map(({ vid, quantity }) => ({ vid, quantity })), a.country)
    const res = await cj.createOrder({
      orderNumber: o.publicId,
      shippingCountryCode: a.country,
      shippingCountry: COUNTRY_NAMES[a.country] ?? a.country,
      shippingProvince: a.state ?? '',
      shippingCity: a.city ?? '',
      shippingZip: a.postal_code ?? '',
      shippingAddress: a.line1,
      shippingAddress2: a.line2 ?? '',
      shippingCustomerName: o.name ?? o.email,
      shippingPhone: a.phone ?? '',
      email: o.email,
      logisticName: ship.logisticName,
      fromCountryCode: 'CN',
      // 2 = pay from CJ wallet balance automatically, 3 = create only and pay in the CJ dashboard.
      payType: process.env.CJ_AUTO_PAY === 'true' ? 2 : 3,
      products: products.map(({ vid, quantity }) => ({ vid, quantity })),
    })
    const [row] = await db
      .update(orders)
      .set({ status: 'ordered', supplierOrderId: String(res.orderId), notes: `Sent to CJ via ${ship.logisticName}`, updatedAt: new Date() })
      .where(and(eq(orders.id, o.id), eq(orders.status, 'paid')))
      .returning()
    return row
  } catch (e: any) {
    await db.update(orders).set({ notes: String(e.message).slice(0, 500), updatedAt: new Date() }).where(eq(orders.id, o.id))
    throw e
  }
}

// Paid orders that haven't reached CJ yet (e.g. a failed first attempt).
export async function unforwardedOrders(limit: number) {
  return db.select().from(orders).where(and(eq(orders.status, 'paid'), isNull(orders.supplierOrderId))).orderBy(asc(orders.paidAt)).limit(limit)
}

// Copies CJ tracking numbers onto orders and marks them shipped.
export async function syncTracking(limit = 12) {
  const open = await db.select().from(orders).where(eq(orders.status, 'ordered')).orderBy(asc(orders.updatedAt)).limit(limit)
  let shipped = 0
  for (const o of open) {
    if (!o.supplierOrderId) continue
    try {
      const d = await cj.getOrder(o.supplierOrderId)
      if (d?.trackNumber) {
        await db.update(orders).set({ status: 'shipped', trackingNumber: d.trackNumber, updatedAt: new Date() }).where(eq(orders.id, o.id))
        shipped++
      } else {
        await db.update(orders).set({ updatedAt: new Date() }).where(eq(orders.id, o.id))
      }
    } catch (e: any) {
      console.error('CJ tracking', o.publicId, e.message)
    }
  }
  return { checked: open.length, shipped }
}
