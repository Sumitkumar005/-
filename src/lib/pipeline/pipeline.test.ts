// End-to-end run of the sourcing pipeline on an in-memory database, offline LLM and simulated calls.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "@/test/fake-supabase";

const fake = { current: new FakeDb() };
vi.mock("@/lib/db/admin", () => ({
  db: () => fake.current,
  must: <T,>(res: { data: T | null; error: { message: string } | null }, what: string) => {
    if (res.error) throw new Error(`${what}: ${res.error.message}`);
    return res.data as T;
  },
}));

process.env.LLM_PROVIDER = "mock";
process.env.VOICE_PROVIDER = "simulated";
process.env.SIM_CALL_DELAY_MS = "0";
process.env.MAX_CALL_ATTEMPTS = "2";

const { runJob } = await import("./runner");
const { demoSuppliers } = await import("@/lib/seed/demo-suppliers");
const { parseBrief } = await import("@/lib/agents/brief");

async function drain(db: FakeDb, maxJobs = 500) {
  for (let i = 0; i < maxJobs; i++) {
    // Make every queued job due now (simulated retries are scheduled seconds ahead).
    for (const j of db.t("jobs")) if (j.status === "queued") j.run_at = new Date(Date.now() - 1000).toISOString();
    const { data } = await db.rpc("claim_job", { p_worker: "test" });
    const job = data?.[0];
    if (!job) return i;
    const real = db.t("jobs").find((j) => j.id === job.id)!;
    await runJob(real as never);
  }
  throw new Error("pipeline did not settle");
}

async function setup(text: string, extra: Record<string, unknown> = {}) {
  const db = new FakeDb();
  fake.current = db;
  for (const s of demoSuppliers()) await db.from("suppliers").insert(s);
  const { data: buyer } = await db.from("buyers").insert({ owner_id: "u1", business_name: "Brew Lane Café", business_type: "cafe", city: "Gurugram", state: "Haryana", pincode: "122002" }).select("*").single();
  const draft = await parseBrief(text, { today: "2026-10-29", buyerCity: "Gurugram", buyerPincode: "122002" });
  const { data: brief } = await db
    .from("briefs")
    .insert({ ...draft, buyer_id: buyer.id, owner_id: "u1", raw_text: text, delivery_state: "Haryana", status: "confirmed", ...extra })
    .select("*")
    .single();
  await db.from("jobs").insert({ type: "scout", brief_id: brief.id, dedupe_key: `scout:${brief.id}:1` });
  return { db, briefId: brief.id as string, draft };
}

