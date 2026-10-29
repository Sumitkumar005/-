// Supplier trust as a deduction ledger: start at 100, every deduction carries a reason the buyer can read.
// Checks we could not run are shown as "not checked", never silently scored.

import { checkGstin } from "./gstin";

export type GstStatus = "active" | "cancelled" | "suspended" | "unknown";

export type TrustInput = {
  gstin?: string | null;
  state?: string | null;
  isManufacturer?: boolean | null;
  reviewRating?: number | null;
  reviewCount?: number | null;
  yearEstablished?: number | null;
  verification?: {
    gstStatus?: GstStatus;
    registeredOn?: string | null; // ISO date
    filingRegular?: boolean | null;
    provider?: string;
  };
  history?: {
    ordersCount: number;
    lateCount: number;
    qualityIssues: number;
    notHonoured: number;
    disputes: number;
    callsTotal: number;
    callsAnswered: number;
  };
};

export type LedgerEntry = {
  code: string;
  label: string;
  points: number; // negative for deductions, 0 for info
  kind: "deduction" | "passed" | "info" | "not_checked";
};

export type TrustBand = "trusted" | "check" | "risky" | "blocked";

export type TrustResult = { score: number; band: TrustBand; ledger: LedgerEntry[]; hardFail: boolean };

export const BAND_LABEL: Record<TrustBand, string> = {
  trusted: "Trusted",
  check: "Check first",
  risky: "Risky",
  blocked: "Blocked",
};

export function computeTrust(input: TrustInput, now: Date = new Date()): TrustResult {
  const ledger: LedgerEntry[] = [];
  let hardFail = false;
  const add = (e: LedgerEntry) => ledger.push(e);

  // GST identity
  const g = checkGstin(input.gstin);
  if (!g.valid && g.reason === "empty") {
    add({ code: "gstin_missing", label: "No GSTIN on record", points: -15, kind: "deduction" });
  } else if (!g.valid) {
    hardFail = true;
    add({ code: "gstin_invalid", label: `GSTIN fails ${g.reason === "checksum" ? "checksum" : "format"} check`, points: -60, kind: "deduction" });
  } else {
    add({ code: "gstin_valid", label: "GSTIN format and checksum valid", points: 0, kind: "passed" });
    if (input.state && g.state.toLowerCase() !== input.state.toLowerCase()) {
      add({ code: "gst_state_mismatch", label: `GSTIN registered in ${g.state}, address says ${input.state}`, points: -10, kind: "deduction" });
    }
  }

  const v = input.verification ?? {};
  const status = v.gstStatus ?? "unknown";
  if (status === "cancelled" || status === "suspended") {
    hardFail = true;
    add({ code: "gst_inactive", label: `GST registration ${status}`, points: -60, kind: "deduction" });
  } else if (status === "active") {
    add({ code: "gst_active", label: "GST registration active", points: 0, kind: "passed" });
  } else if (g.valid) {
    add({ code: "gst_status_unchecked", label: "GST status not checked (no GST data provider configured)", points: 0, kind: "not_checked" });
  }

  if (v.registeredOn) {
    const ageYears = (now.getTime() - new Date(v.registeredOn).getTime()) / (365.25 * 86_400_000);
    if (ageYears < 1) add({ code: "gst_new", label: "GST registered less than a year ago", points: -10, kind: "deduction" });
  }
  if (v.filingRegular === false) add({ code: "filing_irregular", label: "GST returns filed irregularly", points: -15, kind: "deduction" });
  else if (v.filingRegular === true) add({ code: "filing_regular", label: "GST returns filed regularly", points: 0, kind: "passed" });

  if (input.yearEstablished && now.getFullYear() - input.yearEstablished >= 5) {
    add({ code: "established", label: `In business since ${input.yearEstablished}`, points: 0, kind: "passed" });
  }
  if (input.isManufacturer === false) {
    add({ code: "trader", label: "Trader, not the manufacturer", points: -5, kind: "deduction" });
  }

  // Public reviews: only meaningful with enough of them
  if (input.reviewRating != null && (input.reviewCount ?? 0) >= 10) {
    if (input.reviewRating < 3.5) add({ code: "low_reviews", label: `Low public rating (${input.reviewRating} from ${input.reviewCount})`, points: -10, kind: "deduction" });
    else add({ code: "good_reviews", label: `Public rating ${input.reviewRating} from ${input.reviewCount}`, points: 0, kind: "passed" });
  }

  // Our own history: the part nobody else has
  const h = input.history;
  if (h) {
    if (h.notHonoured > 0) add({ code: "quote_not_honoured", label: `Did not honour quote ${h.notHonoured}x`, points: -Math.min(45, 15 * h.notHonoured), kind: "deduction" });
    if (h.lateCount > 0) add({ code: "late_delivery", label: `Late delivery ${h.lateCount}x`, points: -Math.min(32, 8 * h.lateCount), kind: "deduction" });
    if (h.qualityIssues > 0) add({ code: "quality_issue", label: `Quality complaint ${h.qualityIssues}x`, points: -Math.min(36, 12 * h.qualityIssues), kind: "deduction" });
    if (h.disputes > 0) add({ code: "dispute", label: `Dispute ${h.disputes}x`, points: -Math.min(40, 20 * h.disputes), kind: "deduction" });
    const clean = h.ordersCount - h.lateCount - h.qualityIssues;
    if (h.ordersCount > 0 && clean > 0) add({ code: "orders_ok", label: `${clean} order${clean > 1 ? "s" : ""} delivered cleanly via BhavTaav`, points: 0, kind: "passed" });
    if (h.callsTotal >= 4 && h.callsAnswered / h.callsTotal < 0.3) {
      add({ code: "hard_to_reach", label: "Rarely picks up", points: -5, kind: "deduction" });
    }
  } else {
    add({ code: "no_history", label: "No orders through BhavTaav yet", points: 0, kind: "info" });
  }

  const score = Math.max(0, Math.min(100, 100 + ledger.reduce((s, e) => s + e.points, 0)));
  const band: TrustBand = hardFail ? "blocked" : score >= 80 ? "trusted" : score >= 60 ? "check" : "risky";
  return { score, band, ledger, hardFail };
}
