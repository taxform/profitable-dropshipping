import type { Config } from '@netlify/functions'
import { publicQuote, quote } from '../../lib/pricing.js'
import { catalog } from '../../lib/sourcing.js'

export default async (req: Request) => {
  const body = await req.json().catch(() => ({}))
  return Response.json(publicQuote(quote(Array.isArray(body.items) ? body.items : [], body.code, await catalog())))
}

export const config: Config = { path: '/api/quote', method: 'POST' }
