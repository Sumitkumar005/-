# BhavTaav

**The buyer's AI sourcing agent for Indian wholesale.** Give us your requirement. We find wholesalers, call them in Hindi and English, check their GST, compare quotes rupee for rupee at your door, negotiate, and hand you the best two or three.

> *Bhav-taav* is Hindi for haggling over price. That is the job this product does for the buyer.

IndiaMART already uses voice AI, but to verify buyers for its paying sellers (see [docs/06-research.md](docs/06-research.md)). Nobody calls suppliers for the small buyer, compares their quotes like for like, or tracks whether they delivered. That is the wedge.

## What works today

- **Landing page** for buyers and investors
- **Buyer app**: sign up, business profile, write or speak a brief (Hindi, English, Hinglish), review the structured spec, start sourcing, watch it live
- **Sourcing pipeline** (background worker): scout suppliers near the pincode, vet GSTINs, call each supplier, extract the quote from the transcript, convert every quote to landed cost per unit, rank, negotiate with the top three, shortlist
- **Shortlist**: landed cost, savings vs what you pay today, terms side by side, reasons and flags; choose a supplier to unlock their contact and a ready WhatsApp message
- **Outcome capture**: on time, quality, price honoured. Feeds each supplier's trust ledger
- **Ops desk**: confirm unclear quotes (re-ranks automatically), review shortlists, opt-outs, stuck briefs, extraction accuracy
- **Supplier directory**: add by hand or CSV, trust ledger per supplier

Runs fully offline in demo mode: **simulated supplier calls** and an **offline AI mock**, so you only need a free Supabase project to try it. Add a free Groq key for the real model. Real phone calls are one env var away once you've done the compliance steps in [docs/07-going-live.md](docs/07-going-live.md).

## Run it locally (about 10 minutes)

**You need:** Node 20.12+ (22 recommended) and a free [Supabase](https://supabase.com) project. A free [Groq](https://console.groq.com/keys) key is optional.

1. **Install**

   ```bash
   npm install
   ```

2. **Create the database.** In Supabase, open SQL Editor and run these two files in order:
   - `supabase/migrations/20261029000001_init.sql` (tables, row level security, job queue)
   - `supabase/seed.sql` (31 demo suppliers across Delhi NCR)

   With the Supabase CLI instead: `supabase link` then `supabase db push`, then run `seed.sql`.

3. **Configure**

   ```bash
   cp .env.example .env.local
   ```

   Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from Project Settings > API. Add `GROQ_API_KEY` if you have one.

4. **Turn off email confirmation for local testing** (optional): Authentication > Providers > Email > disable "Confirm email". Otherwise confirm via the email link.

5. **Start the web app and the worker together**

   ```bash
   npm run dev:all
   ```

   Open http://localhost:3000. The worker must be running or briefs stay at "Starting".

6. **Make yourself ops** (to see the Suppliers and Ops desk pages). After signing up, run in SQL Editor:

   ```sql
   update public.profiles set role = 'ops' where id = (select id from auth.users where email = 'you@example.com');
   ```

### Demo walkthrough

1. Sign up, fill in the business profile (Gurugram, pincode 122002 works well with the demo network).
2. New brief: *"Need 5000 printed 250ml single wall paper cups 2 colour logo every month, currently paying Rs 1.6"*.
3. Check the spec, press **Start sourcing**, and watch: 10 suppliers found, one blocked for a bad GSTIN, one busy and called back, one opts out, one quotes per kg without a piece count (sent to ops), seven quotes compared, three negotiated, shortlist with savings.
4. Choose a supplier, then record the outcome and watch their trust score change.
5. As ops: correct the per-kg quote on the Ops desk and see the shortlist re-rank.

## Commands

| Command | What it does |
|---|---|
| `npm run dev:all` | Web app and worker together |
| `npm run dev` / `npm run worker` | Each one separately |
| `npm test` | Unit tests + full pipeline run on an in-memory database |
| `npm run typecheck` | TypeScript |
| `npm run build` | Production build |
| `npx tsx scripts/generate-seed.ts` | Regenerate `supabase/seed.sql` from `src/lib/seed/demo-suppliers.ts` |

## How it's built

```
Buyer (web, WhatsApp later)
   │
Next.js app ── API routes ──► Supabase Postgres (RLS) ◄── Worker (npm run worker)
                                 │  jobs table                 │
                                 │                             ├─ Groq LLM (brief parsing, quote extraction)
                                 │                             ├─ Voice: simulated | Bolna (real calls, webhook back)
                                 │                             └─ Discovery: directory, CSV, Google Places (optional)
```

- **Pipeline:** `scout → vet → schedule_calls → call → extract → compare → negotiate → compare → shortlist`. Each step is a job in Postgres, claimed with `FOR UPDATE SKIP LOCKED`, retried with backoff, safe to re-run.
- **Guardrails in code, not prompts:** calling hours, one call per supplier per day, permanent opt-out, negotiation can only cite real stored quotes and never asks for more than 15% off, every rupee figure in a counter-offer is checked against allowed numbers.
- **Every LLM output is validated** with zod. Groq strict JSON schema first, then JSON mode, then a fallback model.

Details: [docs/03-architecture.md](docs/03-architecture.md).

```
src/lib/domain/      landed cost, GSTIN, trust ledger, ranking, calling hours, negotiation guard (pure, tested)
src/lib/agents/      brief parser, call script, quote extraction
src/lib/voice/       provider interface, supplier simulator, Bolna adapter
src/lib/pipeline/    the job steps, runner, trust service
src/lib/llm/         Groq client, strict schema conversion, offline mock
src/app/             pages and API routes
worker/              background worker
supabase/            migration and seed
docs/                strategy, research, architecture, going live
```

## Docs

| # | Doc | What it answers |
|---|-----|-----------------|
| 1 | [Understanding](docs/01-understanding.md) | The idea in plain words |
| 2 | [Brainstorm](docs/02-brainstorm.md) | Buyer, first category, pricing, risks, moat |
| 3 | [Architecture](docs/03-architecture.md) | How the system works |
| 4 | [Roadmap](docs/04-roadmap.md) | First 12 weeks |
| 5 | [Open questions](docs/05-open-questions.md) | Decisions pending, with defaults |
| 6 | [Research](docs/06-research.md) | IndiaMART teardown, competitors, TRAI, Groq, voice costs |
| 7 | [Going live](docs/07-going-live.md) | Checklist before real calls |

## Known limits of v1

- WhatsApp is a deep link for the buyer, not an integrated channel yet.
- GST status and filing history need a GST data provider (GSP). Until one is plugged into `src/lib/pipeline/gst-provider.ts`, the ledger shows them as "not checked".
- Live negotiation calls go to the ops desk as a script. Simulated mode negotiates automatically.
- One buyer login per business (no teams yet).
- Holidays for calling hours are a hard-coded list; update yearly.
