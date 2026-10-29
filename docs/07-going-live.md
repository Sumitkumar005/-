# 07. Going live with real calls

The app runs end to end in simulation. Switching on real calls is a config change, but it puts a robot on real people's phones, so do these in order.

## Before the first real call

| # | Step | Owner | Done when |
|---|------|-------|-----------|
| 1 | Telecom lawyer's written opinion: is an AI call asking a supplier for a quote "commercial communication" under TCCCPR? What does the 2026 A2P amendment require of us? | Founders | Opinion on file |
| 2 | Telephony through a registered provider (Exotel via Bolna). Declare A2P / automated calling with the operator. Use the number series your lawyer and provider recommend | Founders | Provider confirms in writing |
| 3 | Privacy notice on the site covering supplier contact data, call recording, retention (we suggest 180 days) and opt-out (DPDP Act 2023 and Rules) | Founders | Page live |
| 4 | Bolna agent set up with the prompt below, Hindi + English voices, recording on | Engineering | Test call to your own phone sounds right |
| 5 | Add 30 to 50 real suppliers for one category in one area (CSV import or ops form). Only suppliers who list their number publicly for business | Ops | In the directory, vetted |
| 6 | Turn on the shortlist human check: `OPS_REVIEW_SHORTLIST=true` | Ops | Env set |
| 7 | 20 test calls with Ops listening. Fix the prompt until 8 of 10 give a usable quote | Ops + Eng | Ops desk accuracy above 90% on price |

## Environment

```
VOICE_PROVIDER=bolna
BOLNA_API_KEY=...
BOLNA_AGENT_ID=...
BOLNA_FROM_NUMBER=+91...
VOICE_WEBHOOK_SECRET=<long random string>
OPS_REVIEW_SHORTLIST=true
```

In Bolna, set the agent's webhook to:

```
https://<your-app-domain>/api/webhooks/voice/bolna?secret=<VOICE_WEBHOOK_SECRET>
```

The app must be reachable from the internet for webhooks. For local testing use a tunnel (for example `cloudflared tunnel --url http://localhost:3000`).

What the code enforces in real mode, regardless of settings:
- Calls only Mon-Sat, 10:00-18:30 IST, skipping listed holidays (`src/lib/domain/hours.ts`, update the list yearly)
- One call per supplier per 20 hours across all buyers
- Never dials a demo supplier or anyone marked do-not-call
- A call with no webhook after 20 minutes is treated as no answer and retried once
- Negotiation in real mode goes to the ops desk as a ready, guard-checked script instead of an automatic second call

## Bolna agent prompt (starting point)

Variables come from `buildCallScript()` in `src/lib/agents/call-script.ts`.

```
You are a polite AI sourcing assistant from BhavTaav calling an Indian wholesaler.
Speak natural Hinglish. Keep it under 3 minutes.

Start with exactly: {opening}

Ask these, one at a time, and note the answers:
{questions}

Rules:
- If they ask, say you are an AI assistant calling for a {buyer_kind} in {buyer_city}. Never give the buyer's name or number.
- If they ask not to be called again, say: "Koi baat nahi, aapka number hum list se hata dete hain. Dhanyavaad." and end the call.
- Never agree to a price, place an order, or promise anything on the buyer's behalf.
- If they are busy, ask when to call back and end politely.
- If they offer to send the rate on WhatsApp, thank them and say the team will message.
End with: "Dhanyavaad. Buyer ko aapka quote dikha dete hain, agar select hua to aapko seedha call aayega."
```

## Measure from day one

The ops desk shows extraction accuracy for simulated calls. For real calls, have Ops correct every quote for the first two weeks (Correct quote on the task) and track:

- Calls that end with a usable quote (target 40%+)
- Hang-ups on hearing "AI" (stop and rethink if above 15%)
- Opt-out rate
- Cost per brief (Bolna dashboard) vs the ₹1,000 target
