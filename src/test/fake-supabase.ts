// In-memory stand-in for the subset of supabase-js the pipeline uses, so the whole sourcing
// pipeline can be exercised in tests without a database. Mirrors our unique indexes and defaults.

import { randomUUID } from "node:crypto";

type Row = Record<string, any>;
type Filter = (r: Row) => boolean;

const DEFAULTS: Record<string, () => Row> = {
  briefs: () => ({ status: "draft", run_no: 1, max_suppliers: 12, summary: {}, must_haves: [], open_questions: [], negotiation: { allowed: true, max_rounds: 1 }, spec: {}, unit: "pieces", frequency: "one_time", raw_text: "", title: "Untitled brief", category: "other" }),
  brief_suppliers: () => ({ status: "candidate", run_no: 1, call_attempts: 0, rank_reasons: [], revealed: false, score: null, rank: null, exclude_reason: null, next_call_at: null }),
  suppliers: () => ({ categories: [], is_demo: false, do_not_call: false, verification: {}, trust_ledger: [], trust_score: null, trust_band: null, sim_profile: null, gstin: null, is_manufacturer: null, review_rating: null, review_count: null, year_established: null, state: null, pincode: null, city: null }),
  interactions: () => ({ purpose: "quote", channel: "voice", status: "scheduled", transcript: [], outcome: null, provider_ref: null, ground_truth: null }),
  quotes: () => ({ version: 1, is_latest: true, flags: [], confidence: {}, needs_confirmation: false, freight_mode: "unknown", price_basis: "per_unit", landed_unit_cost: null, landed_total: null, effective_qty: null, valid_days: null, units_per_basis: null, gst_included: null, gst_rate: null, moq: null, lead_time_days: null, freight_amount: null, setup_cost: null, advance_pct: null, sample_available: null }),
  jobs: () => ({ status: "queued", attempts: 0, max_attempts: 3, payload: {}, run_at: new Date().toISOString(), dedupe_key: null, locked_by: null, locked_at: null, last_error: null }),
  ops_tasks: () => ({ status: "open" }),
  brief_events: () => ({ actor: "agent", data: {}, detail: null }),
  negotiations: () => ({}),
  outcomes: () => ({ dispute: false }),
  price_points: () => ({ observed_at: new Date().toISOString() }),
  buyers: () => ({}),
};

/** Unique constraints, optionally partial (where). */
const UNIQUE: Record<string, { cols: string[]; where?: Filter }[]> = {
  jobs: [{ cols: ["dedupe_key"], where: (r) => r.dedupe_key != null }],
  brief_suppliers: [{ cols: ["brief_id", "supplier_id"] }],
  quotes: [{ cols: ["brief_id", "supplier_id"], where: (r) => r.is_latest }],
  negotiations: [{ cols: ["brief_id", "supplier_id", "round"] }],
  outcomes: [{ cols: ["brief_id", "supplier_id"] }],
  price_points: [{ cols: ["quote_id"] }],
  suppliers: [{ cols: ["phone"], where: (r) => r.phone != null }, { cols: ["gstin"], where: (r) => r.gstin != null }],
  buyers: [{ cols: ["owner_id"] }],
};

const get = (r: Row, col: string) => {
  const m = col.match(/^(\w+)->>(\w+)$/);
  if (m) return r[m[1]]?.[m[2]] != null ? String(r[m[1]][m[2]]) : null;
  return r[col];
};

export class FakeDb {
  tables: Record<string, Row[]> = {};
  private eventId = 0;
  t(name: string) {
    return (this.tables[name] ??= []);
  }
  from(name: string) {
    return new Query(this, name);
  }
  async rpc(fn: string, _args: Row) {
    if (fn !== "claim_job") return { data: null, error: { message: `unknown rpc ${fn}` } };
    const now = Date.now();
    const due = this.t("jobs").filter((j) => j.status === "queued" && new Date(j.run_at).getTime() <= now).sort((a, b) => a.run_at.localeCompare(b.run_at));
    const j = due[0];
    if (!j) return { data: [], error: null };
    j.status = "running";
    j.attempts += 1;
    return { data: [structuredClone(j)], error: null };
  }
  violates(table: string, row: Row, ignore?: Row): boolean {
    for (const u of UNIQUE[table] ?? []) {
      if (u.where && !u.where(row)) continue;
      const clash = this.t(table).some((o) => o !== ignore && (!u.where || u.where(o)) && u.cols.every((c) => o[c] === row[c]));
      if (clash) return true;
    }
    return false;
  }
  conflictRow(table: string, row: Row, cols: string[]): Row | undefined {
    return this.t(table).find((o) => cols.every((c) => o[c] === row[c]));
  }
  newRow(table: string, row: Row): Row {
    const base = DEFAULTS[table]?.() ?? {};
    const now = new Date().toISOString();
    const id = table === "brief_events" ? ++this.eventId : randomUUID();
    return { id, created_at: now, updated_at: now, ...base, ...structuredClone(row) };
  }
}

