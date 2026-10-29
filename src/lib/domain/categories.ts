// Category templates: which spec fields matter for a category, its buying unit and default GST.
// Adding a category is a config change here, not new pipeline code.

export type Unit = "pieces" | "metres" | "kg" | "rolls" | "sheets";

export type SpecField = {
  key: string;
  label: string;
  type: "number" | "text" | "select" | "boolean";
  options?: string[];
  suffix?: string;
  required: boolean;
  hint?: string;
  /** How the value reads in a one-line summary, e.g. "{v} wall". */
  display?: string;
  /** Part of the price key: two specs with the same priced fields are price-comparable. */
  priced?: boolean;
};

export type CategoryTemplate = {
  id: string;
  label: string;
  group: "Food packaging" | "D2C packaging" | "Textiles" | "Other";
  unit: Unit;
  /** Default GST rate when the supplier does not state one. Confirm per HSN with your CA. */
  gstRate: number;
  hsnHint: string;
  keywords: string[];
  fields: SpecField[];
};

const PRINT_OPTIONS = ["plain", "1 colour", "2 colour", "4 colour (CMYK)"];

export const CATEGORIES: CategoryTemplate[] = [
  {
    id: "paper_cup",
    label: "Paper cups",
    group: "Food packaging",
    unit: "pieces",
    gstRate: 0.18,
    hsnHint: "4823",
    keywords: ["paper cup", "cups", "coffee cup", "tea cup", "kulhad cup", "glass paper"],
    fields: [
      { key: "capacity_ml", label: "Capacity", type: "number", suffix: "ml", required: true, priced: true },
      { key: "wall", label: "Wall", type: "select", options: ["single", "double", "ripple"], required: true, priced: true, display: "{v} wall" },
      { key: "gsm", label: "Paper GSM", type: "number", suffix: "gsm", required: false, priced: true, hint: "Leave blank if unsure, we will ask suppliers to propose" },
      { key: "print", label: "Print", type: "select", options: PRINT_OPTIONS, required: true, priced: true },
      { key: "lid", label: "Lids needed", type: "boolean", required: false },
    ],
  },
  {
    id: "food_container",
    label: "Food boxes and containers",
    group: "Food packaging",
    unit: "pieces",
    gstRate: 0.18,
    hsnHint: "4819 / 3923",
    keywords: ["food box", "container", "takeaway box", "biryani box", "pizza box", "meal tray", "bagasse", "clamshell", "burger box"],
    fields: [
      { key: "container_type", label: "Type", type: "select", options: ["box", "round container", "tray", "clamshell", "pizza box"], required: true, priced: true },
      { key: "material", label: "Material", type: "select", options: ["kraft paper", "paperboard", "bagasse", "aluminium", "PP plastic"], required: true, priced: true },
      { key: "size", label: "Size / capacity", type: "text", required: true, priced: true, hint: "e.g. 500 ml, or 8x8x2 inch" },
      { key: "print", label: "Print", type: "select", options: PRINT_OPTIONS, required: true, priced: true },
      { key: "leak_proof", label: "Leak proof", type: "boolean", required: false },
    ],
  },
  {
    id: "carry_bag",
    label: "Carry bags",
    group: "Food packaging",
    unit: "pieces",
    gstRate: 0.18,
    hsnHint: "4819 / 6305",
    keywords: ["carry bag", "paper bag", "shopping bag", "kraft bag", "non woven", "cloth bag", "jute bag"],
    fields: [
      { key: "material", label: "Material", type: "select", options: ["kraft paper", "white paper", "non-woven", "cotton", "jute"], required: true, priced: true },
      { key: "size", label: "Size", type: "text", required: true, priced: true, hint: "W x H x gusset in inches" },
      { key: "handle", label: "Handle", type: "select", options: ["twisted paper", "flat paper", "die-cut", "loop", "none"], required: false, priced: true },
      { key: "print", label: "Print", type: "select", options: PRINT_OPTIONS, required: true, priced: true },
    ],
  },
  {
    id: "standup_pouch",
    label: "Pouches (stand-up, zip, flat)",
    group: "D2C packaging",
    unit: "pieces",
    gstRate: 0.18,
    hsnHint: "3923 / 7607",
    keywords: ["pouch", "stand up", "zip lock", "ziplock", "laminated pouch", "doypack", "sachet"],
    fields: [
      { key: "pouch_type", label: "Type", type: "select", options: ["stand-up", "stand-up with zip", "flat", "3-side seal", "centre seal"], required: true, priced: true },
      { key: "material", label: "Material", type: "select", options: ["PET/PE", "metallised", "kraft laminate", "aluminium foil", "recyclable mono-PE"], required: true, priced: true },
      { key: "size", label: "Size / fill weight", type: "text", required: true, priced: true, hint: "e.g. 250 g, or 6x9 inch" },
      { key: "print", label: "Print", type: "select", options: ["plain", "rotogravure", "digital"], required: true, priced: true },
      { key: "window", label: "Window", type: "boolean", required: false },
    ],
  },
  {
    id: "mono_carton",
    label: "Mono cartons",
    group: "D2C packaging",
    unit: "pieces",
    gstRate: 0.18,
    hsnHint: "4819",
    keywords: ["mono carton", "carton", "product box", "duplex box", "packaging box", "rigid box"],
    fields: [
      { key: "board", label: "Board", type: "select", options: ["duplex", "FBB", "SBS", "kraft", "rigid"], required: true, priced: true },
      { key: "gsm", label: "Board GSM", type: "number", suffix: "gsm", required: false, priced: true },
      { key: "size", label: "Size (L x W x H)", type: "text", required: true, priced: true },
      { key: "print", label: "Print", type: "select", options: PRINT_OPTIONS, required: true, priced: true },
      { key: "finish", label: "Finish", type: "select", options: ["none", "gloss lamination", "matte lamination", "UV spot", "foil"], required: false, priced: true },
    ],
  },
  {
    id: "label",
    label: "Labels and stickers",
    group: "D2C packaging",
    unit: "pieces",
    gstRate: 0.18,
    hsnHint: "4821",
    keywords: ["label", "sticker", "barcode label", "product label"],
    fields: [
      { key: "material", label: "Material", type: "select", options: ["paper", "BOPP", "transparent", "vinyl"], required: true, priced: true },
      { key: "size", label: "Size", type: "text", required: true, priced: true, hint: "e.g. 50 x 70 mm" },
      { key: "format", label: "Format", type: "select", options: ["roll", "sheet"], required: false, priced: true },
      { key: "print", label: "Print", type: "select", options: PRINT_OPTIONS, required: true, priced: true },
    ],
  },
  {
    id: "fabric",
    label: "Fabric",
    group: "Textiles",
    unit: "metres",
    gstRate: 0.05,
    hsnHint: "5208-5516",
    keywords: ["fabric", "cloth", "cotton fabric", "rayon", "georgette", "chanderi", "linen", "kapda", "suiting", "shirting"],
    fields: [
      { key: "fabric_type", label: "Fabric", type: "text", required: true, priced: true, hint: "e.g. cotton cambric, rayon, georgette" },
      { key: "gsm", label: "GSM", type: "number", suffix: "gsm", required: false, priced: true },
      { key: "width_in", label: "Width", type: "number", suffix: "inch", required: false, priced: true },
      { key: "finish", label: "Dyed / printed", type: "select", options: ["greige", "dyed", "printed", "yarn dyed"], required: true, priced: true },
      { key: "colour", label: "Colour / design", type: "text", required: false },
    ],
  },
  {
    id: "other",
    label: "Something else",
    group: "Other",
    unit: "pieces",
    gstRate: 0.18,
    hsnHint: "confirm with supplier",
    keywords: [],
    fields: [
      { key: "description", label: "What exactly do you need", type: "text", required: true, priced: true, hint: "Material, size, finish, any brand you use today" },
    ],
  },
];

