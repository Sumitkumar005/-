// The sourcing pipeline. One job per step; each step is safe to re-run.
// scout -> vet -> schedule_calls -> call (per supplier) -> extract -> compare -> negotiate -> compare -> shortlist

import { db, must } from "@/lib/db/admin";
import type { Brief, BriefSupplier, Interaction, Job, JobType, Quote, Supplier, Turn } from "@/lib/db/types";
import { env } from "@/lib/env";
import { describeSpec, getCategory, specKey } from "@/lib/domain/categories";
import { PROXIMITY_LABEL, PROXIMITY_RANK, proximity } from "@/lib/domain/geo";
import { isCallingWindow, nextCallingSlot, scheduleSlots } from "@/lib/domain/hours";
import { computeLanded, FLAG_LABEL, normaliseGstRate, pricePerBuyerUnit, round, type QuoteTerms } from "@/lib/domain/landed-cost";
import { counterTemplate, messageCitesOnly, planCounter } from "@/lib/domain/negotiation";
import { median, rankQuotes } from "@/lib/domain/ranking";
import { checkGstin } from "@/lib/domain/gstin";
import { buildCallScript } from "@/lib/agents/call-script";
import { extractCounterReply, extractQuote, type Extraction } from "@/lib/agents/extract";
import { startCall } from "@/lib/voice/provider";
import { counterReplyTranscript, defaultSimProfile, simulateCounter } from "@/lib/voice/simulate";
import { discoverFromPlaces } from "@/lib/discovery/google-places";
import { formatINR } from "@/lib/format";
import { enqueue, getBrief, getBuyer, getSupplier, logEvent, needsAttention, openOpsTask, patchSummary, setStatus } from "./repo";
import { refreshTrust } from "./trust-service";

export type StepResult = void | { rescheduleAt: Date };
type Handler = (job: Job, brief: Brief) => Promise<StepResult>;

const SHORTLIST_SIZE = 3;
const PENDING: BriefSupplier["status"][] = ["queued", "calling", "callback"];

const isSim = () => env.voiceProvider === "simulated";
const unitWord = (b: Brief) => (b.unit === "pieces" ? "piece" : b.unit.replace(/s$/, ""));

async function briefSuppliers(briefId: string, filter: { run?: number; status?: BriefSupplier["status"][] } = {}): Promise<BriefSupplier[]> {
  let q = db().from("brief_suppliers").select("*").eq("brief_id", briefId);
  if (filter.run) q = q.eq("run_no", filter.run);
  if (filter.status) q = q.in("status", filter.status);
  return must(await q, "load brief suppliers") as BriefSupplier[];
}

async function updateBs(id: string, patch: Partial<BriefSupplier>) {
  must(await db().from("brief_suppliers").update(patch).eq("id", id).select("id"), "update brief supplier");
}

async function latestQuotes(briefId: string): Promise<Quote[]> {
  return must(await db().from("quotes").select("*").eq("brief_id", briefId).eq("is_latest", true), "load quotes") as Quote[];
}

function quoteTerms(q: Quote): QuoteTerms {
  return {
    unitPrice: Number(q.unit_price),
    priceBasis: q.price_basis,
    unitsPerBasis: q.units_per_basis,
    gstIncluded: q.gst_included,
    gstRate: q.gst_rate,
    moq: q.moq,
    leadTimeDays: q.lead_time_days,
    freightMode: q.freight_mode,
    freightAmount: q.freight_amount,
    setupCost: q.setup_cost,
    advancePct: q.advance_pct,
    sampleAvailable: q.sample_available,
    needsConfirmation: q.needs_confirmation,
  };
}

function briefTerms(b: Brief) {
  return {
    quantity: Number(b.quantity ?? 0),
    unit: b.unit,
    defaultGstRate: getCategory(b.category).gstRate,
    neededBy: b.needed_by,
    maxUnitPrice: b.max_unit_price,
  };
}

