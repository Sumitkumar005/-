import { z } from "zod";
import { body, ok, route } from "@/lib/api";
import { importCsv } from "@/lib/suppliers/service";

export const POST = route(async ({ req }) => {
  const { csv } = await body(req, z.object({ csv: z.string().max(2_000_000) }));
  return ok(await importCsv(csv));
}, { ops: true });
