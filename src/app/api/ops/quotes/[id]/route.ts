// Ops corrects a quote after listening to the call, then the brief is re-compared.

import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/api";
import { db, must } from "@/lib/db/admin";
import type { Quote } from "@/lib/db/types";
import { enqueue, getBrief, logEvent } from "@/lib/pipeline/repo";

type Ctx = { params: Promise<{ id: string }> };

const Schema = z.object({
  unit_price: z.number().positive(),
  price_basis: z.enum(["per_unit", "per_100", "per_1000", "per_kg", "per_box", "lot"]),
  units_per_basis: z.number().positive().nullable(),
  gst_included: z.boolean().nullable(),
  moq: z.number().positive().nullable(),
  lead_time_days: z.number().int().min(0).max(365).nullable(),
  taskId: z.string().uuid().optional(),
});

export const POST = route<Ctx>(async ({ req, session, ctx }) => {
  const { id } = await ctx.params;
  const { taskId, ...fix } = await body(req, Schema);
  const { data } = await db().from("quotes").select("*").eq("id", id).maybeSingle();
  const quote = data as Quote | null;
  if (!quote) throw new HttpError(404, "Quote not found");
  if (!quote.is_latest) throw new HttpError(409, "A newer version of this quote exists. Edit that one.");
  must(await db().from("quotes").update({ ...fix, needs_confirmation: false, confidence: { ...quote.confidence, price: 1, corrected_by_ops: 1 } }).eq("id", id).select("id"), "fix quote");
  if (taskId) await db().from("ops_tasks").update({ status: "resolved", resolved_by: session.userId, resolved_at: new Date().toISOString() }).eq("id", taskId);

  const brief = await getBrief(quote.brief_id);
  if (brief && ["shortlist_ready", "in_review", "needs_attention"].includes(brief.status)) {
    await logEvent(brief.id, "ops", "Ops confirmed a quote. Re-comparing.", { actor: "ops" });
    await enqueue("compare", brief.id, { round: brief.summary.negotiation_round ?? 0, final: true }, { dedupeKey: `compare:${brief.id}:fix:${id}:${Date.now()}` });
  }
  return ok({ ok: true });
}, { ops: true });
