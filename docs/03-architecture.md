# 03. Architecture (v1)

Goal of v1: take one buyer brief in food/D2C packaging in Delhi NCR and return a vetted, negotiated shortlist of 2 to 3 suppliers within **48 hours**, with a human ops person able to watch and override every step.

## 1. The big picture

```
                         BUYER
             (WhatsApp first, web dashboard second)
                            |
                            v
+-----------------------------------------------------------------+
|                    CHANNEL GATEWAY                              |
|   WhatsApp Business API  |  Web app  |  Ops console (internal)  |
+-----------------------------------------------------------------+
                            |
                            v
+-----------------------------------------------------------------+
|              SOURCING WORKFLOW ENGINE (one run per brief)       |
|                                                                 |
|  [1 Brief] -> [2 Scout] -> [3 Vet] -> [4 Outreach] ->           |
|  [5 Normalise] -> [6 Negotiate] -> [7 Shortlist] -> [8 Follow]  |
|                                                                 |
|  Durable, resumable, runs for days. Human checkpoints between   |
|  steps. Every step writes to the event log.                     |
+-----------------------------------------------------------------+
     |              |               |                |
     v              v               v                v
+----------+  +-----------+  +-------------+  +----------------+
| LLM layer|  | Voice     |  | Discovery & |  | Supplier graph |
| (agents, |  | stack     |  | enrichment  |  | + price index  |
| tools,   |  | telephony,|  | connectors  |  | (Postgres)     |
| evals)   |  | STT, TTS  |  | GST, maps,  |  |  THE MOAT      |
|          |  |           |  | web, dirs   |  |                |
+----------+  +-----------+  +-------------+  +----------------+
```

Principle: **one workflow per brief, many small agents, one shared supplier database.** Each agent does one job and has a narrow set of tools. The workflow engine, not the LLM, decides what runs next. That keeps cost, retries and audit under control.

## 2. The eight steps in detail

### Step 1. Brief agent
- **Input:** buyer's WhatsApp text, voice note, photo of the current product, or a reorder.
- **Does:** asks at most 4 or 5 follow-up questions, fills a structured brief.
- **Output:** `Brief` record, shown back to the buyer for a one-tap confirm.

```json
{
  "category": "food_packaging.paper_cup",
  "spec": { "capacity_ml": 250, "wall": "single", "gsm": 210, "print": "2 colour logo", "lid": true },
  "quantity": { "per_order": 5000, "frequency": "monthly" },
  "delivery": { "pincode": "122002", "by_date": "2026-11-15" },
  "budget": { "target_unit_price_inr": 1.2, "max_unit_price_inr": 1.5, "gst_inclusive": false },
  "must_have": ["GST invoice", "sample before bulk"],
  "negotiation_authority": { "can_counter": true, "floor_hint_inr": 1.05 }
}
```

Each category has a **spec template** (which fields matter for cups vs pouches vs cartons). Templates are config, not code, so ops can add categories.

### Step 2. Scout agent
- **Sources, in priority order:**
  1. Our own supplier graph (free, already vetted, known behaviour)
  2. Google Maps / Places API by category + location cluster
  3. Open web search (supplier websites, catalogues)
  4. Directories: JustDial, TradeIndia, IndiaMART. **Read the terms of each. Pilot uses manual or partner access, not scraping.**
  5. Supply partners and referrals
- **Does:** dedupes (same phone, same GSTIN, same name + pincode = same supplier), filters by distance and category fit.
- **Output:** 20 to 50 `Candidate` suppliers, ranked by fit and prior behaviour.

### Step 3. Vet agent (runs before and after calls)
| Check | Source | Signal |
|-------|--------|--------|
| GSTIN active, registration date, business type | GST public search / a GSP API | Hard filter: no active GST, no shortlist |
| Return filing regularity | GSP API | Irregular filing = risk flag |
| Company / LLP details | MCA data | Age, directors |
| Udyam registration | Udyam portal | Size, manufacturer vs trader |
| Reviews and ratings | Google, directories | Soft score |
| Our own history | Supplier graph | Pickup rate, quote honoured, on-time delivery |

