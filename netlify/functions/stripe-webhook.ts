import type { Config, Context } from '@netlify/functions'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { orders } from '../../db/schema.js'
import { cjEnabled } from '../../lib/cj.js'

function verify(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=') as [string, string]))
  const t = Number(parts.t)
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false
  const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest()
  return header
    .split(',')
    .filter((kv) => kv.startsWith('v1='))
    .some((kv) => {
      const sig = Buffer.from(kv.slice(3), 'hex')
      return sig.length === expected.length && timingSafeEqual(sig, expected)
    })
}

export default async (req: Request, context: Context) => {
  // Accept the legacy lowercase name too: env vars are case-sensitive and the
  // dashboard currently stores this secret as `stripe_webhook_secret`.
  const secret = Netlify.env.get('STRIPE_WEBHOOK_SECRET') ?? Netlify.env.get('stripe_webhook_secret')
  if (!secret) return new Response('Webhook secret not configured', { status: 503 })
  const payload = await req.text()
  if (!verify(payload, req.headers.get('stripe-signature') ?? '', secret)) return new Response('Bad signature', { status: 400 })

  const event = JSON.parse(payload)
  const session = event.data?.object
  const orderId = session?.metadata?.order_id ?? session?.client_reference_id

  if (orderId && (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded')) {
    if (session.payment_status === 'paid') {
      const details = session.collected_information?.shipping_details ?? session.shipping_details ?? null
      const [paid] = await db
        .update(orders)
        .set({
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null),
          name: details?.name ?? session.customer_details?.name ?? null,
          shippingAddress: details?.address ? { ...details.address, phone: session.customer_details?.phone ?? null } : null,
          notes: 'Payment received — awaiting manual supplier approval before order is sent to CJ.',
        })
        .where(and(eq(orders.publicId, orderId), eq(orders.status, 'pending_payment')))
        .returning()

      // Manual supplier approval is required before any CJ order is created.
      // The admin dashboard sends the supplier order intentionally after a human review.
      if (paid && cjEnabled()) {
        context.waitUntil(Promise.resolve())
      }
    }
  } else if (orderId && event.type === 'checkout.session.expired') {
    await db
      .update(orders)
      .set({ status: 'cancelled', updatedAt: new Date(), notes: 'Checkout session expired' })
      .where(and(eq(orders.publicId, orderId), eq(orders.status, 'pending_payment')))
  }
  return new Response('ok')
}

export const config: Config = { path: '/api/stripe-webhook', method: 'POST' }
