import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// The thank-you page sends the Google Ads purchase conversion only when
// /api/order reports a paid order. That status must not depend solely on the
// Stripe webhook arriving in time, or late webhooks silently lose conversions.
test('order lookup confirms payment with Stripe instead of waiting for the webhook', () => {
  const order = readFileSync('netlify/functions/order.ts', 'utf8')
  assert.match(order, /confirmWithStripe\(/)
  const webhook = readFileSync('netlify/functions/stripe-webhook.ts', 'utf8')
  assert.match(webhook, /markPaidFromSession\(/)
  const payment = readFileSync('lib/payment.ts', 'utf8')
  assert.match(payment, /payment_status !== 'paid'/)
  assert.match(payment, /eq\(orders\.status, 'pending_payment'\)/)
  assert.doesNotMatch(payment, /forwardOrder|createOrder/)
})

test('thank-you page sends the Ads conversion with the order id for deduplication', () => {
  const page = readFileSync('public/order.html', 'utf8')
  assert.match(page, /send_to: 'AW-18560717085\//)
  assert.match(page, /transaction_id: o\.id/)
})
