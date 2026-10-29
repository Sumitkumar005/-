// One view model for the brief page, used for the first render and for live polling.
// Supplier contacts stay masked until the buyer chooses that supplier.

import { db, must } from "@/lib/db/admin";
import type { Brief, BriefEvent, BriefSupplier, Interaction, Negotiation, Outcome, Quote, Supplier } from "@/lib/db/types";
import { maskPhone } from "@/lib/domain/phone";
import { pricePerBuyerUnit } from "@/lib/domain/landed-cost";
import { getSession } from "@/lib/auth";
import { HttpError } from "@/lib/api";

export type SupplierCard = {
  briefSupplierId: string;
  supplierId: string;
  name: string;
  city: string | null;
  isDemo: boolean;
  isManufacturer: boolean | null;
  status: BriefSupplier["status"];
  excludeReason: string | null;
  matchReason: string | null;
  callAttempts: number;
  rank: number | null;
  score: number | null;
  reasons: string[];
  trustScore: number | null;
  trustBand: Supplier["trust_band"];
  trustLedger: Supplier["trust_ledger"];
  gstin: string | null;
  phone: string; // masked unless revealed
  whatsapp: string | null;
  revealed: boolean;
  quote: (Quote & { goods_per_unit: number | null; first_landed: number | null }) | null;
  calls: Pick<Interaction, "id" | "purpose" | "outcome" | "summary" | "transcript" | "duration_s" | "created_at" | "provider" | "recording_url">[];
};

export type BriefView = {
  brief: Brief;
  suppliers: SupplierCard[];
  events: BriefEvent[];
  negotiations: Negotiation[];
  outcome: Outcome | null;
  viewerIsOps: boolean;
  serverTime: string;
};

export async function loadBriefView(id: string): Promise<BriefView> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Please sign in");
  const { data: brief } = await db().from("briefs").select("*").eq("id", id).maybeSingle();
  if (!brief || (brief.owner_id !== session.userId && !session.isOps)) throw new HttpError(404, "Brief not found");

  const [rows, events, quotes, negs, calls, outcome] = await Promise.all([
    db().from("brief_suppliers").select("*").eq("brief_id", id),
    db().from("brief_events").select("*").eq("brief_id", id).order("id", { ascending: true }).limit(500),
    db().from("quotes").select("*").eq("brief_id", id).order("version", { ascending: true }),
    db().from("negotiations").select("*").eq("brief_id", id).order("created_at", { ascending: true }),
    db().from("interactions").select("id, supplier_id, purpose, outcome, summary, transcript, duration_s, created_at, provider, recording_url").eq("brief_id", id).order("created_at", { ascending: true }),
    db().from("outcomes").select("*").eq("brief_id", id).maybeSingle(),
  ]);
  const bs = must(rows, "brief suppliers") as BriefSupplier[];
  const supplierIds = bs.map((r) => r.supplier_id);
  const suppliers = supplierIds.length ? (must(await db().from("suppliers").select("*").in("id", supplierIds), "suppliers") as Supplier[]) : [];
  const allQuotes = must(quotes, "quotes") as Quote[];
  const allCalls = must(calls, "calls") as (Interaction & { supplier_id: string })[];

  const cards: SupplierCard[] = bs.map((r) => {
    const s = suppliers.find((x) => x.id === r.supplier_id)!;
    const versions = allQuotes.filter((q) => q.supplier_id === r.supplier_id);
    const latest = versions.find((q) => q.is_latest) ?? null;
    const first = versions[0] ?? null;
    const reveal = r.revealed || session.isOps;
    return {
      briefSupplierId: r.id,
      supplierId: s.id,
      name: s.name,
      city: s.city,
      isDemo: s.is_demo,
      isManufacturer: s.is_manufacturer,
      status: r.status,
      excludeReason: r.exclude_reason,
      matchReason: r.match_reason,
      callAttempts: r.call_attempts,
      rank: r.rank,
      score: r.score,
      reasons: r.rank_reasons ?? [],
      trustScore: s.trust_score,
      trustBand: s.trust_band,
      trustLedger: s.trust_ledger ?? [],
      gstin: s.gstin,
      phone: reveal ? s.phone ?? "Not available" : maskPhone(s.phone),
      whatsapp: reveal ? s.whatsapp ?? s.phone : null,
      revealed: reveal,
      quote: latest
        ? {
            ...latest,
            goods_per_unit: pricePerBuyerUnit({ unitPrice: Number(latest.unit_price), priceBasis: latest.price_basis, unitsPerBasis: latest.units_per_basis }, brief.unit),
            first_landed: first && first.id !== latest.id ? first.landed_unit_cost : null,
          }
        : null,
      calls: allCalls
        .filter((c) => c.supplier_id === r.supplier_id)
        .map(({ id: cid, purpose, outcome: o, summary, transcript, duration_s, created_at, provider, recording_url }) => ({ id: cid, purpose, outcome: o, summary, transcript, duration_s, created_at, provider, recording_url })),
    };
  });

  const order: Record<string, number> = { selected: 0, shortlisted: 1, quoted: 2, not_shortlisted: 3, calling: 4, queued: 5, callback: 6, candidate: 7, declined: 8, unreachable: 9, opted_out: 10, excluded: 11 };
  cards.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || (order[a.status] ?? 50) - (order[b.status] ?? 50) || a.name.localeCompare(b.name));

  return {
    brief: brief as Brief,
    suppliers: cards,
    events: must(events, "events") as BriefEvent[],
    negotiations: must(negs, "negotiations") as Negotiation[],
    outcome: (outcome.data as Outcome | null) ?? null,
    viewerIsOps: session.isOps,
    serverTime: new Date().toISOString(),
  };
}