describe("sourcing pipeline (offline)", () => {
  beforeEach(() => vi.useRealTimers());

  it("parses a Hinglish-ish brief", async () => {
    const { draft } = await setup("Need 5000 printed 250ml single wall paper cups 2 colour logo every month, currently paying Rs 1.6, deliver 122002");
    expect(draft.category).toBe("paper_cup");
    expect(draft.quantity).toBe(5000);
    expect(draft.spec).toMatchObject({ capacity_ml: 250, wall: "single", print: "2 colour" });
    expect(draft.frequency).toBe("monthly");
    expect(draft.current_unit_price).toBe(1.6);
    expect(draft.open_questions).toEqual([]);
  });

  it("runs brief to shortlist with vetting, opt-out, negotiation and savings", async () => {
    const { db, briefId } = await setup("Need 5000 printed 250ml single wall paper cups 2 colour logo every month, currently paying Rs 1.6, deliver 122002");
    await drain(db);

    const brief = db.t("briefs").find((b) => b.id === briefId)!;
    const events = db.t("brief_events").filter((e) => e.brief_id === briefId).map((e) => e.title);
    if (process.env.SHOW_TIMELINE) console.log(db.t("brief_events").map((e) => `${e.title}${e.detail ? `\n     ${e.detail}` : ""}`).join("\n"), JSON.stringify(brief.summary, null, 1));
    const failed = db.t("jobs").filter((j) => j.status === "failed");
    expect(failed.map((j) => `${j.type}: ${j.last_error}`)).toEqual([]);
    expect(brief.status, events.join("\n")).toBe("shortlist_ready");

    const rows = db.t("brief_suppliers").filter((r) => r.brief_id === briefId);
    const by = (name: string) => rows.find((r) => db.t("suppliers").find((s) => s.id === r.supplier_id)!.name.startsWith(name));

    // GST checksum failure is excluded before any call is made
    expect(by("Faridabad Cup Industries")?.status).toBe("excluded");
    // Opt-out is honoured and remembered
    expect(by("Ghaziabad Paperware")?.status).toBe("opted_out");
    expect(db.t("suppliers").find((s) => s.name.startsWith("Ghaziabad Paperware"))!.do_not_call).toBe(true);
    // Busy supplier is called back and then quotes
    expect(by("Noida Eco Cups")?.call_attempts).toBe(2);
    expect(["shortlisted", "not_shortlisted"]).toContain(by("Noida Eco Cups")?.status);
    // Declined supplier
    expect(by("Manesar Cup Co")?.status).toBe("declined");

    const shortlisted = rows.filter((r) => r.status === "shortlisted");
    expect(shortlisted).toHaveLength(3);
    expect(shortlisted.map((r) => r.rank).sort()).toEqual([1, 2, 3]);

    // Per-kg quote without a piece count cannot be compared and is sent to ops
    const mayapuri = db.t("quotes").find((q) => q.is_latest && q.supplier_id === by("Mayapuri Disposables")!.supplier_id)!;
    expect(mayapuri.flags).toContain("unit_not_comparable");
    expect(db.t("ops_tasks").some((t) => t.kind === "review_quote" && t.ref_id === db.t("quotes").find((q) => q.supplier_id === mayapuri.supplier_id && q.version === 1)!.id)).toBe(true);

    // Negotiation happened with real citations only, and at least one supplier improved
    const negs = db.t("negotiations").filter((n) => n.brief_id === briefId);
    expect(negs).toHaveLength(3);
    for (const n of negs.filter((n) => n.cited_quote_id)) {
      expect(db.t("quotes").some((q) => q.id === n.cited_quote_id)).toBe(true);
    }
    expect(negs.some((n) => n.outcome === "improved")).toBe(true);

    // Savings measured against the price the buyer pays today
    expect(brief.summary.savings_basis).toBe("current_price");
    expect(brief.summary.savings_per_unit).toBeGreaterThan(0);
    expect(brief.summary.best_landed).toBeLessThan(1.6);
    expect(brief.summary.lowest_landed).toBeLessThanOrEqual(brief.summary.first_best_landed);

    // Every simulated quote extraction matches the simulator's ground truth on price
    for (const it of db.t("interactions").filter((i) => i.purpose === "quote" && i.outcome === "quoted")) {
      const q = db.t("quotes").find((x) => x.interaction_id === it.id)!;
      expect(Number(q.unit_price)).toBe(it.ground_truth.unit_price);
      expect(q.moq).toBe(it.ground_truth.moq);
    }
    // Price index fed
    expect(db.t("price_points").length).toBeGreaterThan(3);
  });

  it("needs attention when no supplier exists for the category nearby", async () => {
    const { db, briefId } = await setup("Need 200 metres of chanderi silk fabric dyed", { category: "other", spec: { description: "industrial valves" } });
    await drain(db);
    const brief = db.t("briefs").find((b) => b.id === briefId)!;
    expect(brief.status).toBe("needs_attention");
    expect(db.t("ops_tasks").some((t) => t.kind === "needs_attention")).toBe(true);
  });

  it("skips negotiation when the buyer turns it off and stops on cancel", async () => {
    const { db, briefId } = await setup("5000 kraft paper carry bag 10x12 inch 1 colour print", { negotiation: { allowed: false, max_rounds: 0 } });
    await drain(db);
    expect(db.t("negotiations")).toHaveLength(0);
    expect(db.t("briefs")[0].status).toBe("shortlist_ready");

    const second = await setup("Need 5000 printed 250ml single wall paper cups 2 colour logo");
    await second.db.from("briefs").update({ status: "cancelled" }).eq("id", second.briefId);
    await drain(second.db);
    expect(second.db.t("interactions")).toHaveLength(0);
    expect(second.db.t("jobs").every((j) => j.status === "cancelled")).toBe(true);
    void briefId;
  });
});

describe("re-compare after an ops correction", () => {
  it("moves back to a fresh shortlist", async () => {
    const { db, briefId } = await setup("Need 5000 printed 250ml single wall paper cups 2 colour logo every month, currently paying Rs 1.6, deliver 122002");
    await drain(db);
    const brief = db.t("briefs").find((b) => b.id === briefId)!;
    expect(brief.status).toBe("shortlist_ready");
    // Simulate what /api/ops/quotes/[id] does
    const q = db.t("quotes").find((x) => x.is_latest && x.flags.includes("unit_not_comparable"))!;
    Object.assign(q, { units_per_basis: 150, needs_confirmation: false });
    await db.from("jobs").insert({ type: "compare", brief_id: briefId, payload: { round: 1, final: true }, dedupe_key: `compare:${briefId}:fix:1` });
    await drain(db);
    expect(db.t("briefs").find((b) => b.id === briefId)!.status).toBe("shortlist_ready");
    expect(db.t("quotes").find((x) => x.id === q.id)!.landed_unit_cost).toBeGreaterThan(0);
  });
});
