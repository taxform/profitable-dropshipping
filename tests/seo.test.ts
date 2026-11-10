import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import render from '../netlify/edge-functions/product-meta.ts'
import { PRODUCTS } from '../lib/catalog.ts'

const template = readFileSync('public/product.html', 'utf8')

test('every product has unique server metadata and visible content despite GTM noscript', async () => {
  for (const product of PRODUCTS) {
    const response = await render(new Request(`https://skabbadeals.com/products/${product.slug}`), {
      next: async () => new Response(template, { headers: { 'content-type': 'text/html', 'content-length': '1', etag: 'template' } }),
    })
    const html = await response!.text()
    const head = html.split('</head>')[0]
    assert.equal((head.match(/rel="canonical"/g) || []).length, 1)
    assert.ok(head.includes(`href="https://skabbadeals.com/products/${product.slug}"`))
    assert.equal((head.match(/property="og:title"/g) || []).length, 1)
    assert.ok(head.includes(`content="${product.name} — Skabba Deals"`))
    assert.ok(head.includes('property="og:type" content="product"'))
    assert.ok(html.includes(`<h1>${product.name}</h1>`))
    assert.ok(html.includes('data-product-fallback'))
    assert.equal(response!.headers.get('content-length'), null)
    for (const match of head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(match[1])
  }
})

test('homepage links to every catalog product before JavaScript runs', () => {
  const html = readFileSync('public/index.html', 'utf8').split('<script type="module">')[0]
  for (const product of PRODUCTS) assert.ok(html.includes(`href="/products/${product.slug}"`))
})
