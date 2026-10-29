// Buyer actions on a brief. Each one checks ownership and allowed state before writing.

import { z } from "zod";
import { db, must } from "@/lib/db/admin";
import type { Brief, BriefSupplier, Buyer } from "@/lib/db/types";
import type { Session } from "@/lib/auth";
import { HttpError } from "@/lib/api";
import { parseBrief } from "@/lib/agents/brief";
import { cleanSpec, getCategory, missingSpecFields, CATEGORIES } from "@/lib/domain/categories";
import { isValidPincode } from "@/lib/domain/geo";
import { cancelJobs, enqueue, getBrief, logEvent, setStatus } from "@/lib/pipeline/repo";
import { refreshTrust } from "@/lib/pipeline/trust-service";
import { getSupplier } from "@/lib/pipeline/repo";

const todayIST = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

async function ownBrief(session: Session, id: string): Promise<Brief> {
  const brief = await getBrief(id);
  if (!brief || (brief.owner_id !== session.userId && !session.isOps)) throw new HttpError(404, "Brief not found");
  return brief;
}

export async function createBriefFromText(session: Session, text: string): Promise<Brief> {
  const buyer = session.buyer as Buyer;
  const clean = text.trim();
  if (clean.length < 8) throw new HttpError(400, "Tell us a little more: what, how many, and any size or print details.");
  const draft = await parseBrief(clean, { today: todayIST(), buyerCity: buyer.city, buyerPincode: buyer.pincode }).catch((e: Error) => {
    console.error("parseBrief failed", e);
    throw new HttpError(502, "Our AI could not read that just now. Please try again in a moment.");
  });
  const row = must(
    await db()
      .from("briefs")
      .insert({
        ...draft,
        buyer_id: buyer.id,
        owner_id: session.userId,
        raw_text: clean.slice(0, 4000),
        delivery_city: draft.delivery_city ?? buyer.city,
        delivery_state: buyer.state,
        status: "draft",
      })
      .select("*")
      .single(),
    "create brief",
  ) as Brief;
  await logEvent(row.id, "created", "Brief created from your message", { actor: "buyer" });
  return row;
}

export const BriefPatchSchema = z.object({
  title: z.string().trim().min(2).max(80).optional(),
  category: z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]]).optional(),
  spec: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  quantity: z.number().positive().max(100_000_000).nullable().optional(),
  frequency: z.enum(["one_time", "weekly", "monthly", "quarterly"]).optional(),
  delivery_pincode: z.string().trim().nullable().optional(),
  needed_by: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  target_unit_price: z.number().positive().nullable().optional(),
  max_unit_price: z.number().positive().nullable().optional(),
  current_unit_price: z.number().positive().nullable().optional(),
  must_haves: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
  negotiation_allowed: z.boolean().optional(),
  max_suppliers: z.number().int().min(3).max(25).optional(),
});

export async function updateDraft(session: Session, id: string, patch: z.infer<typeof BriefPatchSchema>): Promise<Brief> {
  const brief = await ownBrief(session, id);
  if (brief.status !== "draft") throw new HttpError(409, "Only draft briefs can be edited");
  const category = patch.category ?? brief.category;
  const cat = getCategory(category);
  const spec = patch.spec ? cleanSpec(category, patch.spec as Record<string, unknown>) : category !== brief.category ? cleanSpec(category, brief.spec) : brief.spec;
  if (patch.delivery_pincode && !isValidPincode(patch.delivery_pincode)) throw new HttpError(400, "Pincode must be 6 digits");
  if (patch.needed_by && patch.needed_by < todayIST()) throw new HttpError(400, "Needed-by date is in the past");

  const update: Record<string, unknown> = { spec, category, unit: category === "other" ? brief.unit : cat.unit };
  for (const k of ["title", "quantity", "frequency", "delivery_pincode", "needed_by", "target_unit_price", "max_unit_price", "current_unit_price", "must_haves", "max_suppliers"] as const) {
    if (patch[k] !== undefined) update[k] = patch[k];
  }
  if (patch.negotiation_allowed !== undefined) update.negotiation = { allowed: patch.negotiation_allowed, max_rounds: patch.negotiation_allowed ? 1 : 0 };
  const merged = { ...brief, ...update } as Brief;
  update.open_questions = draftGaps(merged);
  return must(await db().from("briefs").update(update).eq("id", id).select("*").single(), "update brief") as Brief;
}

/** What still blocks confirming a draft, in plain words. */
export function draftGaps(b: Brief): string[] {
  const gaps = missingSpecFields(b.category, b.spec).map((f) => `${f.label}?`);
  if (!b.quantity) gaps.push("How many do you need per order?");
  if (!isValidPincode(b.delivery_pincode)) gaps.push("Delivery pincode?");
  return gaps;
}

