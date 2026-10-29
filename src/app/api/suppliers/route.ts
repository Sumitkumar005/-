import { body, HttpError, ok, route } from "@/lib/api";
import { addSupplier, SupplierInputSchema } from "@/lib/suppliers/service";

export const POST = route(async ({ req }) => {
  const res = await addSupplier(await body(req, SupplierInputSchema));
  if (!res.ok) throw new HttpError(400, res.error);
  return ok(res.supplier, 201);
}, { ops: true });