// ---------------------------------------------------------------------------
// 1. Scout: pick candidate suppliers near the buyer
// ---------------------------------------------------------------------------
const scout: Handler = async (_job, brief) => {
  brief = (await setStatus(brief, "scouting")) ?? brief;
  const already = new Set((await briefSuppliers(brief.id)).map((b) => b.supplier_id));
  const widened = brief.run_no > 1;

  const fetchPool = async () =>
    (must(
      await db().from("suppliers").select("*").contains("categories", [brief.category]).eq("do_not_call", false).not("phone", "is", null).limit(1000),
      "load suppliers",
    ) as Supplier[]).filter((s) => !already.has(s.id) && s.verification?.phone_status !== "wrong_number");

  const near = (pool: Supplier[]) =>
    pool
      .map((s) => ({ s, p: proximity({ pincode: brief.delivery_pincode, state: brief.delivery_state }, s) }))
      .filter((x) => widened || x.p !== "national");

  let pool = await fetchPool();
  let candidates = near(pool);
  if (candidates.length < 5 && env.googlePlacesKey) {
    const added = await discoverFromPlaces(brief.category, { pincode: brief.delivery_pincode, city: brief.delivery_city });
    if (added) {
      await logEvent(brief.id, "discovery", `Found ${added} new suppliers on Google Maps`);
      pool = await fetchPool();
      candidates = near(pool);
    }
  }
  // Too few nearby: allow other states rather than give up.
  if (candidates.length < 3 && !widened) {
    candidates = pool.map((s) => ({ s, p: proximity({ pincode: brief.delivery_pincode, state: brief.delivery_state }, s) }));
  }

  candidates.sort(
    (a, b) =>
      PROXIMITY_RANK[a.p] - PROXIMITY_RANK[b.p] ||
      (b.s.trust_score ?? 70) - (a.s.trust_score ?? 70) ||
      Number(b.s.is_manufacturer ?? 0) - Number(a.s.is_manufacturer ?? 0),
  );
  const take = widened ? Math.min(8, brief.max_suppliers) : brief.max_suppliers;
  const picked = candidates.slice(0, take);

  if (picked.length === 0) {
    if (widened) {
      await logEvent(brief.id, "scout", "No new suppliers found beyond the ones already contacted");
      await enqueue("compare", brief.id, { round: brief.summary.negotiation_round ?? 0, final: true }, { dedupeKey: `compare:${brief.id}:${brief.run_no}:final` });
      return;
    }
    await needsAttention(
      brief,
      `No ${getCategory(brief.category).label.toLowerCase()} suppliers in our network yet`,
      "Ops: add suppliers for this category and area (CSV import or manual), then retry the brief.",
    );
    return;
  }

  must(
    await db()
      .from("brief_suppliers")
      .upsert(
        picked.map(({ s, p }) => ({
          brief_id: brief.id,
          supplier_id: s.id,
          run_no: brief.run_no,
          status: "candidate",
          match_reason: `${PROXIMITY_LABEL[p]}${s.city ? `, ${s.city}` : ""}`,
        })),
        { onConflict: "brief_id,supplier_id", ignoreDuplicates: true },
      )
      .select("id"),
    "insert candidates",
  );

  const byProx = picked.reduce<Record<string, number>>((acc, { p }) => ((acc[PROXIMITY_LABEL[p]] = (acc[PROXIMITY_LABEL[p]] ?? 0) + 1), acc), {});
  await patchSummary(brief, { candidates: already.size + picked.length });
  await logEvent(brief.id, "scout", `Shortlisted ${picked.length} suppliers to call`, {
    detail: Object.entries(byProx).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(", "),
  });
  await enqueue("vet", brief.id, {}, { dedupeKey: `vet:${brief.id}:${brief.run_no}` });
};

// ---------------------------------------------------------------------------
// 2. Vet: GST identity and history before we spend a call
// ---------------------------------------------------------------------------
const vet: Handler = async (_job, brief) => {
  brief = (await setStatus(brief, "vetting")) ?? brief;
  const rows = await briefSuppliers(brief.id, { run: brief.run_no, status: ["candidate"] });
  let passed = 0;
  const blocked: string[] = [];
  for (const row of rows) {
    const s = await getSupplier(row.supplier_id);
    const { trust } = await refreshTrust(s);
    if (trust.band === "blocked") {
      const why = trust.ledger.find((e) => e.points <= -60)?.label ?? "Failed verification";
      await updateBs(row.id, { status: "excluded", exclude_reason: why });
      blocked.push(s.name);
    } else if (s.do_not_call) {
      await updateBs(row.id, { status: "excluded", exclude_reason: "Asked not to be called" });
    } else passed++;
  }
  await logEvent(brief.id, "vet", `Checked ${rows.length} suppliers: ${passed} cleared for calls`, {
    detail: blocked.length ? `Skipped ${blocked.length} that failed GST checks: ${blocked.join(", ")}` : "GSTIN format, checksum and state checked for each.",
  });
  if (passed === 0) {
    const anyQuotes = (await latestQuotes(brief.id)).length > 0;
    if (anyQuotes) {
      await enqueue("compare", brief.id, { round: brief.summary.negotiation_round ?? 0, final: true }, { dedupeKey: `compare:${brief.id}:${brief.run_no}:final` });
      return;
    }
    await needsAttention(brief, "Every supplier found failed verification", "Ops: add verified suppliers for this category, then retry.");
    return;
  }
  await enqueue("schedule_calls", brief.id, {}, { dedupeKey: `schedule:${brief.id}:${brief.run_no}` });
};

