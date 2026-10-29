import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/api";
import { db, must } from "@/lib/db/admin";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async ({ req, session, ctx }) => {
  const { id } = await ctx.params;
  await body(req, z.object({ action: z.literal("resolve") }));
  const { data } = await db().from("ops_tasks").select("id, status").eq("id", id).maybeSingle();
  if (!data) throw new HttpError(404, "Task not found");
  must(await db().from("ops_tasks").update({ status: "resolved", resolved_by: session.userId, resolved_at: new Date().toISOString() }).eq("id", id).select("id"), "resolve task");
  return ok({ ok: true });
}, { ops: true });
