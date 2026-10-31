// Minimal CJdropshipping API v2 client. Docs: https://developers.cjdropshipping.com
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { settings } from '../db/schema.js'

const BASE = 'https://developers.cjdropshipping.com/api2.0/v1'
const TOKEN_KEY = 'cj_tokens'

export const cjEnabled = () => !!process.env.CJ_API_KEY

type Tokens = { accessToken: string; accessTokenExpiryDate: string; refreshToken: string; refreshTokenExpiryDate: string }
let memo: Tokens | null = null

// CJ allows 1 request per second per account.
let lastCall = 0
async function throttle() {
  const wait = lastCall + 1100 - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastCall = Date.now()
}

async function raw(path: string, init: RequestInit & { token?: string } = {}) {
  await throttle()
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.token ? { 'CJ-Access-Token': init.token } : {}) },
  })
  const body = await res.json().catch(() => null)
  if (!body || body.result === false || (body.code !== undefined && body.code !== 200)) {
    const err = new Error(`CJ: ${body?.message ?? `HTTP ${res.status}`}`) as Error & { code?: number }
    err.code = body?.code
    throw err
  }
  return body.data
}

const valid = (date: string | undefined, marginMs: number) => !!date && new Date(date).getTime() - marginMs > Date.now()

async function saveTokens(t: Tokens) {
  memo = t
  await db
    .insert(settings)
    .values({ key: TOKEN_KEY, value: t })
    .onConflictDoUpdate({ target: settings.key, set: { value: t, updatedAt: new Date() } })
}

async function token(force = false): Promise<string> {
  const apiKey = process.env.CJ_API_KEY
  if (!apiKey) throw new Error('CJ is not connected. Add your CJ API key as the CJ_API_KEY environment variable.')
  if (!memo) {
    const [row] = await db.select().from(settings).where(eq(settings.key, TOKEN_KEY)).limit(1)
    memo = (row?.value as Tokens) ?? null
  }
  const day = 86_400_000
  if (!force && memo && valid(memo.accessTokenExpiryDate, day)) return memo.accessToken
  if (memo && valid(memo.refreshTokenExpiryDate, 60_000)) {
    try {
      await saveTokens({ ...memo, ...(await raw('/authentication/refreshAccessToken', { method: 'POST', body: JSON.stringify({ refreshToken: memo.refreshToken }) })) })
      return memo!.accessToken
    } catch {}
  }
  await saveTokens(await raw('/authentication/getAccessToken', { method: 'POST', body: JSON.stringify({ apiKey }) }))
  return memo!.accessToken
}

async function api(path: string, init: RequestInit = {}) {
  try {
    return await raw(path, { ...init, token: await token() })
  } catch (e: any) {
    // 1600001 = token rejected (e.g. API key regenerated); fetch a fresh one once.
    if (e.code !== 1600001) throw e
    return raw(path, { ...init, token: await token(true) })
  }
}

const cents = (v: unknown) => Math.round(parseFloat(String(v ?? '').split(/[^0-9.]+/).find(Boolean) ?? 'NaN') * 100)

export type CjSearchResult = { pid: string; name: string; sku: string; image: string; price: number; listed: number; inventory: number }

export async function searchProducts(keyWord: string): Promise<CjSearchResult[]> {
  const q = new URLSearchParams({ keyWord, page: '1', size: '12' })
  const data = await api(`/product/listV2?${q}`)
  const list = (data?.content ?? []).flatMap((c: any) => c.productList ?? [])
  return list.map((p: any) => ({
    pid: String(p.id),
    name: p.nameEn,
    sku: p.sku,
    image: p.bigImage,
    price: cents(p.nowPrice || p.discountPrice || p.sellPrice),
    listed: Number(p.listedNum) || 0,
    inventory: Number(p.warehouseInventoryNum) || 0,
  }))
}

export type CjVariant = { vid: string; name: string; sku: string; price: number; image: string | null }
export type CjProduct = { pid: string; name: string; image: string; variants: CjVariant[] }

export async function getProduct(pid: string): Promise<CjProduct> {
  const p = await api(`/product/query?pid=${encodeURIComponent(pid)}`)
  const images = Array.isArray(p.productImageSet) ? p.productImageSet : String(p.productImageSet ?? '').split(',').filter(Boolean)
  return {
    pid: String(p.pid),
    name: p.productNameEn,
    image: p.bigImage || images[0],
    variants: (p.variants ?? [])
      .map((v: any) => ({ vid: String(v.vid), name: v.variantNameEn || v.variantKey || v.variantSku, sku: v.variantSku, price: cents(v.variantSellPrice), image: v.variantImage || null }))
      .filter((v: CjVariant) => Number.isFinite(v.price)),
  }
}

export type CjShipping = { logisticName: string; price: number; days: string }

// Cheapest tracked method that arrives within ~15 days, else the cheapest overall.
export async function bestShipping(products: { vid: string; quantity: number }[], endCountryCode = 'US'): Promise<CjShipping> {
  const data = await api('/logistic/freightCalculate', { method: 'POST', body: JSON.stringify({ startCountryCode: 'CN', endCountryCode, products }) })
  const options: CjShipping[] = (data ?? [])
    .map((o: any) => ({ logisticName: o.logisticName, price: cents(o.totalPostageFee ?? o.logisticPrice), days: String(o.logisticAging ?? '') }))
    .filter((o: CjShipping) => Number.isFinite(o.price))
    .sort((a: CjShipping, b: CjShipping) => a.price - b.price)
  if (!options.length) throw new Error(`CJ has no shipping method to ${endCountryCode} for this item.`)
  const maxDays = (o: CjShipping) => Number(o.days.split('-').pop()) || 99
  return options.find((o) => maxDays(o) <= 15) ?? options[0]
}

export async function createOrder(body: Record<string, unknown>) {
  return api('/shopping/order/createOrderV2', { method: 'POST', body: JSON.stringify(body) })
}

export async function getOrder(orderId: string) {
  return api(`/shopping/order/getOrderDetail?orderId=${encodeURIComponent(orderId)}`)
}
