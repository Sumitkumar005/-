# Website chat widget: setup handoff

Paste this file into Claude in VS Code (or follow it by hand). The code is already on `main`.
Three things live outside the repo and have to be done in dashboards.

## What was built

- **Widget**: `src/components/landing/chat-widget.tsx`. Bottom-right launcher on the landing page only (not on `/login` or `/app`). Full screen on phones.
- **Flows**:
  - "Get a quote": scripted (item, monthly quantity, city, then name and WhatsApp number). Uses no AI.
  - "Talk to a person": name, number and topic. Uses no AI.
  - "How it works": a fixed answer. Uses no AI.
  - Free-typed questions: sent to Groq's fast model with a fact sheet built from the site's own FAQ and pricing (`src/components/landing/content.ts`).
- **API**:
  - `POST /api/chat`: public. Limited to 10 questions per conversation, 30 a day per visitor, and 800 a day across the whole site.
  - `POST /api/leads`: public. Checks the phone number, requires the consent tick, has a honeypot field for bots, and allows 5 leads a day per visitor.
- Visitors are counted by a salted hash of their IP. Raw IPs are never stored.

## 1. Supabase: run the migration (required for leads)

In Supabase, open the project `jskaoztubbctuskicjvs`, then **SQL Editor > New query**. Paste all of
`supabase/migrations/20261029000002_chat_leads.sql` and click **Run**.

It creates:

| Object | Purpose |
|---|---|
| `public.leads` | Each lead: name, phone (+91), need, quantity, city, kind (`quote`/`callback`), consent time, page, UTM tags, chat transcript, `status` (`new`/`contacted`/`converted`/`junk`) |
| `public.chat_usage` | Daily counters for rate limiting (one row per visitor per day) |
| `public.chat_hit(key, limit)` | Atomic counter the API calls. Only the service role can run it. |

RLS is on for both tables. Only `ops`/`admin` users can read leads; buyers can't see them.

**Until this runs:** the chat still answers questions (rate limits fall back to per-server memory), but **submitting a lead fails** with "Couldn't save that just now".

Check it worked:

```sql
select count(*) from public.leads;                 -- 0, no error
select public.chat_hit('test', 5);                 -- true
delete from public.chat_usage where key = 'test';
```

See new leads:

```sql
select created_at, kind, name, phone, need, quantity, city, utm->>'utm_source' as source
from public.leads where status = 'new' order by created_at desc;
```

## 2. Vercel: add the chat key (optional, but needed for AI answers)

1. Create a **second** Groq key at https://console.groq.com/keys. Name it something like `bhavtaav-website-chat`. Don't reuse `GROQ_API_KEY`: the brief pipeline needs that key's quota.
2. In Vercel, open the project, then **Settings > Environment Variables**, and add:

| Name | Value | Environments |
|---|---|---|
| `GROQ_CHAT_API_KEY` | the new key | Production, Preview |

3. Redeploy (Deployments > latest > Redeploy) so the new variable takes effect.

Optional tuning (leave unset to use the defaults):

| Name | Default | Meaning |
|---|---|---|
| `CHAT_PER_IP_DAILY` | 30 | Chat messages per visitor per day |
| `CHAT_GLOBAL_DAILY` | 800 | Chat messages per day across the whole site (Groq's free tier allows about 1,000) |

**Without `GROQ_CHAT_API_KEY`:** the widget still works. Free-typed questions get a polite "talk to a person" reply, and the quote and callback forms work as normal.

Locally, add the same line to `.env` (and to `.env.vercel.local` if you keep that file in sync).

## 3. Railway: nothing

The worker doesn't use the chat. Leave Railway alone.

## Test on the live site

1. Open https://bhavtaav.com and click the round ₹ button bottom-right.
2. **Get a quote**: type an item, a quantity and a city, then a name and a real 10-digit number. Tick the box and send.
3. In Supabase, run the "See new leads" query above. Your row should be there.
4. Type a free question such as "Do suppliers pay you?". With the key set, you get a short answer drawn from the FAQ.
5. On a phone, the widget opens full screen and the close button sits top right.

## Not done yet (next steps)

- **No alert on new leads.** Someone has to check the table. Once Resend is set up (already an open item), email ops on each insert.
- **No ops screen for leads.** For now, use the SQL above or Supabase's Table Editor and set `status` by hand.
- **Leads aren't buyers.** Turning a lead into an account and a brief is manual for now.