**Output:** `VetReport` with a trust score and the reasons. Show reasons to the buyer, not just a number.

### Step 4. Outreach agent (voice + WhatsApp)
- **Call script is generated from the brief**, not free-form. Fixed sequence:
  1. Disclosure: "Namaste, main ek AI assistant hoon, Gurugram ke ek café ki taraf se call kar rahi hoon."
  2. Confirm they make or supply this product
  3. Price for the exact spec and quantity
  4. MOQ, lead time, freight to pincode, GST, payment terms, sample availability
  5. Ask permission to WhatsApp the spec and get the quote in writing
- **Guardrails:** business hours only (10 am to 6:30 pm, Mon to Sat), max 1 call per supplier per day, max 2 retries, hang up politely on refusal, never make a commitment on the buyer's behalf.
- **Output:** call recording, transcript, and a structured `Quote` extracted from it (with confidence per field). Low-confidence fields trigger a WhatsApp follow-up, not a guess.

### Step 5. Normaliser
Turns every quote into one comparable number: **landed cost per unit at the buyer's door.**

```
landed_unit_cost = (unit_price
                    + printing_or_setup_cost / quantity
                    + freight_to_pincode / quantity)
                   x (1 + gst_rate if quote is GST-exclusive else 1)
```

Also flags things that are not about price: MOQ above buyer's quantity, lead time past deadline, advance payment demanded, no sample.

### Step 6. Negotiation agent
- Takes the top 3 to 5 by landed cost and trust.
- Goes back by WhatsApp first (cheaper, written), voice if no reply in 24 hours.
- Uses only true leverage: "We have a quote at ₹1.18 landed. Can you match or better it?" **Never invents a competing quote.** This is a rule in code, checked against stored quotes, not just a prompt instruction.
- Stays within buyer's `negotiation_authority`. Anything outside goes to the buyer for a yes/no.

### Step 7. Shortlist
WhatsApp message + web link with a comparison card:

| | Supplier A | Supplier B | Supplier C |
|-|-----------|-----------|-----------|
| Landed cost / cup | ₹1.16 | ₹1.21 | ₹1.24 |
| MOQ | 5,000 | 10,000 | 5,000 |
| Lead time | 7 days | 5 days | 10 days |
| GST filing | Regular | Regular | 2 missed |
| Our history | 3 orders, on time | New | 1 order, late |
| Next step | [Talk] [Ask sample] | ... | ... |

Buyer taps "Talk" and we share contacts both ways with a warm intro on WhatsApp.

### Step 8. Follow-up
- Day 3 and day 15: did you order, did it arrive, was quality right?
- Answers update the supplier score. This loop is what makes the data trustworthy.
- Monthly reorder nudge for repeat items.

## 3. Data model (core tables)

```
buyer            (id, business_name, type, city, pincode, whatsapp, plan)
brief            (id, buyer_id, category, spec_json, qty, delivery_pincode, deadline,
                  budget_json, authority_json, status)
supplier         (id, name, gstin, phones[], whatsapp, address, pincode, lat, lng,
                  categories[], is_manufacturer, source, created_at)
supplier_vetting (supplier_id, checked_at, gst_status, filing_score, mca_json,
                  udyam_json, review_score, trust_score, reasons[])
interaction      (id, brief_id, supplier_id, channel[voice|whatsapp], direction,
                  started_at, duration_s, outcome, recording_url, transcript, cost_inr)
quote            (id, brief_id, supplier_id, interaction_id, unit_price, unit, gst_incl,
                  gst_rate, moq, lead_time_days, freight_inr, setup_inr, payment_terms,
                  sample_available, valid_till, confidence_json, version)
landed_quote     (quote_id, landed_unit_cost, flags[])
negotiation      (id, brief_id, supplier_id, round, ask, response, quote_id_after)
shortlist        (brief_id, supplier_id, rank, buyer_action)
outcome          (brief_id, supplier_id, ordered, order_value, delivered_on_time,
                  quality_ok, quote_honoured, feedback)
price_point      (category, spec_hash, city, month, landed_unit_cost, qty_band, source_quote_id)
event_log        (id, brief_id, step, actor[agent|ops|buyer], payload_json, at)
```

