// Small data-access helpers shared by the worker and API routes.

import { db, must } from "@/lib/db/admin";
import type { Brief, BriefSummary, Buyer, JobType, Supplier } from "@/lib/db/types";
import { canTransition, type BriefStatus } from "@/lib/domain/brief-state";

export async function getBrief(id: string): Promise<Brief | null> {
  const { data, error } = await db().from("briefs").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`load brief: ${error.message}`);
  return data as Brief | null;
}

export async function getBuyer(id: string): Promise<Buyer> {
  return must(await db().from("buyers").select("*").eq("id", id).single(), "load buyer") as Buyer;
}

export async function getSupplier(id: string): Promise<Supplier> {
  return must(await db().from("suppliers").select("*").eq("id", id).single(), "load supplier") as Supplier;
}

export class TransitionError extends Error {}

/** Moves a brief to a new status if allowed. Returns the updated brief, or null if the move was not allowed. */
export async function setStatus(brief: Brief, to: BriefStatus, extra: Partial<Brief> = {}, opts: { strict?: boolean } = {}): Promise<Brief | null> {
  if (brief.status === to && Object.keys(extra).length === 0) return brief;
  if (brief.status !== to && !canTransition(brief.status, to)) {
    if (opts.strict) throw new TransitionError(`Cannot move brief from ${brief.status} to ${to}`);
    return null;
  }
  // Optimistic concurrency: only update if nobody changed the status underneath us.
  const { data, error } = await db()
    .from("briefs")
    .update({ status: to, ...extra })
    .eq("id", brief.id)
    .eq("status", brief.status)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`update brief status: ${error.message}`);
  if (!data && opts.strict) throw new TransitionError("Brief changed while updating, refresh and try again");
  return (data as Brief) ?? null;
}

export async function patchSummary(brief: Brief, patch: Partial<BriefSummary>): Promise<BriefSummary> {
  const fresh = await getBrief(brief.id);
  const summary = { ...(fresh?.summary ?? brief.summary), ...patch };
  must(await db().from("briefs").update({ summary }).eq("id", brief.id).select("id"), "update summary");
  return summary;
}

export async function logEvent(
  briefId: string,
  kind: string,
  title: string,
  opts: { detail?: string; data?: Record<string, unknown>; actor?: "agent" | "buyer" | "ops" | "system" } = {},
) {
  must(
    await db().from("brief_events").insert({ brief_id: briefId, kind, title, detail: opts.detail ?? null, data: opts.data ?? {}, actor: opts.actor ?? "agent" }).select("id"),
    "log event",
  );
}

export async function enqueue(
  type: JobType,
  briefId: string | null,
  payload: Record<string, unknown> = {},
  opts: { runAt?: Date; dedupeKey?: string; maxAttempts?: number } = {},
) {
  const row = {
    type,
    brief_id: briefId,
    payload,
    run_at: (opts.runAt ?? new Date()).toISOString(),
    dedupe_key: opts.dedupeKey ?? null,
    max_attempts: opts.maxAttempts ?? 3,
  };
  if (opts.dedupeKey) {
    const { error } = await db().from("jobs").upsert(row, { onConflict: "dedupe_key", ignoreDuplicates: true });
    if (error) throw new Error(`enqueue ${type}: ${error.message}`);
  } else {
    must(await db().from("jobs").insert(row).select("id"), `enqueue ${type}`);
  }
}

export async function cancelJobs(briefId: string) {
  must(await db().from("jobs").update({ status: "cancelled", finished_at: new Date().toISOString() }).eq("brief_id", briefId).eq("status", "queued").select("id"), "cancel jobs");
}

export async function openOpsTask(t: { brief_id?: string | null; supplier_id?: string | null; kind: string; ref_id?: string | null; title: string; detail?: string }) {
  must(await db().from("ops_tasks").insert({ ...t, status: "open" }).select("id"), "open ops task");
}

export async function needsAttention(brief: Brief, reason: string, detail?: string) {
  const fresh = (await getBrief(brief.id)) ?? brief;
  const moved = await setStatus(fresh, "needs_attention", { status_reason: reason });
  if (!moved) return;
  await logEvent(brief.id, "needs_attention", reason, { detail, actor: "system" });
  await openOpsTask({ brief_id: brief.id, kind: "needs_attention", title: reason, detail });
}
