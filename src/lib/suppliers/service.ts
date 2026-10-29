// Adding suppliers to the directory, by hand or by CSV. Validates and de-duplicates.

import { z } from "zod";
import { db } from "@/lib/db/admin";
import { CATEGORIES } from "@/lib/domain/categories";
import { checkGstin } from "@/lib/domain/gstin";
import { isValidPincode, STATES } from "@/lib/domain/geo";
import { normaliseIndianPhone } from "@/lib/domain/phone";
import { refreshTrust } from "@/lib/pipeline/trust-service";
import type { Supplier } from "@/lib/db/types";

const CAT_IDS = CATEGORIES.map((c) => c.id);

export const SupplierInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(20),
  city: z.string().trim().max(60).optional().nullable(),
  state: z.string().trim().optional().nullable(),
  pincode: z.string().trim().optional().nullable(),
  categories: z.array(z.string()).min(1),
  gstin: z.string().trim().optional().nullable(),
  is_manufacturer: z.boolean().optional().nullable(),
  contact_person: z.string().trim().max(80).optional().nullable(),
  email: z.string().trim().max(120).optional().nullable(),
  website: z.string().trim().max(200).optional().nullable(),
  source: z.enum(["manual", "csv", "indiamart_manual", "referral"]).default("manual"),
});
export type SupplierInput = z.infer<typeof SupplierInputSchema>;

export type AddResult = { ok: true; supplier: Supplier } | { ok: false; error: string };

export async function addSupplier(input: SupplierInput): Promise<AddResult> {
  const phone = normaliseIndianPhone(input.phone);
  if (!phone) return { ok: false, error: `Invalid phone "${input.phone}"` };
  const cats = input.categories.map((c) => c.trim()).filter((c) => CAT_IDS.includes(c));
  if (!cats.length) return { ok: false, error: `Unknown categories "${input.categories.join(";")}". Use: ${CAT_IDS.join(", ")}` };
  let gstin: string | null = null;
  if (input.gstin) {
    const g = checkGstin(input.gstin);
    // Keep the bad GSTIN so vetting blocks the supplier visibly, instead of silently dropping it.
    gstin = g.gstin || null;
  }
  if (input.pincode && !isValidPincode(input.pincode)) return { ok: false, error: `Invalid pincode "${input.pincode}"` };
  const state = input.state ? STATES.find((s) => s.toLowerCase() === input.state!.toLowerCase()) ?? null : null;
  if (input.state && !state) return { ok: false, error: `Unknown state "${input.state}"` };

  const { data, error } = await db()
    .from("suppliers")
    .insert({
      name: input.name,
      phone,
      whatsapp: phone,
      city: input.city ?? null,
      state,
      pincode: input.pincode ?? null,
      categories: cats,
      gstin,
      is_manufacturer: input.is_manufacturer ?? null,
      contact_person: input.contact_person ?? null,
      email: input.email ?? null,
      website: input.website ?? null,
      source: input.source,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: `Already in the directory (same phone or GSTIN): ${input.name}` };
    return { ok: false, error: error.message };
  }
  const { supplier } = await refreshTrust(data as Supplier);
  return { ok: true, supplier };
}

/** Minimal RFC 4180 CSV parser (quotes, escaped quotes, commas and newlines in quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

export const CSV_COLUMNS = ["name", "phone", "city", "state", "pincode", "categories", "gstin", "is_manufacturer", "contact_person", "email", "website"];

export async function importCsv(text: string): Promise<{ added: number; errors: string[] }> {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  if (rows.length < 2) return { added: 0, errors: ["CSV needs a header row and at least one supplier"] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (c: string) => header.indexOf(c);
  if (idx("name") < 0 || idx("phone") < 0 || idx("categories") < 0) return { added: 0, errors: ["Header must include name, phone and categories"] };
  if (rows.length > 2001) return { added: 0, errors: ["Import at most 2,000 suppliers at a time"] };

  let added = 0;
  const errors: string[] = [];
  for (let r = 1; r < rows.length; r++) {
    const get = (c: string) => (idx(c) >= 0 ? rows[r][idx(c)]?.trim() || null : null);
    const parsed = SupplierInputSchema.safeParse({
      name: get("name"),
      phone: get("phone"),
      city: get("city"),
      state: get("state"),
      pincode: get("pincode"),
      categories: (get("categories") ?? "").split(/[;|]/).filter(Boolean),
      gstin: get("gstin"),
      is_manufacturer: get("is_manufacturer") == null ? null : /^(y|yes|true|1|manufacturer)$/i.test(get("is_manufacturer")!),
      contact_person: get("contact_person"),
      email: get("email"),
      website: get("website"),
      source: "csv",
    });
    if (!parsed.success) {
      errors.push(`Row ${r + 1}: ${parsed.error.issues[0].path.join(".")} ${parsed.error.issues[0].message}`);
      continue;
    }
    const res = await addSupplier(parsed.data);
    if (res.ok) added++;
    else errors.push(`Row ${r + 1}: ${res.error}`);
  }
  return { added, errors };
}
