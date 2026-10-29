-- BhavTaav core schema.
-- Writes from the app go through server code using the service role, after explicit
-- ownership checks. RLS below is defence in depth for any direct client access.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'buyer' check (role in ('buyer', 'ops', 'admin')),
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_ops() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('ops', 'admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- Buyers (the business behind a user)
-- ---------------------------------------------------------------------------
create table public.buyers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  business_name text not null,
  business_type text not null default 'other',
  contact_name text,
  phone text,
  gstin text,
  city text not null,
  state text not null,
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger buyers_updated_at before update on public.buyers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Suppliers (platform-owned directory; the long-term asset)
-- ---------------------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,                       -- E.164, e.g. +919812345678
  whatsapp text,
  email text,
  website text,
  address text,
  city text,
  state text,
  pincode text,
  lat double precision,
  lng double precision,
  categories text[] not null default '{}',
  is_manufacturer boolean,
  gstin text,
  udyam text,
  year_established int,
  review_rating numeric(2, 1),
  review_count int,
  source text not null default 'manual'
    check (source in ('seed', 'manual', 'csv', 'google_places', 'indiamart_manual', 'referral', 'call')),
  source_ref text,
  is_demo boolean not null default false,
  do_not_call boolean not null default false,
  do_not_call_at timestamptz,
  verification jsonb not null default '{}'::jsonb,
  trust_score int,
  trust_band text check (trust_band in ('trusted', 'check', 'risky', 'blocked')),
  trust_ledger jsonb not null default '[]'::jsonb,
  verified_at timestamptz,
  sim_profile jsonb,                -- only for demo suppliers in simulation mode
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index suppliers_phone_uidx on public.suppliers (phone) where phone is not null;
create unique index suppliers_gstin_uidx on public.suppliers (gstin) where gstin is not null;
create index suppliers_categories_idx on public.suppliers using gin (categories);
create index suppliers_state_idx on public.suppliers (state);
create trigger suppliers_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Briefs (one sourcing job)
-- ---------------------------------------------------------------------------
create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled brief',
  raw_text text not null default '',
  category text not null default 'other',
  spec jsonb not null default '{}'::jsonb,
  quantity numeric check (quantity is null or quantity > 0),
  unit text not null default 'pieces',
  frequency text not null default 'one_time'
    check (frequency in ('one_time', 'weekly', 'monthly', 'quarterly')),
  delivery_city text,
  delivery_state text,
  delivery_pincode text,
  needed_by date,
  target_unit_price numeric check (target_unit_price is null or target_unit_price > 0),
  max_unit_price numeric check (max_unit_price is null or max_unit_price > 0),
  current_unit_price numeric check (current_unit_price is null or current_unit_price > 0),
  must_haves text[] not null default '{}',
  negotiation jsonb not null default '{"allowed": true, "max_rounds": 1}'::jsonb,
  open_questions jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in (
    'draft', 'confirmed', 'scouting', 'vetting', 'calling', 'comparing', 'negotiating',
    'in_review', 'shortlist_ready', 'supplier_selected', 'completed', 'cancelled', 'needs_attention'
  )),
  status_reason text,
  run_no int not null default 1,
  max_suppliers int not null default 12 check (max_suppliers between 1 and 50),
  summary jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz,
  shortlisted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index briefs_owner_idx on public.briefs (owner_id, created_at desc);
create index briefs_status_idx on public.briefs (status);
create trigger briefs_updated_at before update on public.briefs
  for each row execute function public.set_updated_at();

-- Suppliers considered for a brief, and where each one is in the funnel.
create table public.brief_suppliers (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.briefs (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  run_no int not null default 1,
  status text not null default 'candidate' check (status in (
    'candidate', 'excluded', 'queued', 'calling', 'callback', 'quoted', 'declined',
    'unreachable', 'opted_out', 'shortlisted', 'not_shortlisted', 'selected'
  )),
  exclude_reason text,
  match_reason text,
  distance_km numeric,
  call_attempts int not null default 0,
  next_call_at timestamptz,
  score numeric,
  rank int,
  rank_reasons text[] not null default '{}',
  revealed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brief_id, supplier_id)
);
create index brief_suppliers_brief_idx on public.brief_suppliers (brief_id);
create trigger brief_suppliers_updated_at before update on public.brief_suppliers
  for each row execute function public.set_updated_at();

