# 02. Brainstorm

Each section ends with a **call**: the default we go with unless we learn otherwise.

## 1. Who is the buyer

| Persona | Example | Order size | Buys how often | Pain level |
|---------|---------|-----------|----------------|-----------|
| A. Small F&B / retail owner | Café, cloud kitchen, boutique, salon | ₹10k to ₹2L | Monthly, repeat | High: no purchase person, owner does it all |
| B. Small manufacturer | Garment unit, packaging unit, furniture workshop | ₹1L to ₹25L | Monthly raw material | High, but they already have trusted suppliers |
| C. New D2C brand | Skincare, snacks, apparel startup | ₹50k to ₹10L | Launch + reorders | Very high at launch, does not know the industry |
| D. Office / facility admin | Corporate admin buying housekeeping, stationery | ₹20k to ₹5L | Monthly | Medium: has time and approval rules |

**Call:** Start with **A (small F&B / retail) and C (new D2C brands)**. Both have a high pain, no purchase team, and repeat orders. B already has relationships and is harder to win. D is slow and process-heavy.

## 2. Which category first

What makes a good first category:

- Specs can be written down clearly (size, material, quantity), so quotes are comparable
- Many suppliers, fragmented, so comparing actually saves money
- Repeat purchase, so one buyer comes back every month
- Order value large enough to pay for the calls (₹20k+)

| Category | Clear spec | Fragmented | Repeat | Value | Verdict |
|----------|-----------|-----------|--------|-------|--------|
| Food packaging (cups, boxes, bags, containers) | Yes | Very | Monthly | ₹20k to ₹2L | **Best fit** |
| Fabric for boutiques | Partly (feel, colour matter) | Very | Seasonal | ₹50k+ | Good, needs samples |
| D2C packaging (mono cartons, labels, pouches) | Yes | Very | Per launch | ₹50k to ₹5L | Strong second |
| Housekeeping / cleaning supplies | Yes | Medium | Monthly | ₹10k to ₹50k | Low margin |
| Industrial parts, machinery | Complex | Medium | Rare | High | Too hard for v1 |

**Call:** **Food and D2C packaging, Delhi NCR first.** One vertical with two buyer types. NCR has dense supplier clusters (Okhla, Bawana, Noida, Faridabad, Kundli) so freight and lead times are predictable.

## 3. What the buyer pays for

Options:

| Model | How | Pro | Con |
|-------|-----|-----|-----|
| Per brief fee | ₹499 to ₹1,999 per sourcing job | Simple, cash from day 1 | Buyer hesitates before seeing value |
| Success fee | 2% to 5% of first order value, paid by buyer | Aligned with outcome | Hard to track if deal closes off-platform |
| Subscription | ₹2,999 to ₹9,999 a month for unlimited or N briefs | Predictable, fits repeat buyers | Needs proof first |
| Savings share | 20% to 30% of the money we saved vs their current price | Easiest sell | Needs a baseline price, can be disputed |

**Call:** **First brief free, then a flat per-brief fee, move repeat buyers to subscription.** Do not take money from suppliers in Phase 1. Keep "savings vs your last price" as the headline we show, even if we do not charge on it.

Rough unit economics per brief (to be validated in pilot):

| Cost item | Assumption | Cost |
|-----------|-----------|------|
| Voice minutes | 25 calls x 3 min avg x ₹6 to 10 per min (telephony + STT + LLM + TTS) | ₹450 to ₹750 |
| LLM reasoning, search, enrichment | Brief, ranking, comparison, negotiation | ₹50 to ₹150 |
| GST / data lookups | 25 lookups | ₹25 to ₹100 |
| Human ops review (early days) | 10 min of an ops person | ₹50 to ₹100 |
| **Total** | | **₹575 to ₹1,100** |

At ₹1,499 per brief this works. At ₹499 it does not, unless calls get shorter and cheaper. **Cutting calls per brief (by using our own supplier data) is the main cost lever.**

## 4. Why a supplier picks up and talks to a bot

This is the riskiest assumption in the whole idea.

