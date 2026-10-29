// GSTIN structure: 2-digit state code + 10-char PAN + entity number + 'Z' + check character.
// The check character uses a base-36 weighted checksum, so typos and made-up numbers are caught offline.

const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra", "29": "Karnataka", "30": "Goa",
  "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
  "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
};

export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = CHARS.indexOf(first14[i]);
    if (value < 0) return "";
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36];
}

export type GstinCheck =
  | { valid: true; gstin: string; stateCode: string; state: string; pan: string }
  | { valid: false; gstin: string; reason: "empty" | "format" | "state_code" | "checksum" };

export function normaliseGstin(input: string | null | undefined): string {
  return (input ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function checkGstin(input: string | null | undefined): GstinCheck {
  const gstin = normaliseGstin(input);
  if (!gstin) return { valid: false, gstin, reason: "empty" };
  if (!GSTIN_RE.test(gstin)) return { valid: false, gstin, reason: "format" };
  const stateCode = gstin.slice(0, 2);
  const state = GST_STATE_CODES[stateCode];
  if (!state) return { valid: false, gstin, reason: "state_code" };
  if (gstinCheckChar(gstin.slice(0, 14)) !== gstin[14]) return { valid: false, gstin, reason: "checksum" };
  return { valid: true, gstin, stateCode, state, pan: gstin.slice(2, 12) };
}

/** Builds a checksum-valid GSTIN. Used for demo seed data only. */
export function buildGstin(stateCode: string, pan: string, entity = "1"): string {
  const first14 = `${stateCode}${pan}${entity}Z`;
  return first14 + gstinCheckChar(first14);
}

const UDYAM_RE = /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/;
export function isValidUdyam(input: string | null | undefined): boolean {
  return UDYAM_RE.test((input ?? "").trim().toUpperCase());
}
