// GST registration lookup. The public GST portal has no open API; live status and filing history
// come from a licensed GST Suvidha Provider (GSP). Plug one in here. Until then we only run the
// offline checksum and state checks, and the trust ledger says "not checked" for the rest.

import type { SupplierVerification } from "@/lib/db/types";

export async function lookupGst(gstin: string): Promise<Partial<SupplierVerification> | null> {
  const url = process.env.GST_LOOKUP_URL;
  const key = process.env.GST_LOOKUP_KEY;
  if (!url || !key) return null;
  try {
    // Expected response shape from your adapter: { status: "active"|"cancelled"|"suspended", registered_on: "YYYY-MM-DD", filing_regular: boolean }
    const res = await fetch(`${url.replace(/\/$/, "")}/${encodeURIComponent(gstin)}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { status?: string; registered_on?: string; filing_regular?: boolean };
    const status = j.status === "active" || j.status === "cancelled" || j.status === "suspended" ? j.status : "unknown";
    return { gst_status: status, gst_registered_on: j.registered_on ?? null, filing_regular: j.filing_regular ?? null, provider: "gsp" };
  } catch {
    return null;
  }
}