What helps:
- Suppliers on IndiaMART already pay for leads. A call that says "a buyer needs 5,000 cups a month in Gurugram, can you quote?" is a free lead. Most will talk.
- Be honest from the first sentence: "I am an AI assistant calling for a café in Gurugram." Hiding it will backfire once word spreads.
- Keep it short: 6 to 8 questions, under 3 minutes.
- Offer a WhatsApp fallback: "Can I WhatsApp you the spec so you can send the rate?" Many will prefer that.

What hurts:
- Calling the same supplier for 10 tiny briefs a day. Batch and rate-limit.
- Calling at bad hours (Sunday, lunch, after 7 pm).
- Not following up. If a supplier quotes 5 times and never gets an order, they stop picking up.

**Call:** AI disclosure on every call, max 1 call per supplier per day, WhatsApp as a parallel channel, and we tell suppliers the outcome ("buyer chose someone else, your price was 12% higher"). That feedback is something IndiaMART never gives, and it builds goodwill.

## 5. The moat

AI calling itself is not a moat. Anyone can buy a voice agent. What is hard to copy:

1. **Verified price data.** Real quotes by category, spec, city and month. After 1,000 briefs we know what a 250 ml printed cup actually costs in NCR. Nobody has this.
2. **Supplier behaviour score.** Picks up? Quotes fast? Honours the quote? Delivers on time? Built only from real interactions.
3. **Repeat buyer relationship.** Once we know a café's monthly needs, reorders are one tap.
4. **Fewer calls per brief over time.** Better data means fewer calls, lower cost, faster answers. Incumbents with no call data cannot match the cost curve.

## 6. What can kill it

| Risk | How bad | What we do |
|------|---------|-----------|
| Suppliers refuse to talk to AI | Fatal if true | Test in week 1 with 100 real calls before writing much code |
| IndiaMART blocks scraping / ToS issues | High | Do not depend on it. Use Google Maps, JustDial, TradeIndia, open web, own database. Use IndiaMART only as a normal buyer, manually, in pilot. Explore a partnership later |
| Telecom rules (TRAI) on automated calls | High | Calls are buyer enquiries, not promotion, but confirm with a telecom lawyer. Use a registered telephony provider. Respect DND and business hours |
| Data protection (DPDP Act 2023 and Rules) | Medium | Supplier numbers are business contacts, but get a privacy policy, call recording disclosure, retention limits, opt-out on day one |
| Buyer and supplier bypass us after intro | Medium | Fine in Phase 1, we charge per brief not per deal. Repeat value (reorders, price tracking, new suppliers) keeps them |
| Quotes not honoured | Medium | Get quotes confirmed on WhatsApp in writing. Track honour rate in supplier score |
| Order sizes too small to matter to suppliers | Medium | Pool demand: 10 cafés needing cups become one 50,000-piece order (later) |
| Low willingness to pay | Medium | Lead with saved money and saved time, measured in the pilot |

## 7. Where this can go later

Ordered by when it makes sense:

1. **Reorder and price alerts.** "Your cup supplier raised prices 8%, 3 others quote lower."
2. **Demand pooling.** Group small buyers into one bulk order for a better price.
3. **Supplier agent (Phase 2).** Suppliers connect their price list and stock. Our buyer agent asks their agent, no call needed. Suppliers pay for qualified leads.
4. **Trade credit and payments.** Once we see real orders, offer 30-day credit through an NBFC partner. This is where real money sits in B2B.
5. **Logistics.** Freight booking for the order.

## 8. Competitive picture

| Player | What they do | Gap we fill |
|--------|-------------|-------------|
| IndiaMART, TradeIndia, JustDial | Listing + lead sale to suppliers | No one works for the buyer after the list |
| Udaan, Jumbotail | Inventory-led B2B e-commerce for kiranas | Narrow catalogue, not custom specs |
| OfBusiness, Zetwerk, Moglix | Managed procurement for mid and large businesses | Minimum ticket too high for a café |
| Global AI sourcing agents (various startups) | Agentic RFQs for global sourcing | Not built for Indian phone + WhatsApp + GST reality |

**Call:** Position as "your purchase manager on WhatsApp", not as "AI IndiaMART". The second framing invites a fight with a listed company's legal team on day one.