// ---------------------------------------------------------------------------
// 3. Schedule calls inside calling hours, max one call per supplier per day
// ---------------------------------------------------------------------------
const scheduleCalls: Handler = async (_job, brief) => {
  brief = (await setStatus(brief, "calling")) ?? brief;
  const rows = await briefSuppliers(brief.id, { run: brief.run_no, status: ["candidate"] });
  const now = new Date();
  let slots: Date[];
  if (env.respectCallingHours) slots = scheduleSlots(now, rows.length, 2);
  else slots = rows.map((_, i) => new Date(now.getTime() + i * 400));

  let deferred = 0;
  for (let i = 0; i < rows.length; i++) {
    let at = slots[i];
    if (env.respectCallingHours) {
      const { data } = await db()
        .from("interactions")
        .select("created_at")
        .eq("supplier_id", rows[i].supplier_id)
        .gte("created_at", new Date(now.getTime() - 20 * 3600_000).toISOString())
        .limit(1);
      if (data?.length) {
        at = nextCallingSlot(new Date(now.getTime() + 20 * 3600_000));
        deferred++;
      }
    }
    await updateBs(rows[i].id, { status: "queued", next_call_at: at.toISOString() });
    await enqueue("call", brief.id, { briefSupplierId: rows[i].id, supplierId: rows[i].supplier_id, attempt: 1 }, { runAt: at, dedupeKey: `call:${brief.id}:${rows[i].supplier_id}:1` });
  }
  const firstAt = slots[0];
  const later = env.respectCallingHours && firstAt.getTime() - now.getTime() > 5 * 60_000;
  await logEvent(brief.id, "calls_scheduled", `Calling ${rows.length} suppliers${isSim() ? " (simulated calls)" : ""}`, {
    detail: [
      later ? `Outside calling hours. First call at ${firstAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", hour: "numeric", minute: "2-digit" })} IST.` : "Calls are going out now.",
      deferred ? `${deferred} supplier${deferred > 1 ? "s were" : " was"} called recently for another buyer, so we wait a day to avoid spamming them.` : "",
    ].filter(Boolean).join(" "),
  });
};

// ---------------------------------------------------------------------------
// 4. Call one supplier
// ---------------------------------------------------------------------------
const call: Handler = async (job, brief) => {
  const { briefSupplierId, attempt } = job.payload as { briefSupplierId: string; attempt: number };
  const bs = must(await db().from("brief_suppliers").select("*").eq("id", briefSupplierId).single(), "load brief supplier") as BriefSupplier;
  if (!PENDING.includes(bs.status)) return; // already handled (e.g. opted out via another brief)
  const supplier = await getSupplier(bs.supplier_id);
  if (supplier.do_not_call) {
    await updateBs(bs.id, { status: "opted_out" });
    return maybeAdvanceAfterCalls(brief);
  }
  if (env.respectCallingHours && !isCallingWindow(new Date())) return { rescheduleAt: nextCallingSlot(new Date()) };

  const buyer = await getBuyer(brief.buyer_id);
  await updateBs(bs.id, { status: "calling", call_attempts: bs.call_attempts + 1 });
  const interaction = must(
    await db()
      .from("interactions")
      .insert({ brief_id: brief.id, supplier_id: supplier.id, purpose: "quote", channel: "voice", provider: env.voiceProvider, status: "in_progress", language: "hinglish", started_at: new Date().toISOString() })
      .select("*")
      .single(),
    "create interaction",
  ) as Interaction;

  try {
    const script = buildCallScript(brief, buyer, supplier);
    const res = await startCall({ interactionId: interaction.id, brief, buyer, supplier, attempt, script });
    if (res.mode === "pending") {
      must(await db().from("interactions").update({ provider_ref: res.providerRef }).eq("id", interaction.id).select("id"), "save provider ref");
      // Safety net: if the provider never reports back, treat it as no answer.
      await enqueue("extract", brief.id, { interactionId: interaction.id, briefSupplierId: bs.id, attempt, timeoutCheck: true }, { runAt: new Date(Date.now() + 20 * 60_000), dedupeKey: `timeout:${interaction.id}` });
      return;
    }
    must(
      await db()
        .from("interactions")
        .update({
          status: "completed",
          transcript: res.turns,
          duration_s: res.durationS,
          cost_inr: res.costInr,
          ground_truth: res.groundTruth ?? null,
          ended_at: new Date().toISOString(),
        })
        .eq("id", interaction.id)
        .select("id"),
      "save call",
    );
    await enqueue("extract", brief.id, { interactionId: interaction.id, briefSupplierId: bs.id, attempt }, { dedupeKey: `extract:${interaction.id}` });
  } catch (e) {
    must(
      await db().from("interactions").update({ status: "failed", outcome: "failed", summary: (e as Error).message.slice(0, 300), ended_at: new Date().toISOString() }).eq("id", interaction.id).select("id"),
      "mark call failed",
    );
    await handleNoQuote(brief, bs, supplier, attempt, "failed", 1);
  }
};

