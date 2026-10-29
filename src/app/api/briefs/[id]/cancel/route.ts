import { ok, route } from "@/lib/api";
import { cancelBrief } from "@/lib/briefs/service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async ({ session, ctx }) => ok(await cancelBrief(session, (await ctx.params).id)));
