// Supplier simulator. Lets the full pipeline run end to end without dialling anyone.
// Facts (price, MOQ, terms) are decided in code from the supplier's sim profile, so every
// simulated call has a ground truth that extraction accuracy can be measured against.

import type { Brief, SimProfile, Supplier, Turn, InteractionOutcome } from "@/lib/db/types";
import { getCategory } from "@/lib/domain/categories";
import { round } from "@/lib/domain/landed-cost";

export type SimFacts = {
  outcome: InteractionOutcome;
  is_manufacturer: boolean;
  unit_price: number | null;
  price_basis: "per_unit" | "per_1000" | "per_kg";
  units_per_basis: number | null;
  per_unit_equiv: number | null;
  gst_included: boolean | null;
  gst_rate: number | null;
  moq: number | null;
  lead_time_days: number | null;
  freight_mode: "included" | "fixed" | "to_pay" | null;
  freight_amount: number | null;
  setup_cost: number | null;
  advance_pct: number | null;
  sample_available: boolean | null;
  sample_cost: number | null;
  defect_policy: string | null;
  gstin: string | null;
  duration_s: number;
};

// ---------------------------------------------------------------------------
// Deterministic randomness: same brief + supplier + attempt always gives the same call.
// ---------------------------------------------------------------------------
export function seededRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rough NCR market price per buyer unit, before GST and freight. Used only by the simulator. */
export function marketBasePrice(category: string, spec: Record<string, unknown>, qty: number): number {
  const num = (k: string, d: number) => (typeof spec[k] === "number" ? (spec[k] as number) : d);
  const print = String(spec.print ?? "plain");
  const printF = print.startsWith("4") || print === "rotogravure" ? 1.2 : print.startsWith("2") ? 1.08 : print.startsWith("1") || print === "digital" ? 1.0 : 0.9;
  let p: number;
  switch (category) {
    case "paper_cup": {
      const wall = String(spec.wall ?? "single");
      p = (0.55 + num("capacity_ml", 200) * 0.0018) * (wall === "double" ? 1.6 : wall === "ripple" ? 1.9 : 1) * printF;
      break;
    }
    case "food_container": {
      const m = String(spec.material ?? "");
      p = 4.2 * (m === "bagasse" ? 1.3 : m === "aluminium" ? 1.6 : m === "PP plastic" ? 0.9 : 1) * printF;
      break;
    }
    case "carry_bag":
      p = 6.5 * printF * (String(spec.material ?? "").includes("non") ? 0.8 : 1);
      break;
    case "standup_pouch":
      p = 4.8 * printF;
      break;
    case "mono_carton":
      p = 7.5 * printF;
      break;
    case "label":
      p = 0.65 * printF;
      break;
    case "fabric":
      p = 95;
      break;
    default:
      p = 25;
  }
  if (qty >= 50000) p *= 0.9;
  else if (qty >= 10000) p *= 0.95;
  return p;
}

/** Default profile for suppliers without one (e.g. imported ones) so simulation still works. */
export function defaultSimProfile(seed: string): SimProfile {
  const r = seededRng(seed);
  const personas: SimProfile["persona"][] = ["cooperative", "cooperative", "busy", "hard_bargainer", "trader", "not_interested"];
  return {
    persona: personas[Math.floor(r() * personas.length)],
    answer_rate: 0.75,
    price_factor: 0.9 + r() * 0.3,
    flex: round(0.02 + r() * 0.08, 2),
    moq: [1000, 2000, 5000][Math.floor(r() * 3)],
    lead_days: 4 + Math.floor(r() * 10),
    gst_style: (["plus", "including", "unstated"] as const)[Math.floor(r() * 3)],
    freight_style: (["included", "fixed", "to_pay"] as const)[Math.floor(r() * 3)],
    basis_style: (["per_unit", "per_1000", "per_unit", "per_kg"] as const)[Math.floor(r() * 4)],
    advance_pct: [0, 30, 50, 100][Math.floor(r() * 4)],
    sample: r() > 0.2,
    defect_policy: r() > 0.4 ? "replace defective pieces in next lot" : null,
  };
}

