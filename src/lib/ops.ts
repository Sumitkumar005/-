import { notFound } from "next/navigation";
import { requirePageSession } from "@/lib/auth";

/** Ops-only pages: hide their existence from buyers. */
export async function requireOpsPage() {
  const s = await requirePageSession();
  if (!s.isOps) notFound();
  return s;
}
