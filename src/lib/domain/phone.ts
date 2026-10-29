// Indian phone numbers to E.164. Mobiles and landlines both have 10 digits after the trunk/country prefix.

export function normaliseIndianPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = input.replace(/[^0-9+]/g, "");
  if (d.startsWith("+91")) d = d.slice(3);
  else if (d.startsWith("0091")) d = d.slice(4);
  else if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  d = d.replace(/^0+/, "").replace(/\+/g, "");
  if (!/^[1-9][0-9]{9}$/.test(d)) return null;
  return `+91${d}`;
}

/** "+919812345678" -> "+91 98xxx xx678". Contacts stay masked until the buyer picks a supplier. */
export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return "Not available";
  const d = e164.replace(/^\+91/, "");
  if (d.length !== 10) return "Hidden";
  return `+91 ${d.slice(0, 2)}xxx xx${d.slice(7)}`;
}

export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const d = e164.replace(/^\+91/, "");
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : e164;
}