export function simulateFacts(brief: Brief, supplier: Supplier, attempt: number): SimFacts {
  const prof = supplier.sim_profile ?? defaultSimProfile(supplier.id);
  const r = seededRng(`${brief.id}:${supplier.id}:${attempt}`);
  const cat = getCategory(brief.category);
  const base: SimFacts = {
    outcome: "quoted", is_manufacturer: prof.persona !== "trader", unit_price: null, price_basis: "per_unit",
    units_per_basis: null, per_unit_equiv: null, gst_included: null, gst_rate: null, moq: null, lead_time_days: null,
    freight_mode: null, freight_amount: null, setup_cost: null, advance_pct: null, sample_available: null,
    sample_cost: null, defect_policy: null, gstin: null, duration_s: 20,
  };

  if (!supplier.categories.includes(brief.category)) return { ...base, outcome: "not_supplier", duration_s: 25 };
  if (r() > prof.answer_rate) return { ...base, outcome: "no_answer", duration_s: 0 };
  if (prof.persona === "annoyed") return { ...base, outcome: "opted_out", duration_s: 18 };
  if (prof.persona === "not_interested") return { ...base, outcome: "declined", duration_s: 35 };
  if (prof.persona === "busy" && attempt === 1) return { ...base, outcome: "callback", duration_s: 15 };

  const qty = brief.quantity ?? 1000;
  const perUnit = round(marketBasePrice(brief.category, brief.spec, qty) * prof.price_factor * (0.97 + r() * 0.06), cat.unit === "pieces" ? 2 : 0);

  let price_basis: SimFacts["price_basis"] = "per_unit";
  let unit_price = perUnit;
  let units_per_basis: number | null = null;
  if (cat.unit === "pieces" && prof.basis_style === "per_1000") {
    price_basis = "per_1000";
    unit_price = Math.round(perUnit * 1000);
  } else if (cat.unit === "pieces" && (prof.basis_style === "per_kg" || prof.basis_style === "per_kg_no_count") && perUnit < 3) {
    price_basis = "per_kg";
    const pcsPerKg = 100 + Math.round(r() * 8) * 10;
    unit_price = Math.round(perUnit * pcsPerKg);
    units_per_basis = prof.basis_style === "per_kg" ? pcsPerKg : null;
  }

  const printed = brief.spec.print && brief.spec.print !== "plain";
  return {
    ...base,
    outcome: "quoted",
    unit_price,
    price_basis,
    units_per_basis,
    per_unit_equiv: price_basis === "per_kg" && !units_per_basis ? null : perUnit,
    gst_included: prof.gst_style === "including" ? true : prof.gst_style === "plus" ? false : null,
    gst_rate: prof.gst_style === "plus" ? cat.gstRate : null,
    moq: prof.moq,
    lead_time_days: prof.lead_days,
    freight_mode: prof.freight_style,
    freight_amount: prof.freight_style === "fixed" ? 300 + Math.round(r() * 12) * 50 : null,
    setup_cost: printed && cat.group !== "Textiles" ? 1000 + Math.round(r() * 6) * 250 : null,
    advance_pct: prof.advance_pct,
    sample_available: prof.sample,
    sample_cost: prof.sample ? (r() > 0.5 ? 0 : 200 + Math.round(r() * 3) * 100) : null,
    defect_policy: prof.defect_policy,
    gstin: supplier.gstin,
    duration_s: 70 + Math.round(r() * 110),
  };
}

const basisWords = (f: SimFacts, unitWord: string) =>
  f.price_basis === "per_1000" ? `per 1000 ${unitWord}` : f.price_basis === "per_kg" ? "per kg" : `per ${unitWord}`;

