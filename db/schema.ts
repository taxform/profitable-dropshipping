import { pgTable, serial, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core'

export type OrderLine = { slug: string; name: string; qty: number; unit: number; unitCost: number; sku: string; vid?: string | null }

export const orders = pgTable('orders', {
  id: serial().primaryKey(),
  publicId: text('public_id').notNull().unique(),
  email: text().notNull(),
  name: text(),
  shippingAddress: jsonb('shipping_address'),
  items: jsonb().$type<OrderLine[]>().notNull(),
  subtotal: integer().notNull(),
  discount: integer().notNull().default(0),
  shipping: integer().notNull().default(0),
  total: integer().notNull(),
  cogs: integer().notNull(),
  fees: integer().notNull(),
  profit: integer().notNull(),
  promoCode: text('promo_code'),
  // pending_payment → paid → ordered (placed with supplier) → shipped → delivered; or cancelled / refunded
  status: text().notNull().default('pending_payment'),
  stripeSessionId: text('stripe_session_id'),
  supplierOrderId: text('supplier_order_id'),
  trackingNumber: text('tracking_number'),
  notes: text(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const subscribers = pgTable('subscribers', {
  id: serial().primaryKey(),
  email: text().notNull().unique(),
  source: text(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Links a catalog product (by slug) to the real CJdropshipping variant that fulfils it, with the
// live supplier cost pulled from CJ. Price is recomputed from cost on every sync unless locked.
export const productSources = pgTable('product_sources', {
  slug: text().primaryKey(),
  cjPid: text('cj_pid').notNull(),
  cjVid: text('cj_vid').notNull(),
  cjSku: text('cj_sku'),
  cjName: text('cj_name'),
  cjVariantName: text('cj_variant_name'),
  cjImage: text('cj_image'),
  productCost: integer('product_cost').notNull(),
  shippingCost: integer('shipping_cost').notNull(),
  logisticName: text('logistic_name'),
  shippingDays: text('shipping_days'),
  price: integer().notNull(),
  priceLocked: boolean('price_locked').notNull().default(false),
  useCjImage: boolean('use_cj_image').notNull().default(true),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull(),
})

export const settings = pgTable('settings', {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
