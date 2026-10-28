# 01. Understanding the idea

## The problem in one example

Riya runs a 40-seat café in Gurugram. She needs 5,000 printed paper cups a month, plus lids and carry bags.

What happens today on IndiaMART:

1. She posts a requirement or searches. Within an hour she gets 15 to 30 calls and WhatsApps from sellers. Many are traders, not makers. Some are in another state.
2. Every seller quotes differently: one says ₹1.10 per cup "plus GST", another says ₹1.40 "with printing, freight extra", a third quotes per 1,000 pieces with a 50,000 MOQ.
3. She has no easy way to know who is real. Is the GST number active? Do they file returns? Have they ever delivered on time?
4. She spends 2 to 3 weeks on calls, then picks whoever sounded most reliable, often not the cheapest or the best.

The pain is not "finding" sellers. IndiaMART already does that. **The pain is everything after the list:** calling, comparing, vetting, negotiating.

## The idea, restated

A buyer gives one brief. An AI agent does the work a good purchase manager would do:

| Step | What the agent does | What it replaces |
|------|---------------------|------------------|
| 1. Brief | Turns "need paper cups for my café" into a spec: size, GSM, print colours, qty per month, delivery pincode, budget, deadline | Back-and-forth with every seller |
| 2. Scout | Finds 20 to 50 candidate suppliers from IndiaMART, TradeIndia, JustDial, Google Maps, the open web and our own supplier database | Searching and filtering |
| 3. Call | Phones suppliers by voice (Hindi, English, Hinglish, later regional), asks for price, MOQ, lead time, freight, payment terms | 2 to 3 weeks of calls |
| 4. Vet | Checks GST status and filing history, years in business, reviews, past orders on our platform | Gut feel |
| 5. Compare | Converts every quote to one number: landed cost per unit at the buyer's door, GST and freight included | A messy notebook |
| 6. Negotiate | Goes back to the top suppliers with the best competing quote, within limits the buyer sets | Awkward haggling |
| 7. Shortlist | Hands the buyer 2 or 3 suppliers with a clean comparison card and warm intros | 30 sellers calling her |

The buyer only speaks to the final 2 or 3.

## The two-sided plan

1. **Phase 1: Buyer agent (demand side).** Work only for buyers. Charge buyers. Build a database of suppliers and real quotes as a side effect of every brief.
2. **Phase 2: Supplier agent (supply side).** Once enough buyers flow through, sell suppliers access to qualified, ready-to-buy leads. Their agent can answer our buyer agent directly, skipping the phone call.

This order matters. IndiaMART earns from suppliers, so it is built to please suppliers (more leads, more noise). We start by earning from buyers, so we are built to cut noise. That is the real difference, not the AI.

## Why this is worth doing

- **Unsexy, big, messy.** Indian B2B procurement for small businesses runs on phone calls and WhatsApp. India has roughly 6 crore+ MSMEs (Udyam data is the best public source; verify current figure). Most buy from other MSMEs.
- **The incumbent's model is the opening.** IndiaMART is a listing and lead-sale business (roughly ₹1,300 to 1,400 crore revenue, about 2 lakh+ paying suppliers; verify from latest annual report). Its paying customer is the seller. Nobody is paid to work for the small buyer.
- **The tech just got good enough.** Voice AI that can handle a Hinglish phone call with a wholesaler, at a few rupees per minute, did not exist at usable quality two years ago.
- **Every call makes the product better.** Each call creates a fresh data point: who picked up, who quoted what, who delivered. IndiaMART has listings. We would have verified prices and behaviour. That data is the moat.

## What this is NOT

- Not a marketplace in v1. We do not hold inventory, handle payment or ship goods at the start.
- Not a lead-gen tool for sellers in v1. If we sell buyer leads to sellers early, we become IndiaMART.
- Not "AI for everything." One category, one city, done very well, first.
