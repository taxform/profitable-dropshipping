// White-hat content hub: buying guides that target real search queries and link
// to the products they mention. Static HTML in public/guides/ is the SEO
// source of truth; this manifest powers the sitemap, RSS and syndication.
export type Guide = {
  slug: string
  title: string
  description: string
  published: string
  updated: string
  tags: string[]
  products: string[]
  markdown: string
}

export const GUIDES: Guide[] = [
  {
    slug: 'small-kitchen-organization-ideas',
    title: '7 Small-Kitchen Organization Ideas That Actually Stick',
    description:
      'Renter-friendly ways to free counter and drawer space: magnetic knife storage, roll-up racks, motion lighting and reusable lids.',
    published: '2026-11-03',
    updated: '2026-11-03',
    tags: ['organization', 'small kitchen', 'storage'],
    products: ['acacia-magnetic-knife-strip', 'roll-up-drying-rack', 'motion-cabinet-light', 'silicone-stretch-lids'],
    markdown: `# 7 Small-Kitchen Organization Ideas That Actually Stick

Small kitchens punish clutter. These seven ideas work in rentals, need no remodelling, and each one removes a daily annoyance.

## 1. Get knives off the counter and out of the drawer

A magnetic wall strip holds 6–8 knives on timber instead of steel, so edges stay sharper and a whole drawer comes back. Mount with screws or a no-drill adhesive kit.

> Related: [Acacia Magnetic Knife Strip](/products/acacia-magnetic-knife-strip) — 16-inch solid acacia, hidden rare-earth magnets.

## 2. Make the sink do double duty

A roll-up rack turns the sink into a drying rack, a trivet for hot pans (up to 200°C), and a rinse station for produce — then rolls into a drawer.

> Related: [Roll-Up Sink Rack](/products/roll-up-drying-rack)

## 3. Light the corners you actually chop in

A motion-sensing LED bar under the cabinet switches on when you reach the counter and off 20 seconds later. Three brightness levels, USB-C charging about once a month.

> Related: [Motion Under-Cabinet Light](/products/motion-cabinet-light)

## 4. Retire the cling film drawer

Fourteen food-grade silicone lids in six sizes seal bowls, jars, cans and half-cut fruit. Freezer, microwave and dishwasher safe — one set replaces years of disposable wrap.

> Related: [Stretch Lids, Set of 14](/products/silicone-stretch-lids)

## 5. Decant, don't stack

Keep oils, salts and daily spices in the same spot you cook. You will reach for them instead of digging through cupboards.

## 6. One in, one out for gadgets

If a tool lives in a drawer, it has to earn the space. Our rule: anything unused for 60 days gets donated.

## 7. Bundle the boring wins

Fix storage, light and drying in one order and the bundle discount covers it: any 2 items save 10%, any 3+ save 20% automatically, and most three-item carts clear the $49 free-shipping line.

*Originally published on [Skabba Deals](https://skabbadeals.com/guides/small-kitchen-organization-ideas).*
`,
  },
  {
    slug: 'fresh-pepper-spice-grinder-guide',
    title: 'Why Fresh-Ground Pepper Tastes Better (and How to Get It Right)',
    description:
      'Ceramic vs steel burrs, six grind settings explained, and how to season steak, salads and soups with a rechargeable grinder.',
    published: '2026-11-03',
    updated: '2026-11-03',
    tags: ['seasoning', 'spices', 'cooking tips'],
    products: ['cordless-spice-grinder', 'instant-read-thermometer'],
    markdown: `# Why Fresh-Ground Pepper Tastes Better (and How to Get It Right)

Pre-ground pepper loses its volatile oils within weeks. Grinding fresh cracks those oils open right before they hit the food — which is why the same steak tastes flat with one and alive with the other.

## Ceramic burrs vs steel blades

Blades chop unevenly and heat the spice. Ceramic burrs crush uniformly, never rust, and handle salt as well as pepper. Look for a dial with at least 5–6 settings.

> Related: [One-Press Spice Grinder](/products/cordless-spice-grinder) — ceramic burrs, 6 coarseness settings, USB-C with ~200 uses per charge.

## Which grind for which dish

- **Fine:** eggs, soups, salad dressings
- **Medium:** roast chicken, pasta, everyday seasoning
- **Coarse:** steak crusts, grilled vegetables, finishing

## Three seasoning upgrades

1. **Salt early, pepper late.** Salt penetrates; pepper's aroma fades with long heat. Add coarse pepper in the last minutes.
2. **Toast whole peppercorns** 60 seconds in a dry pan before grinding for deeper flavour.
3. **Pair with temperature.** A [2-second thermometer](/products/instant-read-thermometer) tells you when the steak is actually medium-rare, so seasoning is not guesswork on top of guesswork.

One rechargeable grinder replaces disposable mills for years — no batteries, no refills to throw away.

*Originally published on [Skabba Deals](https://skabbadeals.com/guides/fresh-pepper-spice-grinder-guide).*
`,
  },
  {
    slug: 'air-fryer-oil-sprayer-guide',
    title: 'How to Use Less Oil in an Air Fryer (Without Dry Food)',
    description:
      'Why a glass oil mister beats pouring and aerosol sprays: even coverage, air-fryer crisping, and how much oil you really need.',
    published: '2026-11-03',
    updated: '2026-11-03',
    tags: ['air fryer', 'healthy cooking', 'oil'],
    products: ['glass-oil-mister', 'vegetable-chopper'],
    markdown: `# How to Use Less Oil in an Air Fryer (Without Dry Food)

Air fryers crisp by circulating hot air — oil is for browning and seasoning, not for filling the basket. A thin, even mist does what a poured glug cannot.

## Why pouring fails

A teaspoon poured over chopped veg pools in one spot. The rest steams instead of crisping. Aerosol sprays coat evenly but add propellants and cost more per ml.

## The mister method

1. **Chop evenly first.** Uniform pieces cook at the same rate — a [12-in-1 chopper](/products/vegetable-chopper) dices straight into a 1.2 L tray.
2. **Mist, toss, mist.** 3–4 pumps per side (about a fifth of the oil you would pour).
3. **Season after the first mist** so salt sticks to the oil, not the basket.

> Related: [Glass Oil Mister](/products/glass-oil-mister) — 200 ml borosilicate bottle, fan-shaped mist, leak-proof refill.

## Cleaning and safety

Glass and steel rinse clean — no aerosol residue on the basket. Refill with any neutral oil; save extra-virgin olive oil for finishing, since its smoke point is lower than the 200°C crispiest batches reach.

Most cooks cut oil use by half in the first week and get crunchier results, not drier ones.

*Originally published on [Skabba Deals](https://skabbadeals.com/guides/air-fryer-oil-sprayer-guide).*
`,
  },
]

export const guideBySlug = new Map(GUIDES.map((g) => [g.slug, g]))
