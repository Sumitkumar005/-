// Negotiation rules that are enforced in code, not left to the prompt:
// 1. Only cite a price that exists in a stored quote, or the buyer's own target.
// 2. Never name the competing supplier.
// 3. Never ask for more than MAX_DISCOUNT off the supplier's own price.
// 4. Any rupee figure in the outgoing message must be one of the allowed numbers.

import { round } from "./landed-cost";

export const MAX_DISCOUNT = 0.15;
export const MIN_DISCOUNT = 0.03;

export type CounterPlan = {
  /** Ask, in the supplier's own terms: price per buyer unit before GST and freight. */
  askUnitPrice: number;
  /** What we can truthfully say: the landed cost we are trying to beat. */
  citeLanded: number | null;
  citedQuoteId: string | null;
  basis: "competitor" | "target" | "discount";
};

export function planCounter(args: {
  ownLanded: number;
  ownGoodsPerUnit: number;
  competitor?: { quoteId: string; landed: number } | null;
  targetLanded?: number | null;
}): CounterPlan | null {
  const { ownLanded, ownGoodsPerUnit, competitor, targetLanded } = args;
  if (!(ownLanded > 0) || !(ownGoodsPerUnit > 0)) return null;

  let goalLanded: number;
  let basis: CounterPlan["basis"];
  let citedQuoteId: string | null = null;
  let citeLanded: number | null = null;

  if (competitor && competitor.landed < ownLanded) {
    goalLanded = competitor.landed;
    basis = "competitor";
    citedQuoteId = competitor.quoteId;
    citeLanded = round(competitor.landed, 2);
  } else if (targetLanded && targetLanded < ownLanded) {
    goalLanded = targetLanded;
    basis = "target";
    citeLanded = round(targetLanded, 2);
  } else {
    goalLanded = ownLanded * (1 - MIN_DISCOUNT);
    basis = "discount";
  }

  const ratio = Math.max(1 - MAX_DISCOUNT, Math.min(1 - MIN_DISCOUNT / 2, goalLanded / ownLanded));
  const askUnitPrice = round(ownGoodsPerUnit * ratio, ownGoodsPerUnit < 10 ? 2 : 0);
  if (!(askUnitPrice > 0) || askUnitPrice >= ownGoodsPerUnit) return null;
  return { askUnitPrice, citeLanded, citedQuoteId, basis };
}

/** Pulls every money-like figure from a message: "₹1.15", "Rs 1.15", "1.15 rupaye", "1 rupaya 15 paise". */
export function moneyFigures(text: string): number[] {
  const out: number[] = [];
  const re = /(?:₹|rs\.?|inr)\s*([0-9]+(?:[.,][0-9]+)?)|([0-9]+(?:\.[0-9]+)?)\s*(?:rupees?|rupaye?|rupay|rupaya|rs\b|₹)/gi;
  for (const m of text.matchAll(re)) {
    const v = Number((m[1] ?? m[2]).replace(",", ""));
    if (Number.isFinite(v)) out.push(v);
  }
  return out;
}

export function messageCitesOnly(text: string, allowed: number[]): boolean {
  return moneyFigures(text).every((v) => allowed.some((a) => Math.abs(a - v) < 0.011));
}

export function counterTemplate(plan: CounterPlan, unitLabel: string, lang: "hinglish" | "english" = "hinglish"): string {
  const per = unitLabel === "pieces" ? "piece" : unitLabel.replace(/s$/, "");
  const ask = `₹${plan.askUnitPrice}`;
  if (lang === "english") {
    if (plan.basis === "competitor")
      return `Thank you for the quote. Another verified supplier is coming in at ₹${plan.citeLanded} per ${per} delivered, GST included. If you can do ${ask} per ${per} before GST and freight, we can recommend you to the buyer.`;
    if (plan.basis === "target")
      return `Thank you for the quote. The buyer's budget is ₹${plan.citeLanded} per ${per} delivered with GST. Can you do ${ask} per ${per} before GST and freight?`;
    return `Thank you for the quote. This is a repeat requirement. Is there any room to come to ${ask} per ${per} before GST and freight?`;
  }
  if (plan.basis === "competitor")
    return `Quote ke liye dhanyavaad. Ek aur verified supplier ka rate delivery aur GST milake ₹${plan.citeLanded} per ${per} aa raha hai. Agar aap ${ask} per ${per} (GST aur freight alag) kar sakein, to hum aapko buyer ko recommend kar denge.`;
  if (plan.basis === "target")
    return `Quote ke liye dhanyavaad. Buyer ka budget delivery aur GST milake ₹${plan.citeLanded} per ${per} hai. Kya aap ${ask} per ${per} (GST aur freight alag) kar sakte hain?`;
  return `Quote ke liye dhanyavaad. Ye repeat requirement hai. Kya ${ask} per ${per} (GST aur freight alag) tak aa sakte hain?`;
}
