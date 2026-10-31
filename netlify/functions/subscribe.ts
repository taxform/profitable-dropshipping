import type { Config } from '@netlify/functions'
import { db } from '../../db/index.js'
import { subscribers } from '../../db/schema.js'

export default async (req: Request) => {
  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 })
  await db.insert(subscribers).values({ email, source: String(body.source ?? 'site').slice(0, 40) }).onConflictDoNothing()
  return Response.json({ ok: true, code: 'WELCOME10' })
}

export const config: Config = { path: '/api/subscribe', method: 'POST' }
