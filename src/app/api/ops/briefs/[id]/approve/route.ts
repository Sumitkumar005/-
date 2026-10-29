import { HttpError, ok, route } from "@/lib/api";
import { db } from "@/lib/db/admin";
import { getBrief, logEvent, setStatus } from "@/lib/pipeline/repo";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async ({ session, ctx }) => {
  const { id } = await ctx.params;
  const brief = await getBrief(id);
  if (!brief) throw new HttpError(404, "Brief not found");
  await setStatus(brief, "shortlist_ready", {}, { strict: true });
  await db().from("ops_tasks").update({ status: "resolved", resolved_by: session.userId, resolved_at: new Date().toISOString() }).eq("brief_id", id).eq("kind", "review_shortlist").eq("status", "open");
  await logEvent(id, "approved", "Shortlist checked by our sourcing desk", { actor: "ops" });
  return ok({ ok: true });
}, { ops: true });