-- Every call or message. Transcripts are kept for audit and evals.
create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references public.briefs (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  purpose text not null default 'quote' check (purpose in ('quote', 'negotiation', 'followup')),
  channel text not null default 'voice' check (channel in ('voice', 'whatsapp')),
  provider text not null,
  provider_ref text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'failed')),
  outcome text check (outcome in (
    'quoted', 'callback', 'declined', 'not_supplier', 'wrong_number', 'no_answer',
    'opted_out', 'improved', 'held', 'failed'
  )),
  language text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_s int,
  transcript jsonb not null default '[]'::jsonb,
  summary text,
  recording_url text,
  cost_inr numeric,
  ground_truth jsonb,
  created_at timestamptz not null default now()
);
create index interactions_brief_idx on public.interactions (brief_id, created_at);
create index interactions_supplier_idx on public.interactions (supplier_id, created_at desc);
create unique index interactions_provider_ref_uidx on public.interactions (provider, provider_ref)
  where provider_ref is not null;

-- Quotes. A negotiation produces a new version; only one row per supplier+brief is latest.
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.briefs (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  interaction_id uuid references public.interactions (id) on delete set null,
  version int not null default 1,
  is_latest boolean not null default true,
  unit_price numeric not null check (unit_price > 0),
  price_basis text not null default 'per_unit'
    check (price_basis in ('per_unit', 'per_100', 'per_1000', 'per_kg', 'per_box', 'lot')),
  units_per_basis numeric,             -- e.g. pieces per kg, pieces per box, lot size
  gst_included boolean,
  gst_rate numeric,
  moq numeric,
  lead_time_days int,
  freight_mode text not null default 'unknown'
    check (freight_mode in ('included', 'fixed', 'per_unit', 'to_pay', 'unknown')),
  freight_amount numeric,
  setup_cost numeric,
  sample_available boolean,
  sample_cost numeric,
  payment_terms text,
  advance_pct numeric check (advance_pct is null or (advance_pct >= 0 and advance_pct <= 100)),
  defect_policy text,
  valid_days int,
  gstin_shared text,
  notes text,
  confidence jsonb not null default '{}'::jsonb,
  needs_confirmation boolean not null default false,
  -- Normalised, computed by the compare step
  effective_qty numeric,
  landed_unit_cost numeric,
  landed_total numeric,
  flags text[] not null default '{}',
  computed_at timestamptz,
  created_at timestamptz not null default now()
);
create index quotes_brief_idx on public.quotes (brief_id) where is_latest;
create unique index quotes_latest_uidx on public.quotes (brief_id, supplier_id) where is_latest;

