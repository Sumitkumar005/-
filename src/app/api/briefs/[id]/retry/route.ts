import { ok, route } from "@/lib/api";
import { retryBrief } from "@/lib/briefs/service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async ({ session, ctx }) => ok(await retryBrief(session, (await ctx.params).id)));