// ---------------------------------------------------------------------------
// 5. Extract the quote from the transcript and act on the outcome
// ---------------------------------------------------------------------------
const extract: Handler = async (job, brief) => {
  const { interactionId, briefSupplierId, attempt, timeoutCheck } = job.payload as { interactionId: string; briefSupplierId: string; attempt: number; timeoutCheck?: boolean };
  const it = must(await db().from("interactions").select("*").eq("id", interactionId).single(), "load interaction") as Interaction;
  if (it.outcome) return; // already processed
  const bs = must(await db().from("brief_suppliers").select("*").eq("id", briefSupplierId).single(), "load brief supplier") as BriefSupplier;
  const supplier = await getSupplier(bs.supplier_id);

  if (timeoutCheck) {
    // A completed call has its own extract job; this one only rescues calls that never reported back.
    if (it.status === "completed") return;
    must(await db().from("interactions").update({ status: "failed", outcome: "no_answer", summary: "Provider did not report back in time" }).eq("id", it.id).select("id"), "timeout call");
    return handleNoQuote(brief, bs, supplier, attempt, "no_answer");
  }
  if (it.status !== "completed") return;

  const cat = getCategory(brief.category);
  const ex = await extractQuote(it.transcript as Turn[], { product: `${cat.label} (${describeSpec(brief.category, brief.spec)})`, unit: brief.unit });
  must(await db().from("interactions").update({ outcome: ex.outcome, summary: ex.summary }).eq("id", it.id).select("id"), "save outcome");

  switch (ex.outcome) {
    case "quoted":
      await saveQuote(brief, bs, supplier, it, ex);
      break;
    case "opted_out":
      must(await db().from("suppliers").update({ do_not_call: true, do_not_call_at: new Date().toISOString() }).eq("id", supplier.id).select("id"), "opt out");
      await updateBs(bs.id, { status: "opted_out" });
      await db().from("jobs").update({ status: "cancelled" }).eq("type", "call").eq("status", "queued").eq("payload->>supplierId", supplier.id);
      await openOpsTask({ brief_id: brief.id, supplier_id: supplier.id, kind: "opt_out", title: `${supplier.name} asked not to be called again`, detail: "Number removed from all future calls." });
      await logEvent(brief.id, "call", `${supplier.name} asked not to be called. Removed from our list.`);
      break;
    case "declined":
      await updateBs(bs.id, { status: "declined" });
      await logEvent(brief.id, "call", `${supplier.name} is not taking this order`, { detail: ex.summary });
      break;
    case "not_supplier":
      await updateBs(bs.id, { status: "declined", exclude_reason: "Does not supply this item" });
      await db().from("suppliers").update({ categories: supplier.categories.filter((c) => c !== brief.category) }).eq("id", supplier.id);
      await logEvent(brief.id, "call", `${supplier.name} does not make this item. Directory updated.`);
      break;
    case "wrong_number":
      await updateBs(bs.id, { status: "unreachable", exclude_reason: "Wrong number" });
      await db().from("suppliers").update({ verification: { ...supplier.verification, phone_status: "wrong_number" } }).eq("id", supplier.id);
      await logEvent(brief.id, "call", `Wrong number for ${supplier.name}. Flagged for ops.`);
      break;
    case "callback":
    case "no_answer":
      return handleNoQuote(brief, bs, supplier, attempt, ex.outcome, ex.callback_after_hours);
  }
  await maybeAdvanceAfterCalls(brief);
};

async function handleNoQuote(brief: Brief, bs: BriefSupplier, supplier: Supplier, attempt: number, outcome: string, afterHours?: number | null) {
  if (attempt < env.maxCallAttempts) {
    const delayMs = isSim() && !env.respectCallingHours ? 3000 : Math.max(1, Math.min(48, afterHours ?? 3)) * 3600_000;
    let at = new Date(Date.now() + delayMs);
    if (env.respectCallingHours) at = nextCallingSlot(at);
    await updateBs(bs.id, { status: "callback", next_call_at: at.toISOString() });
    await enqueue("call", brief.id, { briefSupplierId: bs.id, supplierId: supplier.id, attempt: attempt + 1 }, { runAt: at, dedupeKey: `call:${brief.id}:${supplier.id}:${attempt + 1}` });
    await logEvent(brief.id, "call", `${supplier.name}: ${outcome === "callback" ? "asked us to call back" : outcome === "failed" ? "call failed" : "no answer"}. Will try again.`);
    return;
  }
  await updateBs(bs.id, { status: "unreachable" });
  await logEvent(brief.id, "call", `${supplier.name}: could not get a quote after ${attempt} attempts`);
  await maybeAdvanceAfterCalls(brief);
}