create table public.negotiations (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.briefs (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  round int not null default 1,
  ask_unit_price numeric not null,
  cited_quote_id uuid references public.quotes (id) on delete set null,
  message text not null,
  outcome text check (outcome in ('improved', 'held', 'declined', 'no_response')),
  before_landed numeric,
  after_landed numeric,
  interaction_id uuid references public.interactions (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (brief_id, supplier_id, round)
);

-- What actually happened after the shortlist. Feeds the supplier trust ledger.
create table public.outcomes (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.briefs (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  ordered boolean not null,
  order_value numeric check (order_value is null or order_value >= 0),
  delivered_on_time boolean,
  quality_ok boolean,
  quote_honoured boolean,
  dispute boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (brief_id, supplier_id)
);
create index outcomes_supplier_idx on public.outcomes (supplier_id);

-- Verified market prices by category and spec. The data flywheel.
create table public.price_points (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  spec_key text not null,
  brief_id uuid references public.briefs (id) on delete cascade,
  state text,
  quantity numeric,
  landed_unit_cost numeric not null,
  quote_id uuid unique references public.quotes (id) on delete cascade,
  observed_at timestamptz not null default now()
);
create index price_points_lookup_idx on public.price_points (category, spec_key, state, observed_at desc);

create table public.brief_events (
  id bigint generated always as identity primary key,
  brief_id uuid not null references public.briefs (id) on delete cascade,
  kind text not null,
  title text not null,
  detail text,
  data jsonb not null default '{}'::jsonb,
  actor text not null default 'agent' check (actor in ('agent', 'buyer', 'ops', 'system')),
  created_at timestamptz not null default now()
);
create index brief_events_brief_idx on public.brief_events (brief_id, id);

create table public.ops_tasks (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references public.briefs (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete cascade,
  kind text not null check (kind in ('review_quote', 'review_shortlist', 'needs_attention', 'opt_out')),
  ref_id uuid,
  title text not null,
  detail text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index ops_tasks_open_idx on public.ops_tasks (status, created_at);

-- ---------------------------------------------------------------------------
-- Job queue (worker polls with claim_job; no external queue needed)
-- ---------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  brief_id uuid references public.briefs (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text unique,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed', 'cancelled')),
  run_at timestamptz not null default now(),
  attempts int not null default 0,
  max_attempts int not null default 3,
  last_error text,
  locked_by text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index jobs_ready_idx on public.jobs (run_at) where status = 'queued';
create index jobs_brief_idx on public.jobs (brief_id);

-- Claims one due job. Also recovers jobs stuck in 'running' (worker crashed) after 10 minutes.
create or replace function public.claim_job(p_worker text)
returns setof public.jobs
language plpgsql security definer set search_path = public as $$
begin
  update public.jobs
     set status = 'queued', locked_by = null, locked_at = null
   where status = 'running' and locked_at < now() - interval '10 minutes';

  return query
  update public.jobs j
     set status = 'running', locked_by = p_worker, locked_at = now(), attempts = j.attempts + 1
   where j.id = (
     select id from public.jobs
      where status = 'queued' and run_at <= now()
      order by run_at
      limit 1
      for update skip locked
   )
  returning j.*;
end $$;

revoke all on function public.claim_job(text) from public, anon, authenticated;
grant execute on function public.claim_job(text) to service_role;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.buyers enable row level security;
alter table public.suppliers enable row level security;
alter table public.briefs enable row level security;
alter table public.brief_suppliers enable row level security;
alter table public.interactions enable row level security;
alter table public.quotes enable row level security;
alter table public.negotiations enable row level security;
alter table public.outcomes enable row level security;
alter table public.price_points enable row level security;
alter table public.brief_events enable row level security;
alter table public.ops_tasks enable row level security;
alter table public.jobs enable row level security;

create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_ops());
create policy "own buyer" on public.buyers for select using (owner_id = auth.uid() or public.is_ops());
create policy "ops suppliers" on public.suppliers for select using (public.is_ops());
create policy "own briefs" on public.briefs for select using (owner_id = auth.uid() or public.is_ops());

create or replace function public.owns_brief(p_brief uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.briefs where id = p_brief and owner_id = auth.uid());
$$;

create policy "brief children" on public.brief_suppliers for select using (public.owns_brief(brief_id) or public.is_ops());
create policy "brief children" on public.interactions for select using (public.owns_brief(brief_id) or public.is_ops());
create policy "brief children" on public.quotes for select using (public.owns_brief(brief_id) or public.is_ops());
create policy "brief children" on public.negotiations for select using (public.owns_brief(brief_id) or public.is_ops());
create policy "brief children" on public.outcomes for select using (public.owns_brief(brief_id) or public.is_ops());
create policy "brief children" on public.brief_events for select using (public.owns_brief(brief_id) or public.is_ops());
create policy "ops only" on public.price_points for select using (public.is_ops());
create policy "ops only" on public.ops_tasks for select using (public.is_ops());
create policy "ops only" on public.jobs for select using (public.is_ops());
