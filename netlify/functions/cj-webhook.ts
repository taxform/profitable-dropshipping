import type { Config } from '@netlify/functions'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { settings } from '../../db/schema.js'

// Persist before acknowledging; no supplier orders or payments are made here.
// Inventory and tracking continue to be reconciled by cj-sync.
export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (Number(req.headers.get('content-length') || 0) > 1_000_000)
    return new Response('Payload too large', { status: 413 })
  const raw = await req.text()
  if (Buffer.byteLength(raw) > 1_000_000) return new Response('Payload too large', { status: 413 })
  try {
    const [saved] = await db.select().from(settings).where(eq(settings.key, 'cj_tokens')).limit(1)
    const tokens = saved?.value as { openId?: string | number } | undefined
    const secret = process.env.CJ_OPEN_ID || tokens?.openId
    if (!secret) return new Response('Webhook signing is not configured', { status: 503 })
    const expected = createHmac('sha256', String(secret)).update(raw).digest('base64')
    const supplied = req.headers.get('sign') || ''
    if (supplied.length !== expected.length ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)))
      return new Response('Invalid signature', { status: 401 })
    let message: any
    try { message = JSON.parse(raw) } catch { return new Response('Invalid JSON', { status: 400 }) }
    if (!message || typeof message.messageId !== 'string' || !message.messageId ||
        message.messageId.length > 200 || typeof message.type !== 'string')
      return new Response('Invalid message', { status: 400 })
    // openId is also the signing secret; never store it in the notification inbox.
    const { openId: _secret, ...notification } = message
    await db.insert(settings).values({
      key: 'cj_webhook:' + message.messageId,
      value: { notification, receivedAt: new Date().toISOString() },
    }).onConflictDoNothing()
    return Response.json({ code: 200, result: 'success', message: 'ok' })
  } catch {
    console.error('CJ webhook persistence failed')
    return new Response('Webhook unavailable', { status: 503 })
  }
}

export const config: Config = { path: '/api/webhooks/cj', method: 'POST' }
