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

  const price = (product.price / 100).toFixed(2)
  const productJsonLd = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: `https://skabbadeals.com${product.image}`,
    sku: product.slug,
    category: product.category,
    brand: { '@type': 'Brand', name: 'Skabba Deals' },
    seller: { '@type': 'Organization', name: 'Skabba Deals', url: 'https://skabbadeals.com/' },
    offers: {
      '@type': 'Offer',
      url: pageUrl,
      priceCurrency: 'USD',
      price,
      itemCondition: 'https://schema.org/NewCondition',
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'Skabba Deals', url: 'https://skabbadeals.com/' },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'US' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 6, maxValue: 12, unitCode: 'DAY' },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 30,
        returnMethod: 'https://schema.org/ReturnByMail',
      },
    },
  })}<\/script>`
  const breadcrumbJsonLd = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://skabbadeals.com/' },
      { '@type': 'ListItem', position: 2, name: product.category, item: 'https://skabbadeals.com/#shop' },
      { '@type': 'ListItem', position: 3, name: product.name },
    ],
  })}<\/script>`
  // Server-rendered fallback so crawlers and no-JS clients see real content.
  const fallback =
    `<div class="wrap" data-product-fallback><h1>${esc(product.name)}</h1>` +
    `<p>${esc(product.tagline)} ${esc(product.description)}</p>` +
    `<p>Price: $${price}. Ships in ${esc(product.shipsIn)}.</p></div>`
  const extra = [
    `<meta property="og:type" content="product">`,
    `<meta property="og:url" content="${pageUrl}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${shareImg}">`,
    `<meta property="og:image:alt" content="${esc(product.name)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:locale" content="en_US">`,
    `<meta name="robots" content="index, follow, max-image-preview:large">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${shareImg}">`,
    `<meta name="twitter:image:alt" content="${esc(product.name)}">`,
    productJsonLd,
    breadcrumbJsonLd,
  ].join('\n  ')
  // Replace generic template tags rather than appending duplicate metadata.
  html = html.replace(/<meta\s+(?:property="og:[^"]*"|name="twitter:[^"]*"|name="robots")[^>]*>\s*/g, '')
  html = html.replace('</head>', `  ${extra}\n</head>`)
  // The template already has GTM's noscript iframe; it is unrelated to product content.
  html = html.replace(/(<main\b[^>]*>)[\s\S]*?(<\/main>)/, `$1${fallback}$2`)

  const headers = new Headers(res.headers)
  headers.delete('content-length')
  headers.delete('etag')
  headers.set('content-type', 'text/html; charset=utf-8')
  return new Response(html, { status: res.status, headers })
}

export const config = {
  path: '/products/:slug',
  onError: 'bypass',
}
