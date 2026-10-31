// Shared storefront: layout chrome, product data, cart drawer and checkout.
export const money = (c) => '$' + (c / 100).toFixed(2).replace(/\.00$/, '')
export const img = (src, w) => `/.netlify/images?url=${encodeURIComponent(src)}&w=${w}&fm=webp&q=78`
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

let catalogPromise
export const getCatalog = () => (catalogPromise ??= fetch('/api/products').then((r) => r.json()))

// ---------- Cart state ----------
const KEY = 'sd-cart-v1'
const state = {
  items: JSON.parse(localStorage.getItem(KEY) || '[]'),
  code: localStorage.getItem('sd-code') || '',
  quote: null,
}
const save = () => {
  localStorage.setItem(KEY, JSON.stringify(state.items))
  localStorage.setItem('sd-code', state.code)
}

export function addToCart(slug, qty = 1, { open = true } = {}) {
  const line = state.items.find((i) => i.slug === slug)
  if (line) line.qty = Math.min(20, line.qty + qty)
  else state.items.push({ slug, qty })
  save()
  refresh()
  if (open) openCart()
  else toast('Added to cart')
}
function setQty(slug, qty) {
  state.items = state.items.map((i) => (i.slug === slug ? { ...i, qty } : i)).filter((i) => i.qty > 0)
  save()
  refresh()
}
export function clearCart() {
  state.items = []
  save()
  refresh()
}
export function applyCode(code) {
  state.code = code.trim().toUpperCase()
  save()
  return refresh()
}

