import { body, ok, route } from "@/lib/api";
import { OutcomeSchema, recordOutcome } from "@/lib/briefs/service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async ({ req, session, ctx }) => {
  await recordOutcome(session, (await ctx.params).id, await body(req, OutcomeSchema));
  return ok({ ok: true });
});
