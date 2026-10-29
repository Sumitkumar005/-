# 06. Research: what IndiaMART does, what it doesn't, and what that means for us

Researched 29 Oct 2026. Sources at the end. Numbers marked "self-reported" come from the company's own marketing.

## 1. IndiaMART's AI is pointed at the seller, not the buyer

The most important finding. IndiaMART already runs voice AI at scale, but it works the other way round from us.

**VANI (IndiaMART's voice agent), per their March 2026 blog (self-reported):**
- About 1 lakh **buyer** calls a day, about 30 lakh a month
- It calls buyers who posted a requirement, verifies it (quantity, unit, location, spec), and **patches verified buyers live to sellers** (about 75% of confirmed buyers)
- About 80% of buyer verification calls fully automated, nine Indian languages incl. Hinglish
- 25% higher conversion and 30% lower cost per confirmed lead vs manual calls
- Confidence threshold with human escalation, full call audit trail

**Read this carefully:** VANI's job is to make the *lead* better before it is sold to a paying seller. The buyer is the product being qualified. Nobody at IndiaMART calls suppliers on the buyer's behalf, compares their quotes, or negotiates.

**Other IndiaMART AI work (Reuters, June 2026):**
- AI to catch fake listings and proxy seller accounts (pattern matching across profiles)
- Voice-to-text for processing buyer requests (replacing call-centre work)
- Plans to double AI tool spend every six months
- About 2.2 lakh paying sellers, about 9 crore monthly visitors, about 600 buyer-seller matches a minute
- **"Does not usually monitor the transactions it facilitates"**

That last line is the opening. IndiaMART knows who asked and who was told. It does not know what was quoted, what was paid, or whether the goods arrived. We will.

## 2. Gap map: what is not being done for the small buyer

| Job a purchase manager does | IndiaMART today | BhavTaav |
|---|---|---|
| Write a clear spec | Buyer types free text; VANI verifies it for sellers | Brief agent builds a structured, category-specific spec |
| Find suppliers | Strong (listings, search) | Uses our network, maps, open web; no scraping |
| Call suppliers | Sellers call the buyer | Our agent calls sellers |
| Ask the same questions of everyone | No | Fixed script per brief |
| Make quotes comparable | No | Landed cost per unit, every assumption flagged |
| Check the supplier | TrustSEAL (paid by seller), KYC | GSTIN checksum, state, GSP status, our outcome history |
| Negotiate | No | Real-quote-only counter offers, max 15% ask |
| Track what happened after | No ("does not monitor transactions") | Outcome capture feeds trust ledger and price index |
| Protect the buyer's number | Shared with many sellers | Hidden until buyer chooses |

## 3. Competitor signals (and how far to trust them)

| Company | Signal | What it validates | Caveat |
|---|---|---|---|
| Pactum | Autonomous negotiation inside buyer-set limits (target, walk-away, trade-offs). Walmart is the reference customer. Launched requisition and intake agents in 2026 | Negotiation agents with guardrails are a real, paid category; best fit is tail spend with repeatable terms, which is what a café buys | Enterprise only; savings claims (2-10%) are vendor or review-site numbers |
| Kavida.ai | Acquired by QAD Redzone (Nov 2025) for supplier-communication agents in manufacturing | Demand for agents that chase suppliers | Little public detail on its RFQ product |
| Procure.ai | "40+ AI agents" across intake, autonomous sourcing and negotiation, supplier management; claims 4.9% savings on tactical and tail spend | The discover > vet > shortlist > negotiate chain is how the category is being built in Europe | Enterprise, ERP-integrated, euro tickets |
| Mercanis | Could not verify a "discovery to shortlist" agent from public sources | Treat as unverified | Do not cite in a deck without a source |
| Udaan, Jumbotail | Inventory-led B2B commerce for kiranas | Indian SMEs buy online | Narrow catalogue, no custom specs |
| OfBusiness, Zetwerk, Moglix | Managed procurement for mid and large companies | Margin exists in managed procurement | Ticket size too high for a café |

**Our position:** the enterprise playbook (Pactum, Procure.ai) applied to India's long tail, delivered by phone and WhatsApp instead of an ERP.

## 4. Voice layer: feasible, priced per minute

- Bolna (Indian voice AI, Hinglish voices, Exotel telephony): official pricing page lists bundles from about $0.05 to $0.10 per minute; third-party write-ups quote ₹3 to ₹7 per minute depending on volume. Sector estimates put Indian voice AI at ₹1.75 to ₹5.5 per minute at committed volume.
- Our unit economics in `02-brainstorm.md` used ₹6 to ₹10 per minute. At Bolna's pilot rate the cost per brief is closer to ₹300 to ₹500 than ₹750. Re-check against a real invoice after the first 1,000 minutes.
- Bolna API is a simple `POST /call` with an agent id, recipient number and prompt variables; results come back as an execution with transcript, recording URL and cost. The code integrates exactly this (`src/lib/voice/provider.ts`, `src/app/api/webhooks/voice/bolna`).

## 5. Telecom rules: design for the strictest reading

- TRAI's **draft TCCCPR Third Amendment (March 2026)** gives the first formal definition of automated/A2P calls, explicitly including AI voice calls. Senders must **declare A2P usage to their operator in advance**; undeclared automated calls are treated as **unsolicited commercial communication**. Proposed termination charge up to 5 paise per minute, waived for registered 140 and 1600 series numbers.
- One vendor blog says the amendment was finalised in September 2026. We could not confirm this against a TRAI source. **Assume it applies.**
- Promotional calls go on 140-series numbers, service and transactional on the 160x series.
- No Indian rule yet requires AI disclosure on calls. We disclose anyway in the first sentence. It is cheap trust and future-proof.

**What the product already does about it:** AI and recording disclosure in the opening line; Mon-Sat 10:00-18:30 IST only; max one call per supplier per 20 hours across all buyers; permanent opt-out on first request; demo suppliers can never be dialled; real calls only through a provider account you control.

**What you must still do before real calls (owner: founders + telecom lawyer):** declare A2P usage with the operator via the telephony provider, get the right number series, and a written opinion on whether a buyer's quote request counts as commercial communication.

## 6. LLM layer: Groq free tier works for the pilot

- Production models on Groq: `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, plus Whisper for speech-to-text.
- **Strict structured outputs** (constrained decoding to a JSON schema) are supported on `gpt-oss-120b` and `gpt-oss-20b`. Other models only get JSON mode.
- Free tier is rate limited (around 30 requests per minute; daily caps vary by model and sources disagree, check console.groq.com/settings/limits). Known issue: intermittent `json_validate_failed` errors in strict mode.

**What the code does:** gpt-oss-120b with strict schema for extraction and brief parsing; gpt-oss-20b for cheap tasks; on failure retries without strict mode, then falls back to llama-3.3-70b in JSON mode; every response is validated with zod; a client-side limiter stays under 28 requests per minute. One brief uses roughly 25 to 35 LLM calls, so the free tier handles about one brief a minute.

## 7. What we changed because of this research

1. Positioning: "lead marketplace" in all public copy, never "AI IndiaMART". We compete on a job they are structurally not paid to do.
2. Outcome capture moved from "nice to have" to core: it is the one dataset IndiaMART has said it does not collect.
3. Negotiation guardrails copied from Pactum's model (target, walk-away, max ask) and enforced in code.
4. Compliance moved into the product, not a policy doc: hours, caps, opt-out, disclosure.
5. GST checks split honestly into "checked offline" (format, checksum, state) and "needs a GSP" (status, filing). The trust ledger shows the difference.

## Sources

- IndiaMART corporate blog, "When AI stops assisting and starts operating" (Mar 2026): https://corporate.indiamart.com/2026/03/23/when-ai-stops-assisting-and-starts-operating/
- Reuters via The Star, "IndiaMART doubles down on AI to curb fake listings" (Jun 2026): https://www.thestar.com.my/tech/tech-news/2026/06/25/indiamart-doubles-down-on-ai-to-curb-fake-listings-improve-buyer-interaction
- IndiaMART Q1 FY2027 earnings call transcript: https://financialfilings.com/filings/indiamart-intermesh-limited/call-transcript/2026/49483777/
- MediaNama on TRAI's automated calls draft (Mar 2026): https://www.medianama.com/2026/03/223-trai-automated-calls-charge-india/
- Bar & Bench on TRAI and AI telemarketing: https://www.barandbench.com/view-point/trais-crackdown-on-spam-calls-and-ai-driven-telemarketing
- Bolna pricing: https://www.bolna.ai/pricing and API docs: https://www.bolna.ai/docs/api-reference/calls/make
- Groq models: https://console.groq.com/docs/models and structured outputs: https://console.groq.com/docs/structured-outputs
- Procure.ai: https://www.procure.ai/
- Pactum product launches (2026): https://techintelpro.com/news/ai/agentic-ai/pactum-launches-requisition-alignment-agent
- QAD Redzone acquires Kavida.ai: https://www.pulse.bot/ai/deals/qad-redzone-acquires-ai-agent-platform-kavidaai-to-boost-manufacturing-automation-932cf679-7e60-4731-941f-f48da609afe8/
