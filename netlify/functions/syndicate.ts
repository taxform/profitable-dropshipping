import type { Config } from '@netlify/functions'
import { authorized } from '../../lib/auth.js'
import { guideBySlug } from '../../lib/guides.js'

// Publishes a guide to third-party blogs with the canonical URL pointing
// home, so syndicating never creates a duplicate-content penalty.
// Requires the admin password (Authorization: Bearer <ADMIN_PASSWORD>).
// Platform keys are read from env: DEVTO_API_KEY, MEDIUM_TOKEN.
async function publishDevTo(guide: { title: string; markdown: string; tags: string[]; slug: string }) {
  const key = Netlify.env.get('DEVTO_API_KEY')
  if (!key) return { skipped: 'Set DEVTO_API_KEY to enable Dev.to publishing.' }
  const res = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'api-key': key },
    body: JSON.stringify({
      article: {
        title: guide.title,
        body_markdown: guide.markdown,
        published: false,
        canonical_url: `https://skabbadeals.com/guides/${guide.slug}`,
        tags: guide.tags.slice(0, 4).join(', '),
        series: 'Skabba Deals Kitchen Guides',
      },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { error: (data as any).error || `Dev.to rejected the post (${res.status}).` }
  return { url: (data as any).url || (data as any).canonical_url || null }
}

async function publishMedium(guide: { title: string; markdown: string; tags: string[]; slug: string }) {
  const token = Netlify.env.get('MEDIUM_TOKEN')
  if (!token) return { skipped: 'Set MEDIUM_TOKEN to enable Medium publishing.' }
  const meRes = await fetch('https://api.medium.com/v1/me', { headers: { Authorization: `Bearer ${token}` } })
  const me = (await meRes.json().catch(() => ({}))) as any
  const authorId = me?.data?.id
  if (!meRes.ok || !authorId) return { error: 'Medium token was rejected. Check MEDIUM_TOKEN.' }
  const res = await fetch(`https://api.medium.com/v1/users/${authorId}/posts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: guide.title,
      contentFormat: 'markdown',
      content: guide.markdown,
      canonicalUrl: `https://skabbadeals.com/guides/${guide.slug}`,
      publishStatus: 'draft',
      tags: guide.tags.slice(0, 5),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { error: (data as any)?.errors?.[0]?.message || `Medium rejected the post (${res.status}).` }
  return { url: data?.data?.url || null }
}

export default async (req: Request) => {
  const url = new URL(req.url)
  const slug = req.method === 'POST' ? (await req.json().catch(() => ({}))).slug : url.searchParams.get('slug')
  const guide = guideBySlug.get(String(slug || ''))
  if (!guide) {
    return Response.json(
      { error: 'Unknown guide slug.', guides: [...guideBySlug.keys()] },
      { status: 404 },
    )
  }

  if (req.method === 'GET') {
    return Response.json({
      slug: guide.slug,
      title: guide.title,
      canonical: `https://skabbadeals.com/guides/${guide.slug}`,
      targets: {
        devto: !!Netlify.env.get('DEVTO_API_KEY'),
        medium: !!Netlify.env.get('MEDIUM_TOKEN'),
      },
      hint: 'POST with Authorization: Bearer <ADMIN_PASSWORD> and {"slug","targets":["devto","medium"]} to publish as draft.',
    })
  }

  if (req.method !== 'POST') return Response.json({ error: 'Use GET to preview or POST to publish.' }, { status: 405 })
  const denied = authorized(req)
  if (denied) return denied

  const body = await req.json().catch(() => ({}))
  const targets: string[] = Array.isArray(body.targets) && body.targets.length ? body.targets : ['devto', 'medium']
  const out: Record<string, unknown> = {}
  if (targets.includes('devto')) out.devto = await publishDevTo(guide)
  if (targets.includes('medium')) out.medium = await publishMedium(guide)
  return Response.json({ slug: guide.slug, canonical: `https://skabbadeals.com/guides/${guide.slug}`, results: out })
}

export const config: Config = { path: '/api/syndicate', method: ['GET', 'POST'] }
