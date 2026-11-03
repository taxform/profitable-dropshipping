import { PRODUCTS } from '../../lib/catalog.ts'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export default async (req: Request, context: any) => {
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const match = url.pathname.match(/^\/products\/([^/]+)\/?$/)
  if (!match) return
  const slug = decodeURIComponent(match[1])
  const product = (PRODUCTS as any[]).find((p) => p.slug === slug)
  if (!product) return

  const res = await context.next()
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) return res
  let html = await res.text()

  const pageUrl = `https://skabbadeals.com/products/${product.slug}`
  const desc = `${product.tagline} ${product.description}`.slice(0, 158)
  const shareImg = `https://skabbadeals.com/.netlify/images?url=${encodeURIComponent(product.image)}&w=1200&h=630&fit=cover`
  const title = `${product.name} — Skabba Deals`

  html = html.replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${esc(desc)}">`,
  )
  html = html.replace(
    /<link rel="canonical" href="[^"]*">/,
    `<link rel="canonical" href="${pageUrl}">`,
  )

  const extra = [
    `<meta property="og:type" content="product">`,
    `<meta property="og:url" content="${pageUrl}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${shareImg}">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${shareImg}">`,
  ].join('\n  ')
  if (!html.includes('property="og:url"')) {
    html = html.replace('</head>', `  ${extra}\n</head>`)
  }

  const headers = new Headers(res.headers)
  headers.set('content-type', 'text/html; charset=utf-8')
  return new Response(html, { status: res.status, headers })
}

export const config = {
  path: '/products/:slug',
  onError: 'bypass',
}
