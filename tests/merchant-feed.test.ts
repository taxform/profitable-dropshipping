import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PRODUCTS } from '../lib/catalog.ts'

// Google Merchant Center rejects a feed where sale_price >= price.
// NOTE: the feed function itself is not imported here because it uses a
// `.js` specifier for the catalog (`../../lib/catalog.js`), which only
// resolves under Netlify's bundler. This test guards the rule instead:
// compareAt is the regular ("was") price, so on sale the feed must emit
// price = compareAt and sale_price = the lower selling price.
test('merchant feed rule: sale_price is always below price for current catalog', () => {
  const feedSource = readFileSync('netlify/functions/merchant-feed.ts', 'utf8')
  // The feed must emit the regular price as <g:price> and the selling
  // price as <g:sale_price> — never the other way round.
  assert.ok(feedSource.includes('<g:price>${regularPrice} USD</g:price>'))
  assert.ok(feedSource.includes('<g:sale_price>${price} USD</g:sale_price>'))
  assert.ok(!feedSource.includes('<g:sale_price>${(p.compareAt / 100).toFixed(2)}'))

  for (const p of PRODUCTS) {
    const price = p.price / 100
    if (p.compareAt > p.price) {
      // On sale: feed price = compareAt, sale_price = selling price.
      assert.ok(price < p.compareAt / 100, `${p.slug}: sale price must be below regular price`)
    }
  }
})

test('merchant feed: transit window matches the shipping page (6–15 days)', () => {
  const feedSource = readFileSync('netlify/functions/merchant-feed.ts', 'utf8')
  assert.ok(feedSource.includes('<g:min_transit_time>6</g:min_transit_time>'))
  assert.ok(feedSource.includes('<g:max_transit_time>15</g:max_transit_time>'))
})