class Query implements PromiseLike<{ data: any; error: any }> {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private filters: Filter[] = [];
  private payload: Row | Row[] | null = null;
  private upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  private mode: "many" | "single" | "maybe" = "many";
  private limitN: number | null = null;
  private orderBy: { col: string; asc: boolean } | null = null;
  constructor(private db: FakeDb, private table: string) {}

  select(_cols?: string) {
    return this;
  }
  insert(p: Row | Row[]) {
    this.op = "insert";
    this.payload = p;
    return this;
  }
  update(p: Row) {
    this.op = "update";
    this.payload = p;
    return this;
  }
  upsert(p: Row | Row[], opts: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = "upsert";
    this.payload = p;
    this.upsertOpts = opts;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(col: string, v: unknown) {
    this.filters.push((r) => get(r, col) === v);
    return this;
  }
  neq(col: string, v: unknown) {
    this.filters.push((r) => get(r, col) !== v);
    return this;
  }
  in(col: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(get(r, col)));
    return this;
  }
  contains(col: string, vs: unknown[]) {
    this.filters.push((r) => vs.every((v) => (r[col] ?? []).includes(v)));
    return this;
  }
  not(col: string, op: string, v: unknown) {
    if (op === "is" && v === null) this.filters.push((r) => r[col] != null);
    return this;
  }
  is(col: string, v: unknown) {
    this.filters.push((r) => (v === null ? r[col] == null : r[col] === v));
    return this;
  }
  gte(col: string, v: string | number) {
    this.filters.push((r) => r[col] >= v);
    return this;
  }
  lte(col: string, v: string | number) {
    this.filters.push((r) => r[col] <= v);
    return this;
  }
  order(col: string, opts: { ascending?: boolean } = {}) {
    this.orderBy = { col, asc: opts.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }

  then<A, B>(ok?: ((v: { data: any; error: any }) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve(this.run()).then(ok, bad);
  }

  private matches(): Row[] {
    let rows = this.db.t(this.table).filter((r) => this.filters.every((f) => f(r)));
    if (this.orderBy) {
      const { col, asc } = this.orderBy;
      rows = [...rows].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1));
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    return rows;
  }

  private shape(rows: Row[]) {
    const out = structuredClone(rows);
    if (this.mode === "single") {
      if (out.length !== 1) return { data: null, error: { message: `expected 1 row, got ${out.length}`, code: "PGRST116" } };
      return { data: out[0], error: null };
    }
    if (this.mode === "maybe") return { data: out[0] ?? null, error: null };
    return { data: out, error: null };
  }

  private run(): { data: any; error: any } {
    const t = this.db.t(this.table);
    switch (this.op) {
      case "select":
        return this.shape(this.matches());
      case "insert": {
        const rows = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map((p) => this.db.newRow(this.table, p));
        for (const r of rows) {
          if (this.db.violates(this.table, r)) return { data: null, error: { message: "duplicate key value violates unique constraint", code: "23505" } };
          t.push(r);
        }
        return this.shape(rows);
      }
      case "upsert": {
        const cols = (this.upsertOpts.onConflict ?? "id").split(",").map((c) => c.trim());
        const out: Row[] = [];
        for (const p of Array.isArray(this.payload) ? this.payload : [this.payload!]) {
          const existing = cols.every((c) => p[c] != null) ? this.db.conflictRow(this.table, p, cols) : undefined;
          if (existing) {
            if (!this.upsertOpts.ignoreDuplicates) Object.assign(existing, structuredClone(p));
            out.push(existing);
          } else {
            const r = this.db.newRow(this.table, p);
            if (this.db.violates(this.table, r)) return { data: null, error: { message: "duplicate key", code: "23505" } };
            t.push(r);
            out.push(r);
          }
        }
        return this.shape(out);
      }
      case "update": {
        const rows = this.matches();
        for (const r of rows) {
          const next = { ...r, ...structuredClone(this.payload as Row), updated_at: new Date().toISOString() };
          if (this.db.violates(this.table, next, r)) return { data: null, error: { message: "duplicate key", code: "23505" } };
          Object.assign(r, next);
        }
        return this.shape(rows);
      }
      case "delete": {
        const rows = this.matches();
        this.db.tables[this.table] = t.filter((r) => !rows.includes(r));
        return this.shape(rows);
      }
    }
  }
}