async function saveQuote(brief: Brief, bs: BriefSupplier, supplier: Supplier, it: Interaction, ex: Extraction) {
  const q = ex.quote;
  const cat = getCategory(brief.category);

  // Learn about the supplier from the call.
  const patch: Partial<Supplier> = {};
  if (ex.is_manufacturer != null && supplier.is_manufacturer == null) patch.is_manufacturer = ex.is_manufacturer;
  if (q.gstin && !supplier.gstin && checkGstin(q.gstin).valid) patch.gstin = q.gstin;
  if (Object.keys(patch).length) {
    const { error } = await db().from("suppliers").update(patch).eq("id", supplier.id);
    if (error?.code === "23505") await logEvent(brief.id, "vet", `${supplier.name} shared a GSTIN already used by another supplier. Flagged for ops.`);
  }
  let fresh = await getSupplier(supplier.id);
  if (patch.gstin) fresh = (await refreshTrust(fresh)).supplier;

  const conversionMissing = (q.price_basis === "per_kg" && cat.unit !== "kg" && !q.units_per_basis) || ((q.price_basis === "per_box" || q.price_basis === "lot") && !q.units_per_basis);
  const needsConfirmation = ex.confidence.price < 0.7 || conversionMissing;

  must(await db().from("quotes").update({ is_latest: false }).eq("brief_id", brief.id).eq("supplier_id", supplier.id).eq("is_latest", true).select("id"), "retire old quote");
  const quote = must(
    await db()
      .from("quotes")
      .insert({
        brief_id: brief.id,
        supplier_id: supplier.id,
        interaction_id: it.id,
        version: 1,
        unit_price: q.unit_price,
        price_basis: q.price_basis,
        units_per_basis: q.units_per_basis,
        gst_included: q.gst_included,
        gst_rate: normaliseGstRate(q.gst_rate_percent),
        moq: q.moq,
        lead_time_days: q.lead_time_days,
        freight_mode: q.freight_mode,
        freight_amount: q.freight_amount,
        setup_cost: q.setup_cost,
        sample_available: q.sample_available,
        sample_cost: q.sample_cost,
        payment_terms: q.payment_terms,
        advance_pct: q.advance_pct,
        defect_policy: q.defect_policy,
        valid_days: q.valid_days,
        gstin_shared: q.gstin,
        notes: ex.summary,
        confidence: ex.confidence,
        needs_confirmation: needsConfirmation,
      })
      .select("*")
      .single(),
    "save quote",
  ) as Quote;

  await updateBs(bs.id, { status: "quoted" });
  if (needsConfirmation) {
    await openOpsTask({
      brief_id: brief.id,
      supplier_id: supplier.id,
      kind: "review_quote",
      ref_id: quote.id,
      title: `Confirm ${fresh.name}'s quote`,
      detail: conversionMissing ? "Price given per kg/box without a piece count. Ask how many pieces per kg/box." : "Price was not stated clearly on the call. Listen to the recording and correct the quote.",
    });
  }
  const pu = pricePerBuyerUnit({ unitPrice: Number(quote.unit_price), priceBasis: quote.price_basis, unitsPerBasis: quote.units_per_basis }, brief.unit);
  await logEvent(brief.id, "quote", `${fresh.name} quoted ${pu != null ? `${formatINR(pu, { unit: true })} per ${unitWord(brief)}` : `₹${quote.unit_price} ${quote.price_basis.replace("_", " ")}`}`, {
    detail: ex.summary,
    data: { supplierId: supplier.id, quoteId: quote.id },
  });
}

async function maybeAdvanceAfterCalls(brief: Brief) {
  const pending = await briefSuppliers(brief.id, { run: brief.run_no, status: PENDING });
  if (pending.length > 0) return;
  const fresh = (await getBrief(brief.id)) ?? brief;
  const round = fresh.summary.negotiation_round ?? 0;
  await enqueue("compare", brief.id, { round }, { dedupeKey: `compare:${brief.id}:${brief.run_no}:r${round}` });
}

