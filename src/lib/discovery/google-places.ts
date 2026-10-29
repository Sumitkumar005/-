// Optional discovery source: Google Places (New) Text Search. Finds businesses by category near the
// buyer and adds them to the directory with source "google_places". They have no GSTIN yet; the call
// script asks for it.

import { db } from "@/lib/db/admin";
import { env } from "@/lib/env";
import { getCategory } from "@/lib/domain/categories";
import { normaliseIndianPhone } from "@/lib/domain/phone";

type Place = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  addressComponents?: { longText: string; types: string[] }[];
};

export async function discoverFromPlaces(categoryId: string, near: { pincode?: string | null; city?: string | null }): Promise<number> {
  const key = env.googlePlacesKey;
  if (!key) return 0;
  const cat = getCategory(categoryId);
  const where = near.pincode ?? near.city ?? "India";
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.nationalPhoneNumber,places.location,places.rating,places.userRatingCount,places.websiteUri,places.addressComponents",
    },
    body: JSON.stringify({ textQuery: `${cat.label} manufacturer wholesaler near ${where}`, maxResultCount: 20, regionCode: "IN" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return 0;
  const { places = [] } = (await res.json()) as { places?: Place[] };

  let added = 0;
  for (const p of places) {
    const phone = normaliseIndianPhone(p.internationalPhoneNumber ?? p.nationalPhoneNumber);
    if (!phone || !p.displayName?.text) continue;
    const comp = (t: string) => p.addressComponents?.find((c) => c.types.includes(t))?.longText ?? null;
    const { error } = await db().from("suppliers").insert({
      name: p.displayName.text,
      phone,
      website: p.websiteUri ?? null,
      address: p.formattedAddress ?? null,
      city: comp("locality"),
      state: comp("administrative_area_level_1"),
      pincode: comp("postal_code"),
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      categories: [cat.id],
      review_rating: p.rating ?? null,
      review_count: p.userRatingCount ?? null,
      source: "google_places",
      source_ref: p.id,
    });
    if (!error) added++;
    // Duplicate phone means we already know this supplier: make sure the category is recorded.
    else if (error.code === "23505") {
      const { data } = await db().from("suppliers").select("id, categories").eq("phone", phone).maybeSingle();
      if (data && !(data.categories as string[]).includes(cat.id)) {
        await db().from("suppliers").update({ categories: [...(data.categories as string[]), cat.id] }).eq("id", data.id);
      }
    }
  }
  return added;
}