export async function confirmBrief(session: Session, id: string): Promise<Brief> {
  const brief = await ownBrief(session, id);
  const gaps = draftGaps(brief);
  if (gaps.length) throw new HttpError(400, `Still missing: ${gaps.join(" ")}`);
  if (brief.target_unit_price && brief.max_unit_price && brief.target_unit_price > brief.max_unit_price) throw new HttpError(400, "Target price is above your maximum price");
  const moved = await setStatus(brief, "confirmed", { confirmed_at: new Date().toISOString(), open_questions: [] }, { strict: true });
  await logEvent(id, "confirmed", "Brief confirmed. Sourcing started.", { actor: "buyer" });
  await enqueue("scout", id, {}, { dedupeKey: `scout:${id}:${moved!.run_no}` });
  return moved!;
}

export async function cancelBrief(session: Session, id: string): Promise<Brief> {
  const brief = await ownBrief(session, id);
  const moved = await setStatus(brief, "cancelled", { status_reason: "Cancelled by buyer" }, { strict: true });
  await cancelJobs(id);
  await logEvent(id, "cancelled", "Brief cancelled", { actor: "buyer" });
  return moved!;
}

/** Search again: widen to more suppliers (and other states) while keeping quotes already collected. */
export async function retryBrief(session: Session, id: string): Promise<Brief> {
  const brief = await ownBrief(session, id);
  if (!["needs_attention", "shortlist_ready"].includes(brief.status)) throw new HttpError(409, "This brief is not ready to search again");
  if (brief.run_no >= 4) throw new HttpError(409, "We have already searched this brief 4 times. Talk to us and we will source it by hand.");
  const run = brief.run_no + 1;
  const moved = await setStatus(brief, "confirmed", { run_no: run, status_reason: null }, { strict: true });
  await db().from("brief_suppliers").update({ status: "quoted" }).eq("brief_id", id).in("status", ["shortlisted", "not_shortlisted"]);
  await logEvent(id, "retry", "Searching again with a wider net", { actor: session.isOps && brief.owner_id !== session.userId ? "ops" : "buyer" });
  await enqueue("scout", id, {}, { dedupeKey: `scout:${id}:${run}` });
  return moved!;
}

export async function selectSupplier(session: Session, id: string, supplierId: string): Promise<void> {
  const brief = await ownBrief(session, id);
  if (!["shortlist_ready", "supplier_selected"].includes(brief.status)) throw new HttpError(409, "Choose a supplier once the shortlist is ready");
  const { data: row } = await db().from("brief_suppliers").select("*").eq("brief_id", id).eq("supplier_id", supplierId).maybeSingle();
  const bs = row as BriefSupplier | null;
  if (!bs || !["shortlisted", "not_shortlisted", "selected"].includes(bs.status)) throw new HttpError(400, "That supplier did not quote on this brief");
  must(await db().from("brief_suppliers").update({ status: "selected", revealed: true }).eq("id", bs.id).select("id"), "select supplier");
  if (brief.status === "shortlist_ready") await setStatus(brief, "supplier_selected", {}, { strict: true });
  const s = await getSupplier(supplierId);
  await logEvent(id, "selected", `You chose ${s.name}. Contact details unlocked.`, { actor: "buyer" });
}

export const OutcomeSchema = z.object({
  supplierId: z.string().uuid(),
  ordered: z.boolean(),
  order_value: z.number().nonnegative().max(1e10).nullable().optional(),
  delivered_on_time: z.boolean().nullable().optional(),
  quality_ok: z.boolean().nullable().optional(),
  quote_honoured: z.boolean().nullable().optional(),
  dispute: z.boolean().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function recordOutcome(session: Session, id: string, o: z.infer<typeof OutcomeSchema>): Promise<void> {
  const brief = await ownBrief(session, id);
  if (!["supplier_selected", "completed"].includes(brief.status)) throw new HttpError(409, "Choose a supplier first");
  const { data: bs } = await db().from("brief_suppliers").select("status").eq("brief_id", id).eq("supplier_id", o.supplierId).maybeSingle();
  if (!bs || bs.status !== "selected") throw new HttpError(400, "Record the outcome for the supplier you chose");
  must(
    await db()
      .from("outcomes")
      .upsert(
        {
          brief_id: id,
          supplier_id: o.supplierId,
          buyer_id: brief.buyer_id,
          ordered: o.ordered,
          order_value: o.order_value ?? null,
          delivered_on_time: o.ordered ? o.delivered_on_time ?? null : null,
          quality_ok: o.ordered ? o.quality_ok ?? null : null,
          quote_honoured: o.quote_honoured ?? null,
          dispute: o.dispute ?? false,
          notes: o.notes ?? null,
        },
        { onConflict: "brief_id,supplier_id" },
      )
      .select("id"),
    "save outcome",
  );
  await refreshTrust(await getSupplier(o.supplierId));
  if (brief.status !== "completed") await setStatus(brief, "completed", { completed_at: new Date().toISOString() });
  await logEvent(id, "outcome", o.ordered ? "Order outcome recorded. Supplier score updated." : "Marked as not ordered.", { actor: "buyer" });
}
