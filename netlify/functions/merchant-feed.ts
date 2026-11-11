import type { Config } from '@netlify/functions'
import { PRODUCTS } from '../../lib/catalog.js'


const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')


// Google Merchant Center product feed (Shopping ads + free listings).
// Feed URL after deploy: https://skabbadeals.com/merchant-feed.xml
// Submit it in Merchant Center: Products > Data sources > Add > Product feed (scheduled fetch or upload).
export default async () => {
  const items = PRODUCTS.map((p) => {
    const price = (p.price / 100).toFixed(2)
    const sale = `https://skabbadeals.com/products/${p.slug}`
    const image = p.image.startsWith('http') ? p.image : `https://skabbadeals.com${p.image}`
    // Google Merchant Center requires sale_price < price. The store's
    // selling price IS the sale price; compareAt is the regular ("was")
    // price, so when a product is discounted the feed's price is the
    // regular price and sale_price is what the shopper actually pays.
    // (Previously this was backwards: sale_price was the higher compareAt.)
    const onSale = p.compareAt > p.price
    const regularPrice = onSale ? (p.compareAt / 100).toFixed(2) : price
    const salePrice = onSale ? `    <g:sale_price>${price} USD</g:sale_price>` : ''
    return `  <item>
    <g:id>${esc(p.slug)}</g:id>
    <g:title>${esc(`${p.name} — ${p.tagline}`)}</g:title>
    <g:description>${esc(p.description + ' ' + p.bullets.join('. '))}</g:description>
    <g:link>${esc(sale)}</g:link>
    <g:image_link>${esc(image)}</g:image_link>
    <g:availability>in_stock</g:availability>
    <g:condition>new</g:condition>
    <g:price>${regularPrice} USD</g:price>
${salePrice}
    <g:brand>Skabba Deals</g:brand>
    <g:mpn>${esc(p.supplier.sku)}</g:mpn>
    <g:identifier_exists>no</g:identifier_exists>
    <g:product_type>${esc('Home & Garden > Kitchen & Dining > ' + p.category)}</g:product_type>
    <g:google_product_category>620</g:google_product_category>
    <g:shipping>
      <g:country>US</g:country>
      <g:service>Tracked</g:service>
      <g:price>5.95 USD</g:price>
      <g:min_handling_time>1</g:min_handling_time>
      <g:max_handling_time>2</g:max_handling_time>
      <g:min_transit_time>6</g:min_transit_time>
      <g:max_transit_time>15</g:max_transit_time>
    </g:shipping>
  </item>`
  }).join('\n')


  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>Skabba Deals — Kitchen gadgets</title>
  <link>https://skabbadeals.com/</link>
  <description>Skabba Deals product feed for Google Shopping.</description>
${items}
</channel>
</rss>
`
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
}


export const config: Config = { path: '/merchant-feed.xml' }
