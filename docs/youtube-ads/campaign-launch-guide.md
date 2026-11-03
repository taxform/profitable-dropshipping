# YouTube Campaign Launch Guide — Skabba Deals

I can't click the buttons in your Google Ads account for you — ad spend needs your billing and your login — but the site side is done and the steps below are the whole remaining job. Budget about an hour, plus a small test budget.

## What is already ready

- The shop sends Google the full funnel: product views, add-to-cart, checkout starts, purchases with order value, and newsletter signups (Analytics property `G-43KLBMYB4T`).
- Final URLs work with tracking parameters, so use one per ad:
  - Grinder ad → `https://skabbadeals.com/products/cordless-spice-grinder`
  - Chopper ad → `https://skabbadeals.com/products/vegetable-chopper`
  - Bundle ad → `https://skabbadeals.com/funnel`
- The product feed at `https://skabbadeals.com/merchant-feed.xml` is submitted for Shopping; YouTube product feeds can reuse it later.

## Steps (in this order)

1. **Create the Google Ads account** at ads.google.com with your Google login, set country, time zone, and currency to USD, and add a payment method. Skip any "guided campaign" — choose Expert Mode.
2. **Link Analytics.** In Google Ads go to Tools → Data manager → Connect a product → Google Analytics, and link property `G-43KLBMYB4T`. This pipes the shop's purchase events into Ads.
3. **Import the purchase as your conversion.** Go to Goals → Conversions → New conversion action → Import → Google Analytics (GA4). Import **purchase** as Primary (bidding) conversion with value, and **add_to_cart** and **begin_checkout** as Secondary (observe-only). Wait for the status to show Recording before launching.
4. **Upload your videos** to YouTube as Unlisted (see `video-ad-scripts.md` for the three scripts).
5. **Create the campaign.** New campaign → objective **Sales** → type **Video** → subtype **Drive conversions**. Settings that matter:
   - Budget: **$10–20/day** to start; one campaign, not three.
   - Bidding: **Maximize Conversions** with no target at first; add a target CPA only after ~30 purchases.
   - Networks: **uncheck** Video partners and Display Network — YouTube only at first.
   - Locations: United States. Language: English.
   - Targeting (kitchen gadgets sell on intent, so stack these): In-market **Kitchen & Dining / Home & Garden**, Affinity **Cooking Enthusiasts / Foodies**, plus a Custom segment of people who searched "vegetable chopper", "milk frother", "kitchen gadgets". Exclude the funnel and order pages' audiences later once remarketing builds.
   - Ad groups: one per video (grinder, chopper, bundle), each pointing at its final URL above.
6. **Launch, then leave it alone for 7 days.** Check only two numbers: cost per purchase versus your margin, and view rate (below ~20% means the first 5 seconds need a stronger hook — reshoot the hook, not the whole ad).
7. **Scale what works.** Raise budget max ~20% every few days on winning ad groups. Once the purchase conversion has steady volume, test a remarketing video campaign aimed at product viewers who didn't buy.

## What not to do

- Don't send ad traffic to the homepage — every ad must land on the exact product or bundle it shows.
- Don't run ads on the checkout or funnel pages themselves; the site keeps those ad-free on purpose.
- Don't judge a video ad before ~$30–50 of spend; YouTube needs that much to find its audience.
