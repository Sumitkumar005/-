// Offline stand-in for the LLM so the whole product runs locally with no API key.
// Rule-based and limited by design: it understands the simulator's phrasing and common brief wording.

import { CATEGORIES } from "@/lib/domain/categories";
import type { Turn } from "@/lib/db/types";

export async function mockJson(task: string, context: unknown, user: string): Promise<unknown> {
  switch (task) {
    case "parse_brief":
      return mockParseBrief((context as { text: string; today: string }) ?? { text: user, today: new Date().toISOString().slice(0, 10) });
    case "extract_quote":
      return mockExtract((context as { turns: Turn[] }).turns);
    case "extract_counter":
      return mockCounter((context as { turns: Turn[] }).turns);
    default:
      throw new Error(`Offline mode cannot run task "${task}". Set GROQ_API_KEY.`);
  }
}

const num = (s: string | undefined) => (s ? Number(s.replace(/,/g, "")) : null);

function mockParseBrief({ text, today }: { text: string; today: string }) {
  const t = text.toLowerCase();
  let best = { id: "other", score: 0 };
  for (const c of CATEGORIES) {
    const score = c.keywords.reduce((s, k) => s + (t.includes(k) ? k.length : 0), 0);
    if (score > best.score) best = { id: c.id, score };
  }
  const cat = CATEGORIES.find((c) => c.id === best.id)!;
  const spec: { key: string; value: string }[] = [];
  const ml = t.match(/(\d{2,4})\s*ml/);
  if (ml && cat.fields.some((f) => f.key === "capacity_ml")) spec.push({ key: "capacity_ml", value: ml[1] });
  if (ml && cat.fields.some((f) => f.key === "size") && !spec.length) spec.push({ key: "size", value: `${ml[1]} ml` });
  const size = text.match(/(\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?(?:\s*[x×]\s*\d+(?:\.\d+)?)?\s*(?:inch|in|mm|cm)?)/i);
  if (size && cat.fields.some((f) => f.key === "size") && !spec.some((s) => s.key === "size")) spec.push({ key: "size", value: size[1] });
  const grams = t.match(/(\d{2,4})\s*(?:g|gm|gram)s?\b/);
  if (grams && cat.id === "standup_pouch" && !spec.some((s) => s.key === "size")) spec.push({ key: "size", value: `${grams[1]} g` });
  if (/double wall/.test(t)) spec.push({ key: "wall", value: "double" });
  else if (/ripple/.test(t)) spec.push({ key: "wall", value: "ripple" });
  else if (/single wall|single/.test(t)) spec.push({ key: "wall", value: "single" });
  const colours = t.match(/(\d)\s*colou?r/);
  if (colours) spec.push({ key: "print", value: colours[1] === "1" ? "1 colour" : colours[1] === "2" ? "2 colour" : "4 colour (CMYK)" });
  else if (/plain|no print|without print/.test(t)) spec.push({ key: "print", value: "plain" });
  else if (/logo|printed|print/.test(t)) spec.push({ key: "print", value: cat.id === "standup_pouch" ? "digital" : "1 colour" });
  for (const f of cat.fields) {
    if (f.type !== "select" || spec.some((s) => s.key === f.key)) continue;
    const opt = f.options?.find((o) => t.includes(o.toLowerCase()));
    if (opt) spec.push({ key: f.key, value: opt });
  }
  if (cat.id === "other") spec.push({ key: "description", value: text.slice(0, 200) });

  const qm = t.match(/(\d[\d,]*(?:\.\d+)?)\s*(k|lakh|thousand|hazaar|pcs|pieces|piece|nos|units|metres?|meters?|mtr|kg)\b/);
  let quantity = qm ? num(qm[1]) : null;
  if (quantity && qm) {
    if (qm[2] === "k" || qm[2] === "thousand" || qm[2] === "hazaar") quantity *= 1000;
    if (qm[2] === "lakh") quantity *= 100000;
  }
  if (!quantity) {
    // Fall back to the first plain number that is not a size, price or pincode.
    for (const m of t.matchAll(/(?<![₹\d.x×])\b(\d[\d,]{1,8})\b(?!\s*(?:ml|g\b|gm|gsm|inch|in\b|mm|cm|x|×|colou?r|rs|rupees?|%|days?|weeks?))/g)) {
      const n = num(m[1])!;
      if (n >= 10 && !/^[1-9]\d{5}$/.test(m[1])) {
        quantity = n;
        break;
      }
    }
  }
  const prices = [...t.matchAll(/(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rs|rupees?|rupaye)/g)].map((m) => Number(m[1] ?? m[2]));
  const current = /(?:currently|today|abhi|right now|paying)[^.]*?(?:₹|rs\.?)\s*(\d+(?:\.\d+)?)/.exec(t);
  const pin = text.match(/\b([1-9]\d{5})\b/);
  const weeks = t.match(/(?:in|within)\s*(\d+)\s*weeks?/);
  const days = t.match(/(?:in|within)\s*(\d+)\s*days?/);
  let needed_by: string | null = null;
  const add = weeks ? Number(weeks[1]) * 7 : days ? Number(days[1]) : null;
  if (add) needed_by = new Date(new Date(today + "T00:00:00Z").getTime() + add * 86400000).toISOString().slice(0, 10);

  const must: string[] = [];
  if (/gst (bill|invoice)|gst invoice|with gst/.test(t)) must.push("GST invoice");
  if (/sample/.test(t)) must.push("Sample before bulk");
  if (/food grade/.test(t)) must.push("Food grade");

  const currentPrice = current ? Number(current[1]) : null;
  const otherPrices = prices.filter((p) => p !== currentPrice);
  return {
    category: cat.id,
    title: cat.label + (ml ? ` ${ml[1]} ml` : ""),
    spec,
    quantity,
    unit: cat.unit,
    frequency: /monthly|every month|per month|har mahine|a month/.test(t) ? "monthly" : /weekly|every week|har hafte/.test(t) ? "weekly" : "one_time",
    needed_by,
    delivery_pincode: pin ? pin[1] : null,
    delivery_city: null,
    target_unit_price: /budget|target|around|under|max/.test(t) && otherPrices.length ? otherPrices[0] : null,
    max_unit_price: /max|not more than|under/.test(t) && otherPrices.length ? Math.max(...otherPrices) : null,
    current_unit_price: currentPrice,
    must_haves: must,
    questions: [],
  };
}

