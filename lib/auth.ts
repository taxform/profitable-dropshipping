import { createHash, timingSafeEqual } from 'node:crypto'

// Returns an error response when the request lacks the admin password, otherwise null.
export function authorized(req: Request) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return Response.json({ error: 'Set the ADMIN_PASSWORD environment variable to enable the dashboard.' }, { status: 503 })
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '')
  const a = createHash('sha256').update(given).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b) ? null : Response.json({ error: 'Wrong password.' }, { status: 401 })
}
