// Product catalog. `cost` is the landed supplier cost (unit + supplier shipping) and never leaves the server.
export type Product = {
  slug: string
  name: string
  tagline: string
  description: string
  bullets: string[]
  category: 'Prep' | 'Cook' | 'Brew' | 'Organize'
  price: number // cents
  compareAt: number // cents, typical high-street price for comparable items
  cost: number // cents, landed supplier cost
  image: string
  supplier: { name: string; sku: string; url: string; vid?: string | null }
  shipsIn: string
  cjQuery: string // search used to find the matching CJdropshipping listing
  inventory?: number
  inventoryCheckedAt?: string
  linked?: boolean // true once a real CJ variant supplies this product
}

const SUPPLIER = 'CJdropshipping'

export const PRODUCTS: Product[] = [
  {
    slug: 'cordless-spice-grinder',
    name: 'One-Press Spice Grinder',
    tagline: 'Fresh pepper with one thumb.',
    description:
      'A USB-C rechargeable grinder with ceramic burrs and a dial for six coarseness settings. One charge covers roughly 200 seasoning sessions, and the base cap catches stray grounds so the counter stays tidy.',
    bullets: ['Ceramic burrs that never rust', '6 coarseness settings', 'USB-C, ~200 uses per charge', 'Works with pepper, salt and dried spices'],
    category: 'Cook',
    price: 3400,
    compareAt: 4999,
    cost: 940,
    image: '/images/spice-grinder.png',
    supplier: { name: SUPPLIER, sku: 'SD-GRND-01', url: '' },
    shipsIn: '6–10 business days',
    cjQuery: 'electric pepper grinder rechargeable',
  },
  {
    slug: 'handheld-milk-frother',
    name: 'Pocket Milk Frother',
    tagline: 'Café foam in 15 seconds.',
    description:
      'A stainless whisk wand with two speeds: one for latte micro-foam, one for whipping matcha and protein shakes. It recharges over USB-C and stands upright in its own magnetic dock.',
    bullets: ['2 speeds, 15-second foam', 'Food-grade 304 stainless whisk', 'USB-C rechargeable', 'Magnetic countertop dock'],
    category: 'Brew',
    price: 1900,
    compareAt: 2999,
    cost: 380,
    image: '/images/milk-frother.png',
    supplier: { name: SUPPLIER, sku: 'SD-FRTH-02', url: '' },
    shipsIn: '6–10 business days',
    cjQuery: 'rechargeable milk frother handheld',
  },
  {
    slug: 'acacia-magnetic-knife-strip',
    name: 'Acacia Magnetic Knife Strip',
    tagline: 'Free a drawer. Keep the edge.',
    description:
      'A 16-inch solid acacia bar with rare-earth magnets set under the wood, so blades touch timber instead of metal. It holds 6–8 knives and mounts with the included screws or a no-drill adhesive option.',
    bullets: ['Solid acacia, 16 in / 40 cm', 'Hidden rare-earth magnets', 'Holds 6–8 knives', 'Screw or no-drill mounting'],
    category: 'Organize',
    price: 3200,
    compareAt: 4500,
    cost: 720,
    image: '/images/knife-strip.png',
    supplier: { name: SUPPLIER, sku: 'SD-KNFS-03', url: '' },
    shipsIn: '7–12 business days',
    cjQuery: 'magnetic knife holder wood',
  },
  {
    slug: 'instant-read-thermometer',
    name: '2-Second Meat Thermometer',
    tagline: 'Stop guessing at the grill.',
    description:
      'A folding probe that reads within ±0.5°C in about two seconds. The backlit display auto-rotates for left-handed use, and the magnetic back sticks to the fridge or grill hood.',
    bullets: ['Reading in ~2 seconds', '±0.5°C accuracy', 'Backlit, auto-rotating display', 'IP67 waterproof, magnetic back'],
    category: 'Cook',
    price: 2400,
    compareAt: 3999,
    cost: 560,
    image: '/images/meat-thermometer.png',
    supplier: { name: SUPPLIER, sku: 'SD-THRM-04', url: '' },
    shipsIn: '6–10 business days',
    cjQuery: 'instant read meat thermometer',
  },
  {
    slug: 'roll-up-drying-rack',
    name: 'Roll-Up Sink Rack',
    tagline: 'A counter that appears over your sink.',
    description:
      'Silicone-wrapped steel rods roll out across the sink to dry dishes, rest hot pans (up to 200°C) or rinse produce, then roll up into a drawer-sized cylinder.',
    bullets: ['Fits sinks up to 20.5 in / 52 cm', 'Heat-safe to 200°C', 'Rolls up to drawer size', 'Dishwasher safe'],
    category: 'Organize',
    price: 2700,
    compareAt: 3499,
    cost: 610,
    image: '/images/drying-rack.png',
    supplier: { name: SUPPLIER, sku: 'SD-RACK-05', url: '' },
    shipsIn: '7–12 business days',
    cjQuery: 'roll up dish drying rack',
  },
  {
    slug: 'vegetable-chopper',
    name: '12-in-1 Veggie Chopper',
    tagline: 'A whole onion diced in one press.',
    description:
      'Push down once and the stainless grid dices straight into a 1.2 L catch tray. Eight blade inserts cover dice, julienne, slice, spiral and grate, and a cleaning fork clears the grid in seconds.',
    bullets: ['8 stainless blade inserts', '1.2 L lidded catch tray', 'Non-slip base', 'Cleaning fork included'],
    category: 'Prep',
    price: 3600,
    compareAt: 4999,
    cost: 890,
    image: '/images/veggie-chopper.png',
    supplier: { name: SUPPLIER, sku: 'SD-CHOP-06', url: '' },
    shipsIn: '6–10 business days',
    cjQuery: 'vegetable chopper multifunction',
  },
  {
    slug: 'motion-cabinet-light',
    name: 'Motion Under-Cabinet Light',
    tagline: 'Light the counter without wiring.',
    description:
      'A 30 cm warm-white LED bar that turns on when you reach the counter and off 20 seconds later. It sticks on with the magnetic mount plate and charges over USB-C about once a month.',
    bullets: ['Motion sensor, auto-off', '3000K warm white, 3 brightness levels', 'Magnetic peel-and-stick mount', 'USB-C, ~30 days per charge'],
    category: 'Organize',
    price: 2900,
    compareAt: 3999,
    cost: 630,
    image: '/images/cabinet-light.png',
    supplier: { name: SUPPLIER, sku: 'SD-LITE-07', url: '' },
    shipsIn: '7–12 business days',
    cjQuery: 'motion sensor under cabinet light rechargeable',
  },
  {
    slug: 'silicone-stretch-lids',
    name: 'Stretch Lids, Set of 14',
    tagline: 'Retire the cling film.',
    description:
      'Fourteen food-grade silicone lids in six sizes stretch over bowls, jars, cans and half-cut fruit to form an airtight seal. Freezer, microwave and dishwasher safe.',
    bullets: ['14 lids, 6 sizes (2.5–8 in)', 'Food-grade, BPA-free silicone', 'Freezer, microwave & dishwasher safe', 'Fits round, square and odd shapes'],
    category: 'Prep',
    price: 1800,
    compareAt: 2499,
    cost: 320,
    image: '/images/stretch-lids.png',
    supplier: { name: SUPPLIER, sku: 'SD-LIDS-08', url: '' },
    shipsIn: '6–10 business days',
    cjQuery: 'silicone stretch lids',
  },
  {
    slug: 'glass-oil-mister',
    name: 'Glass Oil Mister',
    tagline: 'A teaspoon of oil, sprayed evenly.',
    description:
      'A 200 ml borosilicate bottle with a pump-action steel nozzle that sprays an even mist for air fryers, salads and pans. Uses about a fifth of the oil you would pour.',
    bullets: ['200 ml borosilicate glass', 'Even fan-shaped mist', 'Great for air fryers', 'Leak-proof, easy refill'],
    category: 'Cook',
    price: 1700,
    compareAt: 2299,
    cost: 350,
    image: '/images/oil-sprayer.png',
    supplier: { name: SUPPLIER, sku: 'SD-MIST-09', url: '' },
    shipsIn: '6–10 business days',
    cjQuery: 'oil sprayer glass bottle kitchen',
  },
]

export const bySlug = new Map(PRODUCTS.map((p) => [p.slug, p]))

export function publicProduct(p: Product) {
  const { cost, supplier, cjQuery, linked, ...rest } = p
  return { ...rest, compareAt: rest.compareAt > rest.price ? rest.compareAt : null }
}
