// Shared SEO helpers for Skabba Deals.
//
// parseTransitDays is the single source of truth for the "Ships in X–Y
// business days" transit window used by the product JSON-LD (server-side
// in netlify/edge-functions/product-meta.ts and client-side in
// public/product.html) and by the Merchant Center feed's shipping times.
// "7–12 business days" -> [7, 12]. Falls back to 6–12.
export function parseTransitDays(shipsIn?: string): [number, number] {
  const match = String(shipsIn || '').match(/(\d+)\s*[–-]\s*(\d+)/)
  return match ? [Number(match[1]), Number(match[2])] : [6, 12]
}