let seq = 0
async function refresh() {
  const n = ++seq
  updateCount()
  const q = await fetch('/api/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: state.items, code: state.code }) }).then((r) => r.json())
  if (n !== seq) return
  state.quote = q
  renderDrawer()
  return q
}
function updateCount() {
  const n = state.items.reduce((s, i) => s + i.qty, 0)
  document.querySelectorAll('[data-cart-count]').forEach((el) => (el.textContent = n))
}

// ---------- Layout chrome ----------
const ANNOUNCE = ['Free tracked shipping on orders over $49', 'Buy 2, save 10% · Buy 3+, save 20%', '30-day no-fuss returns', 'Secure checkout with Stripe']

function chrome() {
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<div class="announce" aria-label="Store offers"><div class="announce__track">${[...ANNOUNCE, ...ANNOUNCE].map((t) => `<span>${t}</span>`).join('')}</div></div>
    <header class="header"><div class="wrap">
      <a class="logo" href="/">Skabba <em>Deals</em></a>
      <nav class="nav" aria-label="Main"><a href="/#shop">Shop all</a><a href="/#bundle">Bundle &amp; save</a><a href="/#faq">FAQ</a><a href="/shipping">Shipping</a></nav>
      <button class="cart-btn" data-open-cart aria-label="Open cart">Cart <span class="cart-count" data-cart-count>0</span></button>
    </div></header>`,
  )
  document.body.insertAdjacentHTML(
    'beforeend',
    `<footer class="footer"><div class="wrap">
      <div><a class="logo" href="/">Skabba <em>Deals</em></a><p class="muted" style="max-width:26em">Small kitchen tools that earn their counter space. Picked, tested and shipped tracked to your door.</p></div>
      <div><h4>Shop</h4><ul><li><a href="/#shop">All gadgets</a></li><li><a href="/#bundle">Bundle &amp; save</a></li><li><a href="/order">Track an order</a></li></ul></div>
      <div><h4>Help</h4><ul><li><a href="/shipping">Shipping</a></li><li><a href="/returns">Returns &amp; refunds</a></li><li><a href="/contact">Contact</a></li><li><a href="/privacy">Privacy</a></li><li><a href="/terms">Terms</a></li></ul></div>
      <div class="fine"><span>© ${new Date().getFullYear()} Skabba Deals · skabbadeals.com</span><span>Prices in USD · Payments secured by Stripe</span></div>
    </div></footer>
    <div class="scrim" data-close-cart></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="Your cart" aria-hidden="true">
      <div class="drawer__head"><h2>Your cart</h2><button class="icon-btn" data-close-cart aria-label="Close cart"><svg width="18" height="18" viewBox="0 0 18 18"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" stroke-width="1.6"/></svg></button></div>
      <div data-drawer-body style="display:contents"></div>
    </aside>
    <div class="toast" role="status" aria-live="polite"></div>`,
  )
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open-cart],[data-close-cart],[data-add],[data-inc],[data-dec],[data-rm]')
    if (!t) return
    if (t.matches('[data-open-cart]')) openCart()
    else if (t.matches('[data-close-cart]')) closeCart()
    else if (t.matches('[data-add]')) addToCart(t.dataset.add, 1, { open: t.dataset.open !== 'false' })
    else {
      const slug = t.dataset.inc || t.dataset.dec || t.dataset.rm
      const cur = state.items.find((i) => i.slug === slug)?.qty ?? 0
      setQty(slug, t.matches('[data-inc]') ? Math.min(20, cur + 1) : t.matches('[data-dec]') ? cur - 1 : 0)
    }
  })
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeCart())
}

export function openCart() {
  document.body.classList.add('cart-open')
  document.querySelector('.drawer').setAttribute('aria-hidden', 'false')
}
function closeCart() {
  document.body.classList.remove('cart-open')
  document.querySelector('.drawer')?.setAttribute('aria-hidden', 'true')
}
export function toast(msg) {
  const el = document.querySelector('.toast')
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(el._t)
  el._t = setTimeout(() => el.classList.remove('show'), 2400)
}

// ---------- Drawer rendering ----------
async function renderDrawer() {
  const body = document.querySelector('[data-drawer-body]')
  const q = state.quote
  if (!body || !q) return
  const { products, offers } = await getCatalog()

  if (q.lines.length === 0) {
    body.innerHTML = `<div class="drawer__lines"><div class="empty"><h3>Nothing here yet</h3><p>Add two gadgets and the bundle discount kicks in automatically.</p><a class="btn" href="/#shop" data-close-cart>Browse the shop</a></div></div>`
    return
  }

  const shipPct = Math.min(100, (q.subtotal / offers.freeShippingThreshold) * 100)
  const progress = [
    q.freeShippingRemaining > 0 ? `You're <b>${money(q.freeShippingRemaining)}</b> away from free shipping.` : `<b>Free tracked shipping</b> unlocked.`,
    q.nextTier ? `Add <b>${q.nextTier.itemsNeeded} more</b> to save ${q.nextTier.pct}% on everything.` : '',
  ].filter(Boolean)

  const inCart = new Set(q.lines.map((l) => l.slug))
  const suggestions = products.filter((p) => !inCart.has(p.slug)).sort((a, b) => a.price - b.price).slice(0, 4)

  body.innerHTML = `
    <div class="drawer__progress"><div>${progress.join('<br>')}</div><div class="bar"><i style="width:${shipPct}%"></i></div></div>
    <div class="drawer__lines">${q.lines
      .map(
        (l) => `<div class="line">
          <img src="${img(l.image, 160)}" alt="" width="72" height="72">
          <div><h4>${esc(l.name)}</h4><div class="unit">${money(l.unit)}${l.unit < l.listUnit ? `<s>${money(l.listUnit)}</s>` : ''}</div>
            <div class="qty"><button data-dec="${l.slug}" aria-label="Decrease">−</button><span>${l.qty}</span><button data-inc="${l.slug}" aria-label="Increase">+</button></div><button class="rm" data-rm="${l.slug}">Remove</button></div>
          <b>${money(l.lineTotal)}</b></div>`,
      )
      .join('')}</div>
    ${suggestions.length ? `<div class="upsell"><h5>Pairs well with</h5><div class="upsell__row">${suggestions
      .map((p) => `<div class="upsell__item"><img src="${img(p.image, 120)}" alt=""><div>${esc(p.name)}<br><b>${money(p.price)}</b><br><button data-add="${p.slug}" data-open="false">+ Add</button></div></div>`)
      .join('')}</div></div>` : ''}
    <form class="drawer__foot" novalidate data-checkout>
      <div class="code-row"><input class="field" name="code" placeholder="Discount code" value="${esc(state.code)}" aria-label="Discount code"><button class="btn btn--ghost" type="button" data-apply-code>Apply</button></div>
      ${q.codeValid === false ? `<div class="err">That code isn't valid.</div>` : ''}
      <div class="row"><span>Subtotal</span><span>${money(q.listSubtotal)}</span></div>
      ${q.discount ? `<div class="row save"><span>${esc(q.appliedOffer)} (−${q.discountPct}%)</span><span>−${money(q.discount)}</span></div>` : ''}
      <div class="row"><span>Shipping</span><span>${q.shipping ? money(q.shipping) : 'Free'}</span></div>
      <div class="row total"><span>Total</span><span>${money(q.total)}</span></div>
      <input class="field" type="email" name="email" placeholder="Email for order updates" autocomplete="email" required value="${esc(localStorage.getItem('sd-email') || '')}">
      <div class="err" data-checkout-err></div>
      <button class="btn btn--block" type="submit">Checkout · ${money(q.total)}</button>
      <div class="secure"><svg width="12" height="14" viewBox="0 0 12 14"><rect x="1" y="6" width="10" height="7" rx="1.5" fill="none" stroke="currentColor"/><path d="M3.5 6V4a2.5 2.5 0 015 0v2" fill="none" stroke="currentColor"/></svg>Secure checkout · 30-day returns</div>
    </form>`

  body.querySelector('[data-apply-code]').onclick = () => applyCode(body.querySelector('[name=code]').value)
  body.querySelector('[data-checkout]').onsubmit = checkout
}

async function checkout(e) {
  e.preventDefault()
  const form = e.currentTarget
  const email = form.email.value.trim()
  const err = form.querySelector('[data-checkout-err]')
  const btn = form.querySelector('button[type=submit]')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    form.email.classList.add('invalid')
    err.textContent = 'Enter your email so we can send tracking.'
    form.email.focus()
    return
  }
  localStorage.setItem('sd-email', email)
  btn.disabled = true
  btn.textContent = 'Opening secure checkout…'
  try {
    const res = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, items: state.items, code: state.code }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Checkout failed')
    // Keep the cart until payment succeeds so a cancelled Stripe checkout can be resumed.
    if (!data.paymentsEnabled) clearCart()
    location.href = data.redirect
  } catch (ex) {
    err.textContent = ex.message
    btn.disabled = false
    btn.textContent = 'Try again'
  }
}

// ---------- Newsletter ----------
function wireSignup() {
  document.querySelectorAll('[data-signup]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const msg = form.parentElement.querySelector('.msg')
      const res = await fetch('/api/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: form.email.value, source: form.dataset.signup }) })
      const data = await res.json()
      if (!res.ok) return (msg.textContent = data.error)
      msg.innerHTML = `You're in. Use <span class="code">${data.code}</span> for 10% off — we've added it to your cart.`
      applyCode(data.code)
      form.reset()
    })
  })
}

chrome()
wireSignup()
refresh()
