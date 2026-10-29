// Turns any supplier quote into one comparable number: landed cost per unit at the buyer's door,
// GST and freight included. Every assumption made along the way becomes a visible flag.

import type { Unit } from "./categories";

export type PriceBasis = "per_unit" | "per_100" | "per_1000" | "per_kg" | "per_box" | "lot";
export type FreightMode = "included" | "fixed" | "per_unit" | "to_pay" | "unknown";

export type QuoteTerms = {
  unitPrice: number;
  priceBasis: PriceBasis;
  unitsPerBasis?: number | null;
  gstIncluded?: boolean | null;
  gstRate?: number | null;
  moq?: number | null;
  leadTimeDays?: number | null;
  freightMode: FreightMode;
  freightAmount?: number | null;
  setupCost?: number | null;
  advancePct?: number | null;
  sampleAvailable?: boolean | null;
  needsConfirmation?: boolean;
};

export type BriefTerms = {
  quantity: number;
  unit: Unit;
  defaultGstRate: number;
  neededBy?: string | null; // ISO date
  maxUnitPrice?: number | null;
};

export const FLAG_LABEL: Record<string, string> = {
  unit_not_comparable: "Price unit can't be converted (e.g. per kg with no pieces-per-kg)",
  moq_above_qty: "Minimum order is above your quantity",
  freight_estimated: "Freight not quoted, estimated",
  gst_assumed: "GST not stated, assumed extra",
  setup_cost_one_time: "Includes one-time plate or setup cost",
  misses_deadline: "Lead time misses your deadline",
  lead_time_unknown: "Lead time not given",
  over_budget: "Above your maximum price",
  high_advance: "Asks 50% or more in advance",
  needs_confirmation: "Some details unclear on the call, confirming in writing",
  no_sample: "No sample before bulk",
  too_good_to_be_true: "Far below other quotes, verify before paying",
  well_above_market: "Well above other quotes",
  quote_expired: "Quote validity has expired",
};

/** Flags that should stop a quote from being recommended without a human look. */
export const SERIOUS_FLAGS = new Set(["unit_not_comparable", "too_good_to_be_true", "quote_expired"]);

/** Share of goods value used when the supplier does not quote freight. */
export const FREIGHT_ESTIMATE_PCT = 0.04;

/** Price per buyer unit, before GST/freight. Null when the basis can't be converted. */
export function pricePerBuyerUnit(q: Pick<QuoteTerms, "unitPrice" | "priceBasis" | "unitsPerBasis">, buyerUnit: Unit): number | null {
  const per = q.unitsPerBasis && q.unitsPerBasis > 0 ? q.unitsPerBasis : null;
  switch (q.priceBasis) {
    case "per_unit":
      return q.unitPrice;
    case "per_100":
      return q.unitPrice / 100;
    case "per_1000":
      return q.unitPrice / 1000;
    case "per_kg":
      if (buyerUnit === "kg") return q.unitPrice;
      return per ? q.unitPrice / per : null;
    case "per_box":
    case "lot":
      return per ? q.unitPrice / per : null;
  }
}

export type LandedResult =
  | {
      comparable: true;
      effectiveQty: number;
      goodsPerUnit: number;
      landedUnit: number;
      landedTotal: number;
      gstAmount: number;
      freight: number;
      flags: string[];
    }
  | { comparable: false; flags: string[] };

export function computeLanded(q: QuoteTerms, b: BriefTerms, now: Date = new Date()): LandedResult {
  const flags: string[] = [];
  if (q.needsConfirmation) flags.push("needs_confirmation");
  if (q.sampleAvailable === false) flags.push("no_sample");
  if (q.advancePct != null && q.advancePct >= 50) flags.push("high_advance");

  if (q.leadTimeDays == null) flags.push("lead_time_unknown");
  else if (b.neededBy) {
    const due = new Date(b.neededBy + "T23:59:59+05:30");
    const eta = new Date(now.getTime() + q.leadTimeDays * 86_400_000);
    if (eta > due) flags.push("misses_deadline");
  }

  const goodsPerUnit = pricePerBuyerUnit(q, b.unit);
  if (goodsPerUnit == null || !(goodsPerUnit > 0) || !(b.quantity > 0)) {
    return { comparable: false, flags: ["unit_not_comparable", ...flags] };
  }

  let effectiveQty = b.quantity;
  if (q.moq != null && q.moq > b.quantity) {
    flags.push("moq_above_qty");
    effectiveQty = q.moq;
  }

  const goods = goodsPerUnit * effectiveQty;
  const setup = q.setupCost && q.setupCost > 0 ? q.setupCost : 0;
  if (setup > 0) flags.push("setup_cost_one_time");

  let freight = 0;
  switch (q.freightMode) {
    case "included":
      break;
    case "fixed":
      freight = q.freightAmount ?? 0;
      break;
    case "per_unit":
      freight = (q.freightAmount ?? 0) * effectiveQty;
      break;
    case "to_pay":
    case "unknown":
      freight = goods * FREIGHT_ESTIMATE_PCT;
      flags.push("freight_estimated");
      break;
  }

  let gstAmount = 0;
  if (q.gstIncluded !== true) {
    if (q.gstIncluded == null) flags.push("gst_assumed");
    const rate = q.gstRate != null && q.gstRate >= 0 && q.gstRate < 1 ? q.gstRate : b.defaultGstRate;
    // Freight and setup billed by the supplier follow the goods' GST rate (composite supply).
    gstAmount = (goods + setup + (q.freightMode === "to_pay" || q.freightMode === "unknown" ? 0 : freight)) * rate;
  }

  const landedTotal = goods + setup + freight + gstAmount;
  const landedUnit = landedTotal / effectiveQty;

  if (b.maxUnitPrice != null && landedUnit > b.maxUnitPrice) flags.push("over_budget");

  return {
    comparable: true,
    effectiveQty,
    goodsPerUnit,
    landedUnit: round(landedUnit, 4),
    landedTotal: round(landedTotal, 2),
    gstAmount: round(gstAmount, 2),
    freight: round(freight, 2),
    flags,
  };
}

export function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** GST rate given as 18 or 0.18 -> 0.18 */
export function normaliseGstRate(r: number | null | undefined): number | null {
  if (r == null || !Number.isFinite(r) || r < 0) return null;
  return r > 1 ? r / 100 : r;
}