`price_point` and the `supplier` behaviour fields together are the long-term asset. Design them carefully from day one.

## 4. Tech stack (recommended)

| Layer | Choice | Why |
|-------|--------|-----|
| Backend | Python, FastAPI | Best ecosystem for LLM, voice and data work |
| Workflow engine | Temporal (or Inngest if we want lighter) | Briefs run for days, need retries, timers and human waits. Do not build this on cron jobs |
| Database | Postgres (Supabase or Neon) + pgvector | One DB for relational data and supplier similarity search |
| Cache / queues | Redis | Rate limits per supplier, call slots |
| LLM | Claude models: a large model for brief understanding, negotiation and comparison reasoning, a small fast model for extraction and classification | Strong tool use, good at structured output; route by task to control cost |
| Voice telephony | Exotel or Plivo (Indian numbers, registered) | Local numbers, compliant routing, cheaper than global options |
| Voice AI | Start with a managed Indian voice agent platform (Bolna, Sarvam, or similar) for Hinglish STT/TTS; move to own pipeline (STT + LLM + TTS) when volume justifies | Speed to pilot first, cost control later |
| WhatsApp | Meta WhatsApp Cloud API via a BSP (Gupshup, Interakt, or direct) | Main buyer channel and written quotes |
| GST data | GSP API provider | Return filing data needs a GSP, not just the public search |
| Frontend | Next.js for buyer web view and ops console | Fast to build, easy to host |
| Observability | Langfuse (LLM traces), Sentry, call recordings in object storage | Every call and every agent decision must be replayable |

## 5. Human in the loop (v1 must have this)

The **ops console** is not optional. In the pilot, a person checks:
1. The structured brief before outreach starts
2. Any quote with low extraction confidence
3. The shortlist before it goes to the buyer

Target: 15 minutes of human time per brief in month 1, under 3 minutes by month 3. Every human correction is saved as a training/eval example.

## 6. Quality and evals

| What | How we measure | Target in pilot |
|------|---------------|----------------|
| Call success | % of calls that end with a usable quote | 40%+ |
| Extraction accuracy | Quote fields vs human-checked transcript | 95%+ on price, MOQ |
| Shortlist quality | Buyer orders from shortlist | 50%+ of briefs |
| Savings | Landed cost vs buyer's current price or first quote received | 10%+ |
| Speed | Brief confirmed to shortlist delivered | Under 48 hours |
| Cost | All-in cost per brief | Under ₹1,000 |

Keep a fixed set of 50 recorded calls and 30 briefs as a regression test. Run it on every prompt or model change.

## 7. Compliance and trust (build in from day one)

- **AI disclosure** at the start of every call. Non-negotiable.
- **Call recording notice** in the opening line; store recordings with a retention limit (for example 180 days) and access logs.
- **DPDP Act 2023 and Rules:** privacy notice, purpose limitation (use supplier contact only for sourcing), opt-out ("do not call me again" is honoured instantly and permanently), data deletion on request.
- **TRAI / telecom:** use a registered telephony provider and the correct number series for business calls; get a short legal opinion on whether automated buyer-enquiry calls count as commercial communication. Respect DND.
- **Directory terms:** no scraping of sites whose terms forbid it. Prefer APIs, partnerships, and our own data.
- **No fake leverage:** negotiation agent can only cite real stored quotes.
- **Buyer data stays with the buyer:** suppliers never see other suppliers' names or the buyer's identity until the buyer chooses to talk.

## 8. Phase 2 hooks (do not build now, but leave room)

- `supplier` table gets an `account_id` when a supplier signs up.
- Outreach agent checks: if supplier has a connected price list or agent endpoint, query it instead of calling.
- `lead` table for suppliers to receive matched briefs (only with buyer consent).
- An API so supplier-side agents can answer RFQs in a standard format.