// ---------------------------------------------------------------------------
// 6. Compare like for like, then negotiate or shortlist
// ---------------------------------------------------------------------------
const compare: Handler = async (job, brief) => {
  const round = Number((job.payload as { round?: number }).round ?? 0);
  brief = (await setStatus(brief, "comparing")) ?? brief;
  if (brief.status !== "comparing") return;

  const quotes = await latestQuotes(brief.id);
  const rows = await briefSuppliers(brief.id);
  const supplierIds = quotes.map((q) => q.supplier_id);
  const suppliers = supplierIds.length
    ? (must(await db().from("suppliers").select("*").in("id", supplierIds), "load suppliers") as Supplier[])
    : [];
  const byId = new Map(suppliers.map((s) => [s.id, s]));

  const now = new Date();
  const computed = await Promise.all(
    quotes.map(async (q) => {
      const r = computeLanded(quoteTerms(q), briefTerms(brief), now);
      const flags = [...r.flags];
      if (q.valid_days && new Date(q.created_at).getTime() + q.valid_days * 86_400_000 < now.getTime()) flags.push("quote_expired");
      const patch = r.comparable
        ? { effective_qty: r.effectiveQty, landed_unit_cost: r.landedUnit, landed_total: r.landedTotal, flags, computed_at: now.toISOString() }
        : { effective_qty: null, landed_unit_cost: null, landed_total: null, flags, computed_at: now.toISOString() };
      must(await db().from("quotes").update(patch).eq("id", q.id).select("id"), "save landed cost");
      return { q, r, flags };
    }),
  );

  const { ranked, stats } = rankQuotes(
    computed.map(({ q, r, flags }) => {
      const s = byId.get(q.supplier_id);
      return {
        supplierId: q.supplier_id,
        name: s?.name ?? "Supplier",
        comparable: r.comparable,
        landedUnit: r.comparable ? r.landedUnit : null,
        trustScore: s?.trust_score ?? 70,
        trustBand: s?.trust_band ?? "check",
        leadTimeDays: q.lead_time_days,
        flags,
      };
    }),
    SHORTLIST_SIZE,
  );

  for (const rk of ranked) {
    const row = rows.find((r) => r.supplier_id === rk.supplierId);
    if (row) await updateBs(row.id, { score: rk.score, rank: rk.rank, rank_reasons: rk.reasons });
    const q = computed.find((c) => c.q.supplier_id === rk.supplierId)!;
    const extra = rk.flags.filter((f) => !q.flags.includes(f));
    if (extra.length) must(await db().from("quotes").update({ flags: [...q.flags, ...extra] }).eq("id", q.q.id).select("id"), "save rank flags");
  }

  // Feed the price index. One point per comparable quote.
  const key = specKey(brief.category, brief.spec);
  const points = computed
    .filter((c) => c.r.comparable)
    .map((c) => ({ category: brief.category, spec_key: key, brief_id: brief.id, state: brief.delivery_state, quantity: brief.quantity, landed_unit_cost: c.r.comparable ? c.r.landedUnit : 0, quote_id: c.q.id }));
  if (points.length) await db().from("price_points").upsert(points, { onConflict: "quote_id" });

  const eligible = ranked.filter((r) => r.eligible);
  const outcomes = rows.reduce<Record<string, number>>((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {});
  const called = rows.filter((r) => !["candidate", "excluded"].includes(r.status)).length;
  await patchSummary(brief, {
    called,
    quotes: quotes.length,
    eligible: eligible.length,
    best_landed: eligible[0]?.landedUnit ?? null,
    lowest_landed: eligible.length ? Math.min(...eligible.map((e) => e.landedUnit!)) : null,
    median_landed: stats?.median ?? null,
    ...(round === 0 ? { first_best_landed: eligible.length ? Math.min(...eligible.map((e) => e.landedUnit!)) : null } : {}),
  });

  await logEvent(brief.id, "compare", `Compared ${quotes.length} quote${quotes.length === 1 ? "" : "s"} like for like`, {
    detail: stats
      ? `Landed cost per ${unitWord(brief)} (GST and delivery included) ranges ${formatINR(stats.min, { unit: true })} to ${formatINR(stats.max, { unit: true })}. ${eligible.length} meet your needs.`
      : "No comparable prices yet.",
    data: { outcomes },
  });

  if (eligible.length === 0) {
    const notComparable = computed.filter((c) => !c.r.comparable).length;
    await needsAttention(
      brief,
      quotes.length === 0 ? "No supplier gave a usable quote" : "No quote could be recommended",
      [
        `${called} called: ${Object.entries(outcomes).map(([k, v]) => `${v} ${k.replace("_", " ")}`).join(", ")}.`,
        notComparable ? `${notComparable} quote(s) need a unit clarification (${FLAG_LABEL.unit_not_comparable.toLowerCase()}).` : "",
        "Try: search again with a wider area, or relax the spec.",
      ].filter(Boolean).join(" "),
    );
    return;
  }

  const final = Boolean((job.payload as { final?: boolean }).final);
  if (!final && brief.negotiation.allowed && round < brief.negotiation.max_rounds) {
    const targets = eligible.slice(0, SHORTLIST_SIZE);
    const moved = await setStatus(brief, "negotiating");
    if (!moved) return;
    await patchSummary(moved, { negotiation_round: round + 1, negotiation_targets: targets.length });
    await logEvent(brief.id, "negotiate", `Negotiating with the top ${targets.length}`, {
      detail: "We only cite real quotes from other verified suppliers, never names, and never ask for more than 15% off.",
    });
    for (const t of targets) {
      await enqueue("negotiate", brief.id, { supplierId: t.supplierId, round: round + 1 }, { dedupeKey: `negotiate:${brief.id}:${brief.run_no}:${round + 1}:${t.supplierId}` });
    }
    return;
  }
  await enqueue("shortlist", brief.id, {}, { dedupeKey: `shortlist:${brief.id}:${brief.run_no}:${round}` });
};

// ---------------------------------------------------------------------------
// 7. Negotiate with one supplier
// ---------------------------------------------------------------------------
const negotiate: Handler = async (job, brief) => {
  const { supplierId, round } = job.payload as { supplierId: string; round: number };
  const existing = must(await db().from("negotiations").select("id").eq("brief_id", brief.id).eq("supplier_id", supplierId).eq("round", round), "load negotiation") as { id: string }[];
  if (existing.length) return maybeAdvanceAfterNegotiation(brief, round);

  const quotes = await latestQuotes(brief.id);
  const eligibleIds = new Set((await briefSuppliers(brief.id)).filter((r) => r.rank != null).map((r) => r.supplier_id));
  const own = quotes.find((q) => q.supplier_id === supplierId);
  const supplier = await getSupplier(supplierId);
  const ownGoods = own ? pricePerBuyerUnit({ unitPrice: Number(own.unit_price), priceBasis: own.price_basis, unitsPerBasis: own.units_per_basis }, brief.unit) : null;

  const record = async (row: Record<string, unknown>) => {
    const { error } = await db().from("negotiations").insert({ brief_id: brief.id, supplier_id: supplierId, round, ...row });
    if (error && error.code !== "23505") throw new Error(`save negotiation: ${error.message}`);
  };

  if (!own || own.landed_unit_cost == null || ownGoods == null) {
    await record({ ask_unit_price: 0, message: "Skipped: quote not comparable", outcome: "no_response" });
    return maybeAdvanceAfterNegotiation(brief, round);
  }

  // Cheapest other eligible quote is the only competitor we may cite.
  const others = quotes
    .filter((q) => q.supplier_id !== supplierId && q.landed_unit_cost != null && eligibleIds.has(q.supplier_id))
    .sort((a, b) => Number(a.landed_unit_cost) - Number(b.landed_unit_cost));
  const competitor = others[0] ? { quoteId: others[0].id, landed: Number(others[0].landed_unit_cost) } : null;
  const plan = planCounter({ ownLanded: Number(own.landed_unit_cost), ownGoodsPerUnit: ownGoods, competitor, targetLanded: brief.target_unit_price });
  if (!plan) {
    await record({ ask_unit_price: 0, message: "Skipped: no room to ask", outcome: "held" });
    return maybeAdvanceAfterNegotiation(brief, round);
  }

  const message = counterTemplate(plan, brief.unit);
  const allowed = [plan.askUnitPrice, ...(plan.citeLanded != null ? [plan.citeLanded] : [])];
  if (!messageCitesOnly(message, allowed)) throw new Error("Negotiation message cited a number that is not backed by a real quote");

  const basisRatio = Number(own.unit_price) / ownGoods; // quote basis -> buyer unit
  const basisLabel = own.price_basis === "per_1000" ? `per 1000 ${brief.unit}` : own.price_basis === "per_kg" ? "per kg" : `per ${unitWord(brief)}`;

  if (env.voiceProvider !== "simulated") {
    // Live negotiation calls are a human step in v1: ops gets the exact, guard-checked script.
    await record({ ask_unit_price: plan.askUnitPrice, cited_quote_id: plan.citedQuoteId, message, outcome: "no_response", before_landed: own.landed_unit_cost });
    await openOpsTask({ brief_id: brief.id, supplier_id: supplierId, kind: "review_quote", ref_id: own.id, title: `Negotiate with ${supplier.name}`, detail: message });
    await logEvent(brief.id, "negotiate", `Counter-offer for ${supplier.name} sent to the ops desk`, { detail: message });
    return maybeAdvanceAfterNegotiation(brief, round);
  }

  const prof = supplier.sim_profile ?? defaultSimProfile(supplier.id);
  const sim = simulateCounter(prof, ownGoods, plan.askUnitPrice, `${brief.id}:${supplierId}:neg${round}`);
  const quotedNew = sim.newPerUnit != null ? round2(sim.newPerUnit * basisRatio) : null;
  const turns = counterReplyTranscript(message, { outcome: sim.outcome, newPrice: quotedNew }, basisLabel);
  const it = must(
    await db()
      .from("interactions")
      .insert({ brief_id: brief.id, supplier_id: supplierId, purpose: "negotiation", channel: "voice", provider: "simulated", status: "completed", transcript: turns, duration_s: 45, cost_inr: 4.5, started_at: new Date().toISOString(), ended_at: new Date().toISOString(), ground_truth: { outcome: sim.outcome, new_unit_price: quotedNew } })
      .select("*")
      .single(),
    "save negotiation call",
  ) as Interaction;

  const reply = await extractCounterReply(turns, { originalPrice: Number(own.unit_price), basisLabel });
  await db().from("interactions").update({ outcome: reply.outcome === "improved" ? "improved" : reply.outcome === "held" ? "held" : "declined", summary: reply.summary }).eq("id", it.id);

  let afterLanded: number | null = Number(own.landed_unit_cost);
  if (reply.outcome === "improved" && reply.new_unit_price != null) {
    const { id: _id, created_at: _c, landed_unit_cost: _l, landed_total: _t, effective_qty: _e, computed_at: _ca, flags: _f, ...terms } = own;
    must(await db().from("quotes").update({ is_latest: false }).eq("id", own.id).select("id"), "retire quote");
    const newQuote = must(
      await db().from("quotes").insert({ ...terms, unit_price: reply.new_unit_price, version: own.version + 1, is_latest: true, interaction_id: it.id, notes: reply.summary }).select("*").single(),
      "save improved quote",
    ) as Quote;
    const r = computeLanded(quoteTerms(newQuote), briefTerms(brief));
    afterLanded = r.comparable ? r.landedUnit : afterLanded;
  }
  await record({ ask_unit_price: plan.askUnitPrice, cited_quote_id: plan.citedQuoteId, message, outcome: reply.outcome, before_landed: own.landed_unit_cost, after_landed: afterLanded, interaction_id: it.id });

  const before = Number(own.landed_unit_cost);
  await logEvent(
    brief.id,
    "negotiate",
    reply.outcome === "improved" && afterLanded != null && afterLanded < before
      ? `${supplier.name} came down from ${formatINR(before, { unit: true })} to ${formatINR(afterLanded, { unit: true })} landed`
      : `${supplier.name} held their price`,
    { detail: reply.summary },
  );
  return maybeAdvanceAfterNegotiation(brief, round);
};

const round2 = (n: number) => round(n, n < 10 ? 2 : 0);

async function maybeAdvanceAfterNegotiation(brief: Brief, round: number) {
  const fresh = (await getBrief(brief.id)) ?? brief;
  const expected = Number((fresh.summary as Record<string, unknown>).negotiation_targets ?? 0);
  const done = must(await db().from("negotiations").select("id").eq("brief_id", brief.id).eq("round", round), "count negotiations") as unknown[];
  if (done.length < expected) return;
  await enqueue("compare", brief.id, { round }, { dedupeKey: `compare:${brief.id}:${brief.run_no}:r${round}` });
}

// ---------------------------------------------------------------------------
// 8. Shortlist
// ---------------------------------------------------------------------------
const shortlist: Handler = async (_job, brief) => {
  const rows = await briefSuppliers(brief.id);
  const quotes = await latestQuotes(brief.id);
  const ranked = rows.filter((r) => r.rank != null).sort((a, b) => a.rank! - b.rank!);
  const top = ranked.slice(0, SHORTLIST_SIZE);

  for (const r of rows) {
    if (top.some((t) => t.id === r.id)) await updateBs(r.id, { status: "shortlisted" });
    else if (r.status === "quoted" || r.status === "shortlisted") await updateBs(r.id, { status: "not_shortlisted" });
  }

  const bestQuote = quotes.find((q) => q.supplier_id === top[0]?.supplier_id);
  const best = bestQuote?.landed_unit_cost != null ? Number(bestQuote.landed_unit_cost) : null;
  const landed = quotes.map((q) => Number(q.landed_unit_cost)).filter((x) => x > 0);
  const med = landed.length ? median(landed) : null;
  const qty = Number(brief.quantity ?? 0);

  let savingsPerUnit: number | null = null;
  let basis: "current_price" | "median_quote" | null = null;
  if (best != null && brief.current_unit_price && brief.current_unit_price > best) {
    savingsPerUnit = brief.current_unit_price - best;
    basis = "current_price";
  } else if (best != null && med != null && med > best) {
    savingsPerUnit = med - best;
    basis = "median_quote";
  }

  // Market reference from earlier briefs with the same spec (the data flywheel).
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: pts } = await db()
    .from("price_points")
    .select("landed_unit_cost")
    .eq("spec_key", specKey(brief.category, brief.spec))
    .neq("brief_id", brief.id)
    .gte("observed_at", since)
    .limit(500);
  const market = (pts ?? []).map((p) => Number(p.landed_unit_cost));

  const note = top.length < SHORTLIST_SIZE ? `Only ${top.length} supplier${top.length === 1 ? "" : "s"} met your requirements.` : null;
  const fresh = (await getBrief(brief.id)) ?? brief;
  await patchSummary(fresh, {
    best_landed: best,
    median_landed: med,
    savings_per_unit: savingsPerUnit != null ? round(savingsPerUnit, 4) : null,
    savings_basis: basis,
    savings_total: savingsPerUnit != null && qty ? round(savingsPerUnit * Math.max(qty, Number(bestQuote?.effective_qty ?? qty)), 0) : null,
    market_reference: market.length >= 3 ? round(median(market), 4) : null,
    note,
  });

  const target = env.opsReviewShortlist ? "in_review" : "shortlist_ready";
  const moved = await setStatus((await getBrief(brief.id))!, target, { shortlisted_at: new Date().toISOString(), status_reason: null });
  if (!moved) return;
  if (target === "in_review") {
    await openOpsTask({ brief_id: brief.id, kind: "review_shortlist", title: `Review shortlist for "${brief.title}"`, detail: "Approve to send to the buyer." });
  }
  await logEvent(brief.id, "shortlist", target === "in_review" ? "Shortlist ready for a final human check" : `Shortlist ready: ${top.length} supplier${top.length === 1 ? "" : "s"}`, {
    detail: [best != null ? `Best landed cost ${formatINR(best, { unit: true })} per ${unitWord(brief)}.` : "", note ?? ""].filter(Boolean).join(" "),
  });
};

export const HANDLERS: Record<JobType, Handler> = {
  scout,
  vet,
  schedule_calls: scheduleCalls,
  call,
  extract,
  compare,
  negotiate,
  shortlist,
};
