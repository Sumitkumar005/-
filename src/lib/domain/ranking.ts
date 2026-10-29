// Ranks comparable quotes with a simple, explainable score. Every shortlist pick comes with reasons.

import { round } from "./landed-cost";
import type { TrustBand } from "./trust";

export type RankInput = {
  supplierId: string;
  name: string;
  comparable: boolean;
  landedUnit: number | null;
  trustScore: number;
  trustBand: TrustBand;
  leadTimeDays: number | null;
  flags: string[];
};

export type Ranked = RankInput & {
  score: number;
  rank: number | null; // null = not eligible
  eligible: boolean;
  reasons: string[];
  flags: string[];
};

export type MarketStats = { count: number; min: number; median: number; max: number } | null;

const WEIGHTS = { price: 0.6, trust: 0.25, speed: 0.15 };
const FLAG_PENALTY: Record<string, number> = {
  moq_above_qty: 0.08,
  misses_deadline: 0.1,
  high_advance: 0.05,
  freight_estimated: 0.02,
  gst_assumed: 0.02,
  needs_confirmation: 0.04,
  over_budget: 0.05,
  no_sample: 0.02,
  well_above_market: 0.03,
};

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function marketStats(values: number[]): MarketStats {
  const v = values.filter((x) => Number.isFinite(x) && x > 0);
  if (!v.length) return null;
  return { count: v.length, min: Math.min(...v), median: median(v), max: Math.max(...v) };
}

export function rankQuotes(items: RankInput[], shortlistSize = 3): { ranked: Ranked[]; stats: MarketStats } {
  // Market view excludes suppliers that failed verification: their prices are not real options.
  const comparable = items.filter((i) => i.comparable && i.landedUnit != null && i.landedUnit > 0 && i.trustBand !== "blocked");
  const stats = marketStats(comparable.map((i) => i.landedUnit!));

  const withFlags = items.map((i) => {
    const flags = [...i.flags];
    if (stats && stats.count >= 3 && i.landedUnit != null) {
      if (i.landedUnit < stats.median * 0.6) flags.push("too_good_to_be_true");
      else if (i.landedUnit > stats.median * 1.5) flags.push("well_above_market");
    }
    return { ...i, flags: Array.from(new Set(flags)) };
  });

  const leadTimes = withFlags.map((i) => i.leadTimeDays).filter((x): x is number => x != null && x >= 0);
  const fastest = leadTimes.length ? Math.max(1, Math.min(...leadTimes)) : null;

  const scoredBase = withFlags.map((i) => {
    const blockers = new Set<string>();
    if (!i.comparable || i.landedUnit == null) blockers.add("Price unit could not be compared");
    if (i.trustBand === "blocked") blockers.add("Failed GST verification");
    if (i.flags.includes("too_good_to_be_true")) blockers.add("Price far below the market, needs a manual check");
    if (i.flags.includes("quote_expired")) blockers.add("Quote has expired");
    return { ...i, blockers: [...blockers], eligible: blockers.size === 0 };
  });

  const eligibleStats = marketStats(scoredBase.filter((s) => s.eligible).map((s) => s.landedUnit!));
  const best = eligibleStats?.min ?? 0;

  const scored: Ranked[] = scoredBase.map(({ blockers, ...i }) => {
    const eligible = i.eligible;

    let score = 0;
    if (eligible) {
      const priceScore = best / i.landedUnit!;
      const trustScore = i.trustScore / 100;
      const speedScore = i.leadTimeDays == null || fastest == null ? 0.5 : Math.min(1, fastest / Math.max(1, i.leadTimeDays));
      score = WEIGHTS.price * priceScore + WEIGHTS.trust * trustScore + WEIGHTS.speed * speedScore;
      for (const f of i.flags) score -= FLAG_PENALTY[f] ?? 0;
    }
    return { ...i, score: round(Math.max(0, score), 4), eligible, rank: null, reasons: blockers };
  });

  const eligibleSorted = scored
    .filter((s) => s.eligible)
    .sort((a, b) => b.score - a.score || a.landedUnit! - b.landedUnit! || b.trustScore - a.trustScore);
  eligibleSorted.forEach((s, idx) => {
    s.rank = idx + 1;
    s.reasons = explain(s, eligibleStats, stats, fastest, idx < shortlistSize);
  });

  const ranked = [...eligibleSorted, ...scored.filter((s) => !s.eligible)];
  return { ranked, stats };
}

function explain(s: Ranked, eligible: MarketStats, stats: MarketStats, fastest: number | null, shortlisted: boolean): string[] {
  const r: string[] = [];
  if (eligible && s.landedUnit != null) {
    if (s.landedUnit === eligible.min) r.push("Lowest landed cost");
    else {
      const pct = ((s.landedUnit - eligible.min) / eligible.min) * 100;
      r.push(`${pct.toFixed(1)}% above the lowest landed cost`);
    }
  }
  if (stats && s.landedUnit != null) {
    if (stats.count >= 3 && s.landedUnit < stats.median) r.push(`${(((stats.median - s.landedUnit) / stats.median) * 100).toFixed(0)}% below the median quote`);
  }
  if (s.trustBand === "trusted") r.push(`Trust score ${s.trustScore}`);
  else r.push(`Trust score ${s.trustScore}, check before paying`);
  if (s.leadTimeDays != null && fastest != null && s.leadTimeDays === fastest) r.push(`Fastest delivery (${s.leadTimeDays} days)`);
  if (!shortlisted) r.push("Ranked below the top three");
  return r;
}
