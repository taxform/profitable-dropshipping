import type { Config } from '@netlify/functions'
import { authorized } from '../../lib/auth.js'
import { getProduct, searchProducts } from '../../lib/cj.js'
import { syncInventory, autoMatch, forwardOrder, linkProduct, refreshProduct, syncTracking, unlinkProduct, updateSource } from '../../lib/sourcing.js'

// Dashboard actions against CJdropshipping. One CJ product per request keeps each call well inside the timeout.
export default async (req: Request) => {
  const denied = authorized(req)
  if (denied) return denied
  const b = await req.json().catch(() => ({}))
  const slug = String(b.slug ?? '')
  try {
    switch (b.action) {
      case 'search':
        return Response.json(await searchProducts(String(b.q ?? '').slice(0, 100)))
      case 'product':
        return Response.json(await getProduct(String(b.pid)))
      case 'link':
        return Response.json(await linkProduct(slug, String(b.pid), b.vid ? String(b.vid) : null))
      case 'automatch':
        return Response.json(await autoMatch(slug))
      case 'refresh':
        return Response.json(await refreshProduct(slug))
      case 'update':
        return Response.json(await updateSource(slug, { price: b.price, useCjImage: b.useCjImage }))
      case 'unlink':
        await unlinkProduct(slug)
        return Response.json({ ok: true })
      case 'forward':
        return Response.json(await forwardOrder(String(b.id)))
      case 'inventory':
        return Response.json(await syncInventory())
      case 'tracking':
        return Response.json(await syncTracking(15))
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e: any) {
    console.error('admin-cj', b.action, e.message)
    return Response.json({ error: e.message }, { status: 502 })
  }
}

export const config: Config = { path: '/api/admin/cj', method: 'POST' }
