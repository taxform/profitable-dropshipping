import { bySlug, type Product } from './catalog.js'

// Store-wide offer rules. Kept in one place so the storefront, checkout and Stripe always agree.
export const FREE_SHIPPING_THRESHOLD = 4900
export const SHIPPING_FLAT = 595
export const BUNDLE_TIERS = [
  { minQty: 3, pct: 20 },
  { minQty: 2, pct: 10 },
]
export const CODES: Record<string, number> = { WELCOME10: 10 }
export const STRIPE_FEE = { pct: 2.9, fixed: 30 }

// Retail price from CJ landed cost (item + shipping to the US): 3× cost and at least $15 over it,
// ending in .99. That keeps every unit profitable after the 20% bundle discount and card fees.
export const MARKUP = { multiple: 3, minProfit: 1500 }
export function suggestPrice(landed: number) {
  const target = Math.max(landed * MARKUP.multiple, landed + MARKUP.minProfit)
  return Math.ceil(target / 100) * 100 - 1
}

export type CartInput = { slug: string; qty: number }[]

export function quote(items: CartInput, code?: string | null, products: Map<string, Product> = bySlug) {
  const lines = items
    .map((i) => ({ product: products.get(String(i.slug)), qty: Math.max(0, Math.min(20, Math.floor(Number(i.qty) || 0))) }))
    .filter((l): l is { product: NonNullable<typeof l.product>; qty: number } => !!l.product && l.qty > 0)

  const totalQty = lines.reduce((n, l) => n + l.qty, 0)
  const tier = BUNDLE_TIERS.find((t) => totalQty >= t.minQty)
  const normalizedCode = code ? String(code).trim().toUpperCase() : ''
  const codePct = CODES[normalizedCode] ?? 0
  // The best single discount wins; offers don't stack.
  const pct = Math.max(tier?.pct ?? 0, codePct)
  const appliedOffer = pct === 0 ? null : codePct >= (tier?.pct ?? 0) ? `Code ${normalizedCode}` : `Bundle: ${tier!.minQty}+ items`

  const priced = lines.map(({ product, qty }) => {
    const unit = Math.round(product.price * (1 - pct / 100))
    return {
      slug: product.slug,
      name: product.name,
      image: product.image,
      qty,
      listUnit: product.price,
      unit,
      lineTotal: unit * qty,
      unitCost: product.cost,
      sku: product.supplier.sku,
      vid: product.supplier.vid ?? null,
      shipsIn: product.shipsIn,
    }
  })

  const listSubtotal = priced.reduce((s, l) => s + l.listUnit * l.qty, 0)
  const subtotal = priced.reduce((s, l) => s + l.lineTotal, 0)
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT
  const total = subtotal + shipping
  const cogs = priced.reduce((s, l) => s + l.unitCost * l.qty, 0)
  const fees = total > 0 ? Math.round((total * STRIPE_FEE.pct) / 100 + STRIPE_FEE.fixed) : 0

  const nextTier = [...BUNDLE_TIERS].reverse().find((t) => totalQty < t.minQty)

  return {
    lines: priced,
    totalQty,
    listSubtotal,
    discount: listSubtotal - subtotal,
    discountPct: pct,
    appliedOffer,
    codeValid: normalizedCode ? codePct > 0 : null,
    subtotal,
    shipping,
    total,
    freeShippingRemaining: subtotal > 0 ? Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal) : FREE_SHIPPING_THRESHOLD,
    nextTier: nextTier ? { itemsNeeded: nextTier.minQty - totalQty, pct: nextTier.pct } : null,
    // Private economics, stripped before sending to shoppers.
    cogs,
    fees,
    profit: total - cogs - fees,
  }
}

export function publicQuote(q: ReturnType<typeof quote>) {
  const { cogs, fees, profit, ...rest } = q
  return { ...rest, lines: rest.lines.map(({ unitCost, sku, vid, shipsIn, ...l }) => l) }
}
