import { z } from "zod";
import { body, ok, route } from "@/lib/api";
import { selectSupplier } from "@/lib/briefs/service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async ({ req, session, ctx }) => {
  const { supplierId } = await body(req, z.object({ supplierId: z.string().uuid() }));
  await selectSupplier(session, (await ctx.params).id, supplierId);
  return ok({ ok: true });
});
