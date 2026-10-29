// Row shapes for the tables in supabase/migrations. Kept by hand to stay readable.

import type { BriefStatus } from "@/lib/domain/brief-state";
import type { FreightMode, PriceBasis } from "@/lib/domain/landed-cost";
import type { LedgerEntry, TrustBand, GstStatus } from "@/lib/domain/trust";
import type { Unit } from "@/lib/domain/categories";

export type Role = "buyer" | "ops" | "admin";

export type Profile = { id: string; role: Role; full_name: string | null; created_at: string };

export type Buyer = {
  id: string;
  owner_id: string;
  business_name: string;
  business_type: string;
  contact_name: string | null;
  phone: string | null;
  gstin: string | null;
  city: string;
  state: string;
  pincode: string;
  created_at: string;
};

export type SimProfile = {
  persona: "cooperative" | "busy" | "hard_bargainer" | "not_interested" | "trader" | "annoyed";
  answer_rate: number; // 0..1
  price_factor: number; // multiplier on market base price
  flex: number; // max discount they will give, 0..0.15
  moq: number;
  lead_days: number;
  gst_style: "plus" | "including" | "unstated";
  freight_style: "included" | "fixed" | "to_pay";
  basis_style: "per_unit" | "per_1000" | "per_kg" | "per_kg_no_count";
  advance_pct: number;
  sample: boolean;
  defect_policy: string | null;
};

export type SupplierVerification = {
  gstin_valid?: boolean;
  gst_status?: GstStatus;
  gst_registered_on?: string | null;
  filing_regular?: boolean | null;
  provider?: string;
  phone_status?: "ok" | "wrong_number";
  checked_at?: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  categories: string[];
  is_manufacturer: boolean | null;
  gstin: string | null;
  udyam: string | null;
  year_established: number | null;
  review_rating: number | null;
  review_count: number | null;
  source: string;
  source_ref: string | null;
  is_demo: boolean;
  do_not_call: boolean;
  verification: SupplierVerification;
  trust_score: number | null;
  trust_band: TrustBand | null;
  trust_ledger: LedgerEntry[];
  verified_at: string | null;
  sim_profile: SimProfile | null;
  created_at: string;
};

export type Brief = {
  id: string;
  buyer_id: string;
  owner_id: string;
  title: string;
  raw_text: string;
  category: string;
  spec: Record<string, string | number | boolean>;
  quantity: number | null;
  unit: Unit;
  frequency: "one_time" | "weekly" | "monthly" | "quarterly";
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_pincode: string | null;
  needed_by: string | null;
  target_unit_price: number | null;
  max_unit_price: number | null;
  current_unit_price: number | null;
  must_haves: string[];
  negotiation: { allowed: boolean; max_rounds: number };
  open_questions: string[];
  status: BriefStatus;
  status_reason: string | null;
  run_no: number;
  max_suppliers: number;
  summary: BriefSummary;
  confirmed_at: string | null;
  shortlisted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BriefSummary = {
  negotiation_round?: number;
  negotiation_targets?: number;
  candidates?: number;
  called?: number;
  quotes?: number;
  eligible?: number;
  /** Landed cost of the top-ranked (recommended) supplier. */
  best_landed?: number | null;
  /** Cheapest eligible landed cost, after negotiation. */
  lowest_landed?: number | null;
  median_landed?: number | null;
  first_best_landed?: number | null;
  savings_per_unit?: number | null;
  savings_basis?: "current_price" | "median_quote" | null;
  savings_total?: number | null;
  market_reference?: number | null;
  note?: string | null;
};

export type BriefSupplierStatus =
  | "candidate" | "excluded" | "queued" | "calling" | "callback" | "quoted" | "declined"
  | "unreachable" | "opted_out" | "shortlisted" | "not_shortlisted" | "selected";

export type BriefSupplier = {
  id: string;
  brief_id: string;
  supplier_id: string;
  run_no: number;
  status: BriefSupplierStatus;
  exclude_reason: string | null;
  match_reason: string | null;
  call_attempts: number;
  next_call_at: string | null;
  score: number | null;
  rank: number | null;
  rank_reasons: string[];
  revealed: boolean;
  created_at: string;
};

export type Turn = { speaker: "agent" | "supplier"; text: string };

export type InteractionOutcome =
  | "quoted" | "callback" | "declined" | "not_supplier" | "wrong_number" | "no_answer"
  | "opted_out" | "improved" | "held" | "failed";

export type Interaction = {
  id: string;
  brief_id: string | null;
  supplier_id: string;
  purpose: "quote" | "negotiation" | "followup";
  channel: "voice" | "whatsapp";
  provider: string;
  provider_ref: string | null;
  status: "scheduled" | "in_progress" | "completed" | "failed";
  outcome: InteractionOutcome | null;
  language: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_s: number | null;
  transcript: Turn[];
  summary: string | null;
  recording_url: string | null;
  cost_inr: number | null;
  ground_truth: Record<string, unknown> | null;
  created_at: string;
};

export type Quote = {
  id: string;
  brief_id: string;
  supplier_id: string;
  interaction_id: string | null;
  version: number;
  is_latest: boolean;
  unit_price: number;
  price_basis: PriceBasis;
  units_per_basis: number | null;
  gst_included: boolean | null;
  gst_rate: number | null;
  moq: number | null;
  lead_time_days: number | null;
  freight_mode: FreightMode;
  freight_amount: number | null;
  setup_cost: number | null;
  sample_available: boolean | null;
  sample_cost: number | null;
  payment_terms: string | null;
  advance_pct: number | null;
  defect_policy: string | null;
  valid_days: number | null;
  gstin_shared: string | null;
  notes: string | null;
  confidence: Record<string, number>;
  needs_confirmation: boolean;
  effective_qty: number | null;
  landed_unit_cost: number | null;
  landed_total: number | null;
  flags: string[];
  computed_at: string | null;
  created_at: string;
};

export type Negotiation = {
  id: string;
  brief_id: string;
  supplier_id: string;
  round: number;
  ask_unit_price: number;
  cited_quote_id: string | null;
  message: string;
  outcome: "improved" | "held" | "declined" | "no_response" | null;
  before_landed: number | null;
  after_landed: number | null;
  interaction_id: string | null;
  created_at: string;
};

export type Outcome = {
  id: string;
  brief_id: string;
  supplier_id: string;
  buyer_id: string;
  ordered: boolean;
  order_value: number | null;
  delivered_on_time: boolean | null;
  quality_ok: boolean | null;
  quote_honoured: boolean | null;
  dispute: boolean;
  notes: string | null;
  created_at: string;
};

export type BriefEvent = {
  id: number;
  brief_id: string;
  kind: string;
  title: string;
  detail: string | null;
  data: Record<string, unknown>;
  actor: "agent" | "buyer" | "ops" | "system";
  created_at: string;
};

export type JobType = "scout" | "vet" | "schedule_calls" | "call" | "extract" | "compare" | "negotiate" | "shortlist";

export type Job = {
  id: string;
  type: JobType;
  brief_id: string | null;
  payload: Record<string, unknown>;
  dedupe_key: string | null;
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  run_at: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
};

export type OpsTask = {
  id: string;
  brief_id: string | null;
  supplier_id: string | null;
  kind: "review_quote" | "review_shortlist" | "needs_attention" | "opt_out";
  ref_id: string | null;
  title: string;
  detail: string | null;
  status: "open" | "resolved";
  created_at: string;
};
