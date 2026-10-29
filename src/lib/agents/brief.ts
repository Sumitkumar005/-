// Brief agent: turns "need 5000 printed cups monthly for my cafe" into a structured, checkable brief.

import { z } from "zod";
import { llmJson } from "@/lib/llm/client";
import { CATEGORIES, cleanSpec, getCategory, missingSpecFields, type Unit } from "@/lib/domain/categories";
import { isValidPincode } from "@/lib/domain/geo";

const UNITS = ["pieces", "metres", "kg", "rolls", "sheets"] as const;
const FREQ = ["one_time", "weekly", "monthly", "quarterly"] as const;

export const ParsedBriefSchema = z.object({
  category: z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]]),
  title: z.string(),
  spec: z.array(z.object({ key: z.string(), value: z.string() })),
  quantity: z.number().nullable(),
  unit: z.enum(UNITS),
  frequency: z.enum(FREQ),
  needed_by: z.string().nullable(),
  delivery_pincode: z.string().nullable(),
  delivery_city: z.string().nullable(),
  target_unit_price: z.number().nullable(),
  max_unit_price: z.number().nullable(),
  current_unit_price: z.number().nullable(),
  must_haves: z.array(z.string()),
  questions: z.array(z.string()),
});
export type ParsedBrief = z.infer<typeof ParsedBriefSchema>;

export type BriefDraft = {
  title: string;
  category: string;
  spec: Record<string, string | number | boolean>;
  quantity: number | null;
  unit: Unit;
  frequency: (typeof FREQ)[number];
  needed_by: string | null;
  delivery_pincode: string | null;
  delivery_city: string | null;
  target_unit_price: number | null;
  max_unit_price: number | null;
  current_unit_price: number | null;
  must_haves: string[];
  open_questions: string[];
};

function catalogue(): string {
  return CATEGORIES.map((c) => {
    const fields = c.fields
      .map((f) => `${f.key}${f.required ? "*" : ""} (${f.type}${f.options ? `: ${f.options.join(" | ")}` : ""}${f.suffix ? `, ${f.suffix}` : ""})`)
      .join("; ");
    return `- ${c.id} "${c.label}", unit ${c.unit}. Fields: ${fields}`;
  }).join("\n");
}

const SYSTEM = `You are the intake desk of BhavTaav, a sourcing agent that buys wholesale goods for small Indian businesses.
Convert the buyer's message (English, Hindi or Hinglish) into a structured brief.

Categories and their spec fields (* = required):
${catalogue()}

Rules:
- Pick the closest category. Use "other" only if nothing fits, and put the full requirement in spec "description".
- spec is a list of {key, value} using only the field keys of the chosen category. For select fields use one of the listed options exactly.
- Never invent values the buyer did not state or clearly imply. Leave unknowns out of spec and null elsewhere.
- quantity is per order. "5k" = 5000, "ek lakh" = 100000. frequency "monthly" if they say monthly / har mahine.
- Prices are rupees per unit. target_unit_price = price they hope for; max_unit_price = most they will pay; current_unit_price = what they pay today. Do not guess.
- needed_by as YYYY-MM-DD, resolved against today's date, or null.
- delivery_pincode only if a 6-digit pincode is stated.
- must_haves: short phrases like "GST invoice", "sample before bulk", "food grade".
- questions: at most 2 short questions for anything important that is missing and not covered by required spec fields. Ask in simple English.
- title: 3 to 6 words, e.g. "250 ml printed paper cups".`;

export async function parseBrief(text: string, ctx: { today: string; buyerCity?: string; buyerPincode?: string }): Promise<BriefDraft> {
  const parsed = await llmJson(ParsedBriefSchema, {
    task: "parse_brief",
    system: SYSTEM,
    user: `Today is ${ctx.today}. Buyer is based in ${ctx.buyerCity ?? "India"}.\n\n<buyer_message>\n${text.slice(0, 2000)}\n</buyer_message>`,
    context: { text, today: ctx.today },
  });
  return finaliseDraft(parsed, ctx);
}

/** Deterministic clean-up after the model: types, ranges, and the questions we must ask. */
export function finaliseDraft(p: ParsedBrief, ctx: { today: string; buyerPincode?: string }): BriefDraft {
  const cat = getCategory(p.category);
  const spec = cleanSpec(cat.id, Object.fromEntries(p.spec.map((s) => [s.key, s.value])));
  const positive = (n: number | null) => (n != null && Number.isFinite(n) && n > 0 ? n : null);
  const pin = p.delivery_pincode && isValidPincode(p.delivery_pincode) ? p.delivery_pincode : ctx.buyerPincode ?? null;
  const neededBy = p.needed_by && /^\d{4}-\d{2}-\d{2}$/.test(p.needed_by) && p.needed_by >= ctx.today ? p.needed_by : null;

  let target = positive(p.target_unit_price);
  let max = positive(p.max_unit_price);
  if (target && max && target > max) [target, max] = [max, target];

  const questions = [
    ...missingSpecFields(cat.id, spec).map((f) => `${f.label}?`),
    ...(positive(p.quantity) ? [] : ["How many do you need per order?"]),
    ...p.questions.slice(0, 2),
  ];

  return {
    title: (p.title || cat.label).slice(0, 80),
    category: cat.id,
    spec,
    quantity: positive(p.quantity) ? Math.round(p.quantity!) : null,
    unit: cat.id === "other" ? p.unit : cat.unit,
    frequency: p.frequency,
    needed_by: neededBy,
    delivery_pincode: pin,
    delivery_city: p.delivery_city,
    target_unit_price: target,
    max_unit_price: max,
    current_unit_price: positive(p.current_unit_price),
    must_haves: Array.from(new Set(p.must_haves.map((m) => m.trim()).filter(Boolean))).slice(0, 8),
    open_questions: Array.from(new Set(questions)).slice(0, 6),
  };
}
