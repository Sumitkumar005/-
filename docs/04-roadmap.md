# 04. Roadmap: first 12 weeks

Rule: **prove suppliers will talk and buyers will pay before building the full system.** Code follows evidence.

## Week 0 to 2: Prove the riskiest assumption (almost no code)

| Task | Output | Pass mark |
|------|--------|-----------|
| Pick 10 real buyers (cafés, cloud kitchens, 2 to 3 D2C brands in NCR) | 10 real briefs | 10 briefs collected |
| Build supplier list for paper cups, food boxes, pouches by hand (Google Maps, JustDial, IndiaMART as a normal buyer) | 150 suppliers in a sheet | 150 rows with phone + GSTIN |
| Run 100 calls with an off-the-shelf voice agent (Bolna / similar) using a fixed script with AI disclosure | Recordings + transcripts | 40%+ give a usable quote; under 15% hang up on hearing "AI" |
| Manually compare and shortlist for each buyer | 10 comparison cards | 5+ buyers say they would pay ₹999+ for this |

**Kill or continue decision at end of week 2.** If suppliers refuse AI calls, pivot to WhatsApp-only outreach before going further.

## Week 3 to 6: MVP for one category

- Brief agent on WhatsApp with spec templates for 3 packaging items
- Supplier DB in Postgres, seeded from the week 0 to 2 sheet
- Outreach: voice + WhatsApp, with rate limits and business hours
- Quote extraction + normaliser (landed cost)
- GST vetting via GSP API
- Ops console: review brief, review quotes, approve shortlist
- Shortlist delivered on WhatsApp

**Pass mark:** 30 briefs end to end, under 48 hours each, 10%+ average savings.

## Week 7 to 10: Negotiation, follow-up, pricing

- Negotiation agent with "real quotes only" rule enforced in code
- Day 3 / day 15 follow-up and supplier score updates
- Paid plans live (first brief free, then per-brief fee)
- Eval suite: 50 calls + 30 briefs regression set

**Pass mark:** 50 paid briefs, 50%+ of briefs lead to an order, cost per brief under ₹1,000.

## Week 11 to 12: Prepare to scale

- Add 2 more categories (D2C mono cartons, labels) by adding spec templates only
- Reorder nudges for repeat buyers
- Supplier "outcome feedback" messages (why they lost)
- Review numbers, decide: next city or next category

## Team for the first 12 weeks

| Role | Count | Notes |
|------|-------|-------|
| Founder / product + sales | 1 | Owns buyer conversations |
| Full-stack + AI engineer | 1 to 2 | Workflow, agents, voice integration |
| Ops / sourcing associate | 1 | Knows packaging trade, reviews every brief, Hindi speaker |
| Legal (part-time / advisor) | 0.1 | TRAI, DPDP, terms of service |

## Budget sketch (12 weeks, lean)

| Item | Approx |
|------|--------|
| Voice + telephony (≈ 5,000 call minutes) | ₹40k to ₹60k |
| LLM + APIs (GSP, maps, WhatsApp) | ₹40k to ₹80k |
| Infra | ₹15k to ₹30k |
| Legal opinion | ₹50k to ₹1L |
| People | as per founding team |

## North-star metric

**Rupees saved for buyers per month.** It captures speed, price and trust in one number and is the line in every sales pitch.
