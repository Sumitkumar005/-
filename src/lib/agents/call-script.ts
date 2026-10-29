// The call script is generated from the brief, not improvised. Same structure for simulated and real calls.

import type { Brief, Buyer, Supplier } from "@/lib/db/types";
import { describeSpec, getCategory } from "@/lib/domain/categories";
import { formatNumber } from "@/lib/format";

export const BUSINESS_TYPE_HI: Record<string, string> = {
  cafe: "café",
  restaurant: "restaurant",
  cloud_kitchen: "cloud kitchen",
  bakery: "bakery",
  retail: "dukaan",
  boutique: "boutique",
  d2c_brand: "D2C brand",
  manufacturer: "manufacturing unit",
  other: "business",
};

export type CallScript = {
  language: "hinglish";
  opening: string;
  product: string;
  questions: string[];
  closing: string;
  optOutLine: string;
  /** Flat variables for hosted voice agents (e.g. Bolna prompt variables). */
  variables: Record<string, string>;
};

export function buildCallScript(brief: Brief, buyer: Pick<Buyer, "business_type" | "city">, supplier: Pick<Supplier, "name" | "gstin">): CallScript {
  const cat = getCategory(brief.category);
  const spec = describeSpec(brief.category, brief.spec);
  const unitWord = cat.unit === "pieces" ? "piece" : cat.unit.replace(/s$/, "");
  const product = `${cat.label.toLowerCase()}${spec ? ` (${spec})` : ""}`;
  const qty = brief.quantity ? `${formatNumber(brief.quantity)} ${cat.unit}` : "regular quantity";
  const freq = brief.frequency === "monthly" ? " har mahine" : brief.frequency === "weekly" ? " har hafte" : "";
  const buyerKind = BUSINESS_TYPE_HI[buyer.business_type] ?? "business";

  const opening =
    `Namaste, main BhavTaav ki AI assistant bol rahi hoon. Ye call quality ke liye record ho rahi hai. ` +
    `Main ${buyer.city} ke ek ${buyerKind} ki taraf se call kar rahi hoon, unhe ${qty}${freq} ${product} chahiye. ` +
    `Kya aap do minute mein rate bata sakte hain?`;

  const questions = [
    `Is spec ke liye aapka rate kya hoga, per ${unitWord}? GST alag hai ya included?`,
    `Minimum order quantity kitni hai?`,
    `Order ke baad delivery kitne din mein ho jayegi, ${brief.delivery_pincode ?? buyer.city} tak?`,
    `Transport ka kharcha aap uthayenge ya alag lagega?`,
    ...(brief.spec.print && brief.spec.print !== "plain" ? ["Printing ke liye plate ya setup charge alag hai?"] : []),
    `Payment terms kya hain, kitna advance?`,
    `Bulk se pehle sample mil sakta hai? Kitne ka?`,
    `Agar maal mein defect nikle to replacement ki kya policy hai?`,
    ...(supplier.gstin ? [] : ["Aapka GST number bata denge? Buyer ko GST bill chahiye."]),
  ];

  const closing = "Dhanyavaad. Buyer ko aapka quote dikha dete hain, agar select hua to aapko seedha call aayega.";
  const optOutLine = "Koi baat nahi, aapka number hum list se hata dete hain. Dhanyavaad.";

  return {
    language: "hinglish",
    opening,
    product,
    questions,
    closing,
    optOutLine,
    variables: {
      buyer_city: buyer.city,
      buyer_kind: buyerKind,
      product,
      quantity: qty + freq,
      delivery_to: brief.delivery_pincode ?? buyer.city,
      unit_word: unitWord,
      ask_gstin: supplier.gstin ? "no" : "yes",
      questions: questions.join(" | "),
    },
  };
}
