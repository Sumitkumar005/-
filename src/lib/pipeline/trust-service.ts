// Recomputes a supplier's trust ledger from verification data and our own history with them.

import { db, must } from "@/lib/db/admin";
import type { Supplier, SupplierVerification } from "@/lib/db/types";
import { computeTrust, type TrustResult } from "@/lib/domain/trust";
import { checkGstin } from "@/lib/domain/gstin";
import { lookupGst } from "./gst-provider";

const RECHECK_DAYS = 30;

export async function refreshTrust(supplier: Supplier): Promise<{ supplier: Supplier; trust: TrustResult }> {
  let verification: SupplierVerification = { ...supplier.verification };
  const g = checkGstin(supplier.gstin);
  verification.gstin_valid = g.valid;

  const stale = !verification.checked_at || Date.now() - new Date(verification.checked_at).getTime() > RECHECK_DAYS * 86_400_000;
  if (g.valid && stale) {
    const looked = await lookupGst(g.gstin);
    if (looked) verification = { ...verification, ...looked };
  }
  verification.checked_at = new Date().toISOString();

  const [outcomes, calls] = await Promise.all([
    db().from("outcomes").select("ordered, delivered_on_time, quality_ok, quote_honoured, dispute").eq("supplier_id", supplier.id),
    db().from("interactions").select("outcome").eq("supplier_id", supplier.id).eq("purpose", "quote").not("outcome", "is", null),
  ]);
  const o = must(outcomes, "load outcomes") as { ordered: boolean; delivered_on_time: boolean | null; quality_ok: boolean | null; quote_honoured: boolean | null; dispute: boolean }[];
  const c = must(calls, "load calls") as { outcome: string }[];
  const ordered = o.filter((x) => x.ordered);

  const trust = computeTrust({
    gstin: supplier.gstin,
    state: supplier.state,
    isManufacturer: supplier.is_manufacturer,
    reviewRating: supplier.review_rating,
    reviewCount: supplier.review_count,
    yearEstablished: supplier.year_established,
    verification: { gstStatus: verification.gst_status, registeredOn: verification.gst_registered_on, filingRegular: verification.filing_regular },
    history:
      o.length || c.length
        ? {
            ordersCount: ordered.length,
            lateCount: ordered.filter((x) => x.delivered_on_time === false).length,
            qualityIssues: ordered.filter((x) => x.quality_ok === false).length,
            notHonoured: o.filter((x) => x.quote_honoured === false).length,
            disputes: o.filter((x) => x.dispute).length,
            callsTotal: c.length,
            callsAnswered: c.filter((x) => x.outcome !== "no_answer").length,
          }
        : undefined,
  });

  const updated = must(
    await db()
      .from("suppliers")
      .update({ verification, trust_score: trust.score, trust_band: trust.band, trust_ledger: trust.ledger, verified_at: new Date().toISOString() })
      .eq("id", supplier.id)
      .select("*")
      .single(),
    "save trust",
  ) as Supplier;
  return { supplier: updated, trust };
}
