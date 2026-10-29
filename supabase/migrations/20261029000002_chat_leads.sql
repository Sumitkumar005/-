-- Website chat widget: leads it captures, and a counter that rate-limits it.
-- Both are written only by server code with the service role. No buyer can read them.

-- ---------------------------------------------------------------------------
-- Leads from the landing-page chat
-- ---------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,                       -- E.164, +91XXXXXXXXXX
  need text not null,                        -- what they buy, in their words
  quantity text,                             -- "5,000 a month", free text
  city text,
  kind text not null default 'quote' check (kind in ('quote', 'callback')),
  consent_at timestamptz not null,           -- when they ticked the WhatsApp consent box
  source_path text,
  utm jsonb not null default '{}'::jsonb,
  transcript jsonb not null default '[]'::jsonb,
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'junk')),
  created_at timestamptz not null default now()
);

create index leads_created_idx on public.leads (created_at desc);
create index leads_status_idx on public.leads (status) where status = 'new';

alter table public.leads enable row level security;
create policy "ops only" on public.leads for select using (public.is_ops());

-- ---------------------------------------------------------------------------
-- Rate limiting. One row per key per day; keys are hashed IPs plus a global key.
-- A table instead of memory because every Vercel instance must see the same count.
-- ---------------------------------------------------------------------------
create table public.chat_usage (
  key text not null,
  day date not null default current_date,
  hits int not null default 0,
  primary key (key, day)
);

alter table public.chat_usage enable row level security;
-- No policies: only the service role touches this table.

-- Counts one hit and says whether the key is still under its daily limit.
create or replace function public.chat_hit(p_key text, p_limit int) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.chat_usage (key, day, hits) values (p_key, current_date, 1)
  on conflict (key, day) do update set hits = public.chat_usage.hits + 1
  returning hits into n;
  return n <= p_limit;
end $$;

revoke execute on function public.chat_hit(text, int) from public, anon, authenticated;