/** Template transcript. Phrases are stable so the offline extractor can read them back. */
export function templateTranscript(f: SimFacts, opening: string, unitWord: string): Turn[] {
  const A = (text: string): Turn => ({ speaker: "agent", text });
  const S = (text: string): Turn => ({ speaker: "supplier", text });
  switch (f.outcome) {
    case "no_answer":
      return [];
    case "not_supplier":
      return [A(opening), S("Nahi ji, ye item hum nahi banate. Galat number hai shayad, hum doosra kaam karte hain.")];
    case "opted_out":
      return [A(opening), S("Mujhe aise calls mat karo. Mera number apni list se hata do."), A("Koi baat nahi, aapka number hum list se hata dete hain. Dhanyavaad.")];
    case "declined":
      return [A(opening), S("Abhi naya order nahi le rahe, capacity full hai. Agle mahine dekhna.")];
    case "callback":
      return [A(opening), S("Abhi busy hoon, kal call karna.")];
    default:
      break;
  }
  const t: Turn[] = [A(opening)];
  t.push(S(f.is_manufacturer ? "Haan ji, hum khud manufacture karte hain. Boliye." : "Haan ji, hum trader hain, factory se maal dilwate hain."));
  t.push(A(`Is spec ke liye aapka rate kya hoga? GST alag hai ya included?`));
  let rate = `Rate ₹${f.unit_price} ${basisWords(f, unitWord)} padega.`;
  if (f.price_basis === "per_kg") rate += f.units_per_basis ? ` Ek kg mein lagbhag ${f.units_per_basis} piece aate hain.` : " Kitne piece aate hain wo weight pe depend karta hai.";
  if (f.gst_included === true) rate += " GST including hai.";
  else if (f.gst_included === false) rate += ` GST ${Math.round((f.gst_rate ?? 0.18) * 100)}% alag se.`;
  t.push(S(rate));
  t.push(A("Minimum order kitna hai, aur delivery kitne din mein?"));
  t.push(S(`Minimum order ${f.moq} ${unitWord}. ${f.lead_time_days} din mein delivery ho jayegi.`));
  t.push(A("Transport ka kharcha?"));
  t.push(S(f.freight_mode === "included" ? "Transport hum karenge, free delivery." : f.freight_mode === "fixed" ? `Freight ₹${f.freight_amount} lagega poore order ka.` : "Transport to-pay rahega, aap dekh lena."));
  if (f.setup_cost) {
    t.push(A("Printing plate ka charge alag hai?"));
    t.push(S(`Haan, printing plate ka ₹${f.setup_cost} ek baar lagega.`));
  }
  t.push(A("Payment terms aur sample?"));
  const pay = f.advance_pct === 0 ? "Payment delivery pe, koi advance nahi." : f.advance_pct === 100 ? "Poora 100% advance chahiye." : `${f.advance_pct}% advance, baaki delivery pe.`;
  const sample = f.sample_available ? (f.sample_cost ? `Sample ₹${f.sample_cost} mein bhej denge.` : "Sample free bhej denge.") : "Sample nahi denge.";
  t.push(S(`${pay} ${sample}`));
  t.push(A("Defect nikla to?"));
  t.push(S(f.defect_policy ? "Defect hua to replace kar denge agle lot mein." : "Maal check karke hi bhejte hain, return nahi hota."));
  if (f.gstin) t.push(S(`Hamara GST number ${f.gstin} hai.`));
  t.push(A("Dhanyavaad. Buyer ko aapka quote dikha dete hain, agar select hua to aapko seedha call aayega."));
  return t;
}

/** Simulated reply to a counter-offer: gives ground up to the supplier's flexibility, never more. */
export function simulateCounter(prof: SimProfile, ownPerUnit: number, askPerUnit: number, seed: string): { outcome: "improved" | "held" | "declined"; newPerUnit: number | null } {
  const r = seededRng(seed);
  if (prof.persona === "hard_bargainer" && r() < 0.3) return { outcome: "held", newPerUnit: null };
  const floor = ownPerUnit * (1 - prof.flex);
  if (prof.flex < 0.01) return { outcome: "held", newPerUnit: null };
  const p = Math.max(floor, askPerUnit);
  const newPerUnit = round(p, ownPerUnit < 10 ? 2 : 0);
  return newPerUnit < ownPerUnit ? { outcome: "improved", newPerUnit } : { outcome: "held", newPerUnit: null };
}

export function counterReplyTranscript(message: string, result: { outcome: string; newPrice: number | null }, basisLabel: string): Turn[] {
  const t: Turn[] = [{ speaker: "agent", text: message }];
  if (result.outcome === "improved" && result.newPrice != null)
    t.push({ speaker: "supplier", text: `Theek hai, aapke liye final ₹${result.newPrice < 10 ? result.newPrice.toFixed(2) : result.newPrice} ${basisLabel} kar dete hain. Baaki terms same.` });
  else t.push({ speaker: "supplier", text: "Isse kam nahi hoga ji, rate already tight hai. Jo bataya wahi final hai." });
  return t;
}