export const LAUNCH_CATEGORIES = CATEGORIES.filter((c) => c.id !== "other").map((c) => c.id);

export function getCategory(id: string | null | undefined): CategoryTemplate {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** Canonical key for price comparison across briefs. Lowercased, order-stable. */
export function specKey(categoryId: string, spec: Record<string, unknown>): string {
  const cat = getCategory(categoryId);
  const parts = cat.fields
    .filter((f) => f.priced)
    .map((f) => {
      const v = spec[f.key];
      if (v === undefined || v === null || v === "") return `${f.key}=?`;
      return `${f.key}=${String(v).trim().toLowerCase().replace(/\s+/g, " ")}`;
    });
  return [cat.id, ...parts].join("|");
}

/** Human readable one-liner of a spec, e.g. "250 ml, single wall, 2 colour". */
export function describeSpec(categoryId: string, spec: Record<string, unknown>): string {
  const cat = getCategory(categoryId);
  return cat.fields
    .map((f) => {
      const v = spec[f.key];
      if (v === undefined || v === null || v === "") return null;
      if (f.type === "boolean") return v ? f.label.toLowerCase() : null;
      if (f.display) return f.display.replace("{v}", String(v));
      return f.suffix ? `${v} ${f.suffix}` : String(v);
    })
    .filter(Boolean)
    .join(", ");
}

/** Required spec fields that are still empty. */
export function missingSpecFields(categoryId: string, spec: Record<string, unknown>): SpecField[] {
  return getCategory(categoryId).fields.filter((f) => {
    if (!f.required) return false;
    const v = spec[f.key];
    return v === undefined || v === null || v === "";
  });
}

/** Coerce raw values (from a form or an LLM) to the field types of the template, dropping unknown keys. */
export function cleanSpec(categoryId: string, raw: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const f of getCategory(categoryId).fields) {
    const v = raw[f.key];
    if (v === undefined || v === null || v === "") continue;
    if (f.type === "number") {
      const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.]/g, ""));
      if (Number.isFinite(n) && n > 0) out[f.key] = n;
    } else if (f.type === "boolean") {
      out[f.key] = v === true || v === "true" || v === "yes" || v === 1;
    } else if (f.type === "select") {
      const s = String(v).trim().toLowerCase();
      const match = f.options?.find((o) => o.toLowerCase() === s) ?? f.options?.find((o) => o.toLowerCase().startsWith(s) || s.startsWith(o.toLowerCase()));
      if (match) out[f.key] = match;
    } else {
      const s = String(v).trim().slice(0, 200);
      if (s) out[f.key] = s;
    }
  }
  return out;
}
