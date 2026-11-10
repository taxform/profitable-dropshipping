import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chinaStock } from '../lib/inventory.ts'

test('counts only CN stock and does not double count total and storage fields', () => {
  assert.equal(chinaStock([
    { countryCode: 'CN', totalInventoryNum: 12, storageNum: 12 },
    { countryCode: 'US', totalInventoryNum: 100 },
    { countryCode: 'CN', storageNum: '3' },
  ]), 15)
  assert.equal(chinaStock([]), 0)
  assert.equal(chinaStock([{ countryCode: 'US', totalInventoryNum: 100 }]), 0)
})

test('malformed stock fails instead of being treated as available', () => {
  for (const data of [null, {}, [{ countryCode: 'CN' }], [{ countryCode: 'CN', totalInventoryNum: -1 }]]) {
    assert.throws(() => chinaStock(data))
  }
})

test('background jobs and payment webhooks cannot forward supplier orders', () => {
  for (const path of ['netlify/functions/cj-sync.ts', 'netlify/functions/stripe-webhook.ts']) {
    assert.doesNotMatch(readFileSync(path, 'utf8'), /forwardOrder|createOrder/)
  }
})
