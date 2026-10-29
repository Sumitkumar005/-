// Location matching without geocoding: Indian pincodes are hierarchical, and the
// first three digits identify a sorting district. Good enough to rank suppliers by nearness.

import { GST_STATE_CODES } from "./gstin";

export const STATES = Object.values(GST_STATE_CODES).sort();

/** Metro clusters where cross-state supply is normal (e.g. Okhla to Gurugram). */
const METRO_CLUSTERS: Record<string, string[]> = {
  "Delhi NCR": ["110", "121", "122", "124", "131", "201", "203"],
  "Mumbai MMR": ["400", "401", "410", "421"],
  Bengaluru: ["560", "561", "562"],
  Surat: ["394", "395"],
  Ahmedabad: ["380", "382"],
  Chennai: ["600", "601", "602", "603"],
  Hyderabad: ["500", "501", "502"],
  Kolkata: ["700", "711", "712", "743"],
  Ludhiana: ["141", "142"],
  Tiruppur: ["638", "641"],
};

export function isValidPincode(pin: string | null | undefined): boolean {
  return /^[1-9][0-9]{5}$/.test((pin ?? "").trim());
}

export function metroOf(pin: string | null | undefined): string | null {
  if (!isValidPincode(pin)) return null;
  const p3 = pin!.slice(0, 3);
  for (const [name, prefixes] of Object.entries(METRO_CLUSTERS)) if (prefixes.includes(p3)) return name;
  return null;
}

export type Proximity = "local" | "metro" | "state" | "national";

export const PROXIMITY_LABEL: Record<Proximity, string> = {
  local: "Same district",
  metro: "Same metro area",
  state: "Same state",
  national: "Other state",
};

export function proximity(
  buyer: { pincode?: string | null; state?: string | null },
  supplier: { pincode?: string | null; state?: string | null },
): Proximity {
  const bp = buyer.pincode ?? "";
  const sp = supplier.pincode ?? "";
  if (isValidPincode(bp) && isValidPincode(sp) && bp.slice(0, 3) === sp.slice(0, 3)) return "local";
  const bm = metroOf(bp);
  if (bm && bm === metroOf(sp)) return "metro";
  if (buyer.state && supplier.state && buyer.state.toLowerCase() === supplier.state.toLowerCase()) return "state";
  return "national";
}

export const PROXIMITY_RANK: Record<Proximity, number> = { local: 0, metro: 1, state: 2, national: 3 };
