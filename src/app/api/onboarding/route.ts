import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/api";
import { db, must } from "@/lib/db/admin";
import { checkGstin } from "@/lib/domain/gstin";
import { isValidPincode, STATES } from "@/lib/domain/geo";
import { normaliseIndianPhone } from "@/lib/domain/phone";

const Schema = z.object({
  business_name: z.string().trim().min(2).max(120),
  business_type: z.enum(["cafe", "restaurant", "cloud_kitchen", "bakery", "retail", "boutique", "d2c_brand", "manufacturer", "other"]),
  contact_name: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  gstin: z.string().trim().max(20).optional().nullable(),
  city: z.string().trim().min(2).max(60),
  state: z.string().refine((s) => STATES.includes(s), "Pick a state from the list"),
  pincode: z.string().trim(),
});

export const POST = route(async ({ req, session }) => {
  const b = await body(req, Schema);
  if (!isValidPincode(b.pincode)) throw new HttpError(400, "Pincode must be 6 digits");
  const phone = b.phone ? normaliseIndianPhone(b.phone) : null;
  if (b.phone && !phone) throw new HttpError(400, "Enter a valid Indian phone number");
  let gstin: string | null = null;
  if (b.gstin) {
    const g = checkGstin(b.gstin);
    if (!g.valid) throw new HttpError(400, "That GSTIN does not look right. Check for typos, or leave it blank.");
    gstin = g.gstin;
  }
  const row = { owner_id: session.userId, business_name: b.business_name, business_type: b.business_type, contact_name: b.contact_name ?? null, phone, gstin, city: b.city, state: b.state, pincode: b.pincode };
  const saved = must(await db().from("buyers").upsert(row, { onConflict: "owner_id" }).select("*").single(), "save buyer");
  return ok(saved);
});
