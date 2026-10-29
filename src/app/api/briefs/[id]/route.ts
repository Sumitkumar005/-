import { body, ok, route } from "@/lib/api";
import { BriefPatchSchema, updateDraft } from "@/lib/briefs/service";
import { loadBriefView } from "@/lib/views/brief-view";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async ({ ctx }) => ok(await loadBriefView((await ctx.params).id)));

export const PATCH = route<Ctx>(async ({ req, session, ctx }) => {
  const patch = await body(req, BriefPatchSchema);
  return ok(await updateDraft(session, (await ctx.params).id, patch));
});