function supplierText(turns: Turn[]) {
  return turns.filter((x) => x.speaker === "supplier").map((x) => x.text).join(" ");
}

function mockExtract(turns: Turn[]) {
  const s = supplierText(turns);
  const l = s.toLowerCase();
  const base = {
    callback_after_hours: null as number | null,
    is_manufacturer: /trader/.test(l) ? false : /manufacture/.test(l) ? true : null,
    quote: {
      unit_price: null as number | null, price_basis: "per_unit", units_per_basis: null as number | null,
      gst_included: null as boolean | null, gst_rate_percent: null as number | null, moq: null as number | null,
      lead_time_days: null as number | null, freight_mode: "unknown", freight_amount: null as number | null,
      setup_cost: null as number | null, sample_available: null as boolean | null, sample_cost: null as number | null,
      payment_terms: null as string | null, advance_pct: null as number | null, defect_policy: null as string | null,
      valid_days: null, gstin: null as string | null,
    },
    confidence: { price: 0, terms: 0 },
  };
  if (!s.trim()) return { ...base, outcome: "no_answer", summary: "Nobody picked up." };
  if (/list se hata|mat karo|don't call|remove my number/.test(l)) return { ...base, outcome: "opted_out", summary: "Asked not to be called again." };
  if (/nahi banate|galat number|doosra kaam/.test(l)) return { ...base, outcome: "not_supplier", summary: "Does not supply this item." };
  if (/order nahi le rahe|capacity full/.test(l)) return { ...base, outcome: "declined", summary: "Not taking new orders right now." };
  if (/busy|call karna|baad mein/.test(l) && !/rate/.test(l)) return { ...base, outcome: "callback", callback_after_hours: 20, summary: "Busy, asked for a call back." };

  const q = base.quote;
  const rate = s.match(/Rate ₹([\d.]+) (per 1000|per kg|per \w+)/i);
  if (rate) {
    q.unit_price = Number(rate[1]);
    q.price_basis = /1000/.test(rate[2]) ? "per_1000" : /kg/.test(rate[2]) ? "per_kg" : "per_unit";
  }
  const pcs = s.match(/lagbhag (\d+) piece/);
  if (pcs) q.units_per_basis = Number(pcs[1]);
  if (/GST including/i.test(s)) q.gst_included = true;
  const gst = s.match(/GST (\d+)% alag/);
  if (gst) {
    q.gst_included = false;
    q.gst_rate_percent = Number(gst[1]);
  }
  const moq = s.match(/Minimum order (\d+)/);
  if (moq) q.moq = Number(moq[1]);
  const lead = s.match(/(\d+) din mein delivery/);
  if (lead) q.lead_time_days = Number(lead[1]);
  if (/free delivery/.test(l)) q.freight_mode = "included";
  const fr = s.match(/Freight ₹(\d+)/);
  if (fr) {
    q.freight_mode = "fixed";
    q.freight_amount = Number(fr[1]);
  }
  if (/to-pay/.test(l)) q.freight_mode = "to_pay";
  const setup = s.match(/plate ka ₹(\d+)/);
  if (setup) q.setup_cost = Number(setup[1]);
  const adv = s.match(/(\d+)% advance/);
  if (adv) q.advance_pct = Number(adv[1]);
  if (/koi advance nahi/.test(l)) q.advance_pct = 0;
  const payLine = s.match(/(Payment delivery pe, koi advance nahi\.|Poora 100% advance chahiye\.|\d+% advance, baaki delivery pe\.)/);
  if (payLine) q.payment_terms = payLine[1];
  if (/sample nahi/.test(l)) q.sample_available = false;
  else if (/sample free/.test(l)) {
    q.sample_available = true;
    q.sample_cost = 0;
  } else {
    const sc = s.match(/Sample ₹(\d+)/);
    if (sc) {
      q.sample_available = true;
      q.sample_cost = Number(sc[1]);
    }
  }
  if (/replace kar denge/.test(l)) q.defect_policy = "Replaces defective pieces in the next lot";
  else if (/return nahi/.test(l)) q.defect_policy = "No returns";
  const g = s.match(/GST number ([0-9A-Z]{15})/);
  if (g) q.gstin = g[1];

  const summary = q.unit_price ? `Quoted ₹${q.unit_price} ${q.price_basis.replace("_", " ")}${q.moq ? `, MOQ ${q.moq}` : ""}${q.lead_time_days ? `, ${q.lead_time_days} days` : ""}.` : "Spoke but no clear price.";
  return {
    ...base,
    outcome: q.unit_price ? "quoted" : "callback",
    summary,
    confidence: { price: q.unit_price ? (q.price_basis === "per_kg" && !q.units_per_basis ? 0.6 : 0.95) : 0.2, terms: 0.9 },
  };
}

function mockCounter(turns: Turn[]) {
  const s = supplierText(turns);
  const m = s.match(/final ₹([\d.]+)/);
  if (m) return { outcome: "improved", new_unit_price: Number(m[1]), summary: `Came down to ₹${m[1]}.` };
  return { outcome: "held", new_unit_price: null, summary: "Kept the original price." };
}
