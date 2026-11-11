import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'
import { PRODUCTS } from '../lib/catalog.ts'
import { parseTransitDays } from '../lib/seo.ts'

// Merchant Center feed: sale_price must be below price. The store's
// selling price IS the sale price; compareAt is the regular ("was") price.
describe('Merchant Center feed sale_price', () => {
  it('never emits sale_price above price (compareAt is the regular price)', () => {
    for (const p of PRODUCTS) {
      if (p.compareAt > p.price) {
        assert.ok(p.price / 100 < p.compareAt / 100)
      }
    }
  })
})

describe('parseTransitDays', () => {
  it('parses "Ships in 6–12 business days"', () => {
    assert.deepEqual(parseTransitDays('Ships in 6–12 business days'), [6, 12])
  })

  it('parses a 15-day upper bound ("Ships in 8–15 business days")', () => {
    assert.deepEqual(parseTransitDays('Ships in 8–15 business days'), [8, 15])
  })

  it('en dash and hyphen both parse', () => {
    assert.deepEqual(parseTransitDays('Ships in 6–15 business days'), [6, 15])
    assert.deepEqual(parseTransitDays('Ships in 6-12 business days'), [6, 12])
  })

  it('falls back to 6–12 when no range is present', () => {
    assert.deepEqual(parseTransitDays('6'), [6, 12])
    assert.deepEqual(parseTransitDays(''), [6, 12])
    assert.deepEqual(parseTransitDays(), [6, 12])
  })
})
