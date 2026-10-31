import type { Config } from '@netlify/functions'
import { publicProduct } from '../../lib/catalog.js'
import { catalog } from '../../lib/sourcing.js'
import { BUNDLE_TIERS, FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT } from '../../lib/pricing.js'

export default async () =>
  Response.json(
    {
      products: [...(await catalog()).values()].map(publicProduct),
      offers: { bundleTiers: BUNDLE_TIERS, freeShippingThreshold: FREE_SHIPPING_THRESHOLD, shippingFlat: SHIPPING_FLAT },
    },
    { headers: { 'cache-control': 'public, max-age=60' } },
  )

export const config: Config = { path: '/api/products' }
