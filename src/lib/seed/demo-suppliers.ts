// Demo supplier network for Delhi NCR. Clearly marked is_demo: the real voice provider refuses to
// call them, and their phone numbers sit in an unallocated range (+91 55555 xxxxx).
// Each has a sim profile so simulated calls behave like real wholesalers: some quote cleanly,
// some are busy, some quote per kg, one opts out, two fail GST checks.

import { buildGstin } from "@/lib/domain/gstin";
import type { SimProfile } from "@/lib/db/types";

type Seed = {
  name: string;
  city: string;
  state: "Delhi" | "Haryana" | "Uttar Pradesh" | "Gujarat";
  pincode: string;
  categories: string[];
  manufacturer: boolean;
  year: number;
  rating?: [number, number];
  persona?: SimProfile["persona"];
  price?: number;
  flex?: number;
  moq?: number;
  lead?: number;
  gst?: SimProfile["gst_style"];
  freight?: SimProfile["freight_style"];
  basis?: SimProfile["basis_style"];
  advance?: number;
  sample?: boolean;
  defect?: boolean;
  gstin?: "valid" | "none" | "bad_checksum" | "wrong_state";
};

const STATE_CODE = { Delhi: "07", Haryana: "06", "Uttar Pradesh": "09", Gujarat: "24" } as const;

const SEEDS: Seed[] = [
  // Paper cups
  { name: "Okhla Cupcraft", city: "New Delhi", state: "Delhi", pincode: "110020", categories: ["paper_cup"], manufacturer: true, year: 2012, rating: [4.3, 86], price: 1.0, flex: 0.06, moq: 5000, lead: 7, gst: "plus", freight: "included", basis: "per_unit", advance: 30, sample: true, defect: true },
  { name: "Bawana Paper Cups", city: "Delhi", state: "Delhi", pincode: "110039", categories: ["paper_cup", "food_container"], manufacturer: true, year: 2016, rating: [4.0, 41], price: 0.94, flex: 0.04, moq: 10000, lead: 10, gst: "plus", freight: "to_pay", basis: "per_1000", advance: 50, sample: true },
  { name: "Gurgaon Cup House", city: "Gurugram", state: "Haryana", pincode: "122001", categories: ["paper_cup"], manufacturer: true, year: 2018, rating: [4.5, 112], price: 1.05, flex: 0.08, moq: 5000, lead: 5, gst: "including", freight: "included", basis: "per_unit", advance: 0, sample: true, defect: true },
  { name: "Noida Eco Cups", city: "Noida", state: "Uttar Pradesh", pincode: "201301", categories: ["paper_cup", "carry_bag"], manufacturer: true, year: 2019, rating: [3.9, 23], persona: "busy", price: 0.98, flex: 0.05, moq: 5000, lead: 8, gst: "plus", freight: "fixed", basis: "per_unit", advance: 30, sample: true },
  { name: "Kundli Packaging Mills", city: "Sonipat", state: "Haryana", pincode: "131028", categories: ["paper_cup", "mono_carton"], manufacturer: true, year: 2009, rating: [4.1, 64], persona: "hard_bargainer", price: 0.97, flex: 0.03, moq: 20000, lead: 12, gst: "unstated", freight: "to_pay", basis: "per_kg", advance: 50, sample: false },
  { name: "Chawri Bazar Traders", city: "Delhi", state: "Delhi", pincode: "110006", categories: ["paper_cup", "carry_bag", "food_container"], manufacturer: false, year: 2004, rating: [3.6, 210], persona: "trader", price: 1.08, flex: 0.1, moq: 2000, lead: 3, gst: "plus", freight: "fixed", basis: "per_unit", advance: 100, sample: true },
  { name: "Faridabad Cup Industries", city: "Faridabad", state: "Haryana", pincode: "121003", categories: ["paper_cup"], manufacturer: true, year: 2021, persona: "cooperative", price: 0.55, flex: 0.02, moq: 5000, lead: 6, gst: "plus", freight: "included", basis: "per_unit", advance: 100, sample: false, gstin: "bad_checksum" },
  { name: "Ghaziabad Paperware", city: "Ghaziabad", state: "Uttar Pradesh", pincode: "201009", categories: ["paper_cup", "food_container"], manufacturer: true, year: 2015, rating: [4.2, 38], persona: "annoyed", price: 1.0, moq: 5000, lead: 7 },
  { name: "Mayapuri Disposables", city: "New Delhi", state: "Delhi", pincode: "110064", categories: ["paper_cup", "food_container"], manufacturer: true, year: 2011, rating: [4.4, 57], price: 1.02, flex: 0.07, moq: 3000, lead: 6, gst: "plus", freight: "included", basis: "per_kg_no_count", advance: 30, sample: true, defect: true },
  { name: "Manesar Cup Co", city: "Manesar", state: "Haryana", pincode: "122051", categories: ["paper_cup"], manufacturer: true, year: 2017, persona: "not_interested", price: 1.0 },

  // Food containers
  { name: "Narela Bagasse Works", city: "Delhi", state: "Delhi", pincode: "110040", categories: ["food_container"], manufacturer: true, year: 2020, rating: [4.6, 29], price: 0.98, flex: 0.06, moq: 2000, lead: 9, gst: "plus", freight: "fixed", basis: "per_unit", advance: 50, sample: true, defect: true },
  { name: "Sahibabad Foil Containers", city: "Ghaziabad", state: "Uttar Pradesh", pincode: "201010", categories: ["food_container"], manufacturer: true, year: 2013, rating: [4.1, 44], price: 1.04, flex: 0.05, moq: 5000, lead: 5, gst: "plus", freight: "included", basis: "per_1000", advance: 30, sample: true },
  { name: "Udyog Vihar Kraft Boxes", city: "Gurugram", state: "Haryana", pincode: "122016", categories: ["food_container", "mono_carton"], manufacturer: true, year: 2014, rating: [4.3, 61], price: 1.0, flex: 0.08, moq: 2000, lead: 8, gst: "including", freight: "included", basis: "per_unit", advance: 0, sample: true, defect: true },
  { name: "Wazirpur Packaging", city: "Delhi", state: "Delhi", pincode: "110052", categories: ["food_container", "carry_bag"], manufacturer: true, year: 2008, rating: [3.8, 77], persona: "busy", price: 0.96, flex: 0.05, moq: 3000, lead: 10, gst: "unstated", freight: "to_pay", basis: "per_unit", advance: 50, sample: true },

  // Carry bags
  { name: "Lawrence Road Bag Makers", city: "Delhi", state: "Delhi", pincode: "110035", categories: ["carry_bag"], manufacturer: true, year: 2010, rating: [4.2, 53], price: 1.0, flex: 0.07, moq: 1000, lead: 7, gst: "plus", freight: "included", basis: "per_unit", advance: 30, sample: true, defect: true },
  { name: "Greater Noida Kraft Bags", city: "Greater Noida", state: "Uttar Pradesh", pincode: "201306", categories: ["carry_bag"], manufacturer: true, year: 2019, rating: [4.0, 19], price: 0.95, flex: 0.05, moq: 2000, lead: 9, gst: "plus", freight: "fixed", basis: "per_unit", advance: 50, sample: true },
  { name: "Sadar Bazar Bag House", city: "Delhi", state: "Delhi", pincode: "110006", categories: ["carry_bag", "label"], manufacturer: false, year: 2001, rating: [3.7, 140], persona: "trader", price: 1.06, flex: 0.1, moq: 500, lead: 2, gst: "including", freight: "fixed", basis: "per_unit", advance: 100, sample: true },
  { name: "Bahadurgarh Non-Woven", city: "Bahadurgarh", state: "Haryana", pincode: "124507", categories: ["carry_bag"], manufacturer: true, year: 2016, price: 0.92, flex: 0.04, moq: 5000, lead: 12, gst: "plus", freight: "to_pay", basis: "per_kg", advance: 50, sample: false, gstin: "wrong_state" },

  // Pouches
  { name: "Okhla Flexi Pack", city: "New Delhi", state: "Delhi", pincode: "110020", categories: ["standup_pouch", "label"], manufacturer: true, year: 2012, rating: [4.4, 48], price: 1.0, flex: 0.06, moq: 5000, lead: 14, gst: "plus", freight: "included", basis: "per_unit", advance: 50, sample: true, defect: true },
  { name: "Noida Laminates", city: "Noida", state: "Uttar Pradesh", pincode: "201305", categories: ["standup_pouch"], manufacturer: true, year: 2015, rating: [4.1, 22], price: 0.95, flex: 0.05, moq: 10000, lead: 18, gst: "plus", freight: "fixed", basis: "per_1000", advance: 50, sample: true },
  { name: "Gurugram Digital Pouch", city: "Gurugram", state: "Haryana", pincode: "122015", categories: ["standup_pouch"], manufacturer: true, year: 2022, rating: [4.7, 31], price: 1.15, flex: 0.08, moq: 500, lead: 6, gst: "including", freight: "included", basis: "per_unit", advance: 100, sample: true, defect: true },
  { name: "Kirti Nagar Packers", city: "New Delhi", state: "Delhi", pincode: "110015", categories: ["standup_pouch", "carry_bag"], manufacturer: false, year: 2007, persona: "trader", price: 1.05, flex: 0.09, moq: 2000, lead: 7, gst: "plus", freight: "to_pay", basis: "per_unit", advance: 50, sample: true },

  // Mono cartons
  { name: "Patparganj Carton Press", city: "Delhi", state: "Delhi", pincode: "110092", categories: ["mono_carton"], manufacturer: true, year: 2006, rating: [4.3, 73], price: 1.0, flex: 0.06, moq: 2000, lead: 10, gst: "plus", freight: "included", basis: "per_unit", advance: 50, sample: true, defect: true },
  { name: "Sector 63 Print Hub", city: "Noida", state: "Uttar Pradesh", pincode: "201301", categories: ["mono_carton", "label"], manufacturer: true, year: 2018, rating: [4.0, 35], persona: "busy", price: 0.97, flex: 0.05, moq: 1000, lead: 8, gst: "plus", freight: "fixed", basis: "per_unit", advance: 30, sample: true },
  { name: "IMT Manesar Boxes", city: "Manesar", state: "Haryana", pincode: "122052", categories: ["mono_carton"], manufacturer: true, year: 2013, rating: [4.2, 27], price: 0.93, flex: 0.04, moq: 5000, lead: 12, gst: "unstated", freight: "to_pay", basis: "per_unit", advance: 50, sample: false },

  // Labels
  { name: "Naraina Label Works", city: "New Delhi", state: "Delhi", pincode: "110028", categories: ["label"], manufacturer: true, year: 2010, rating: [4.5, 66], price: 1.0, flex: 0.07, moq: 5000, lead: 5, gst: "plus", freight: "included", basis: "per_1000", advance: 30, sample: true, defect: true },
  { name: "Faridabad Sticker Co", city: "Faridabad", state: "Haryana", pincode: "121001", categories: ["label"], manufacturer: true, year: 2017, rating: [3.9, 18], price: 0.9, flex: 0.05, moq: 10000, lead: 7, gst: "plus", freight: "fixed", basis: "per_1000", advance: 50, sample: true },

  // Fabric
  { name: "Gandhi Nagar Fabrics", city: "Delhi", state: "Delhi", pincode: "110031", categories: ["fabric"], manufacturer: false, year: 1998, rating: [4.2, 95], persona: "trader", price: 1.0, flex: 0.08, moq: 100, lead: 4, gst: "plus", freight: "fixed", basis: "per_unit", advance: 50, sample: true },
  { name: "Chandni Chowk Textile Co", city: "Delhi", state: "Delhi", pincode: "110006", categories: ["fabric"], manufacturer: false, year: 1992, rating: [4.0, 160], price: 1.06, flex: 0.1, moq: 50, lead: 3, gst: "including", freight: "to_pay", basis: "per_unit", advance: 100, sample: true },
  { name: "Panipat Weaves", city: "Panipat", state: "Haryana", pincode: "132103", categories: ["fabric"], manufacturer: true, year: 2005, rating: [4.4, 42], price: 0.9, flex: 0.06, moq: 500, lead: 15, gst: "plus", freight: "included", basis: "per_unit", advance: 30, sample: true, defect: true },
  { name: "Surat Synthetics Hub", city: "Surat", state: "Gujarat", pincode: "395002", categories: ["fabric"], manufacturer: true, year: 2003, rating: [4.3, 210], price: 0.82, flex: 0.05, moq: 1000, lead: 12, gst: "plus", freight: "to_pay", basis: "per_unit", advance: 50, sample: true },
];

const LETTERS = "ABCDEFGHJKLMNPRSTUVWXYZ";

function pan(i: number, manufacturer: boolean): string {
  const a = LETTERS[(i * 7) % LETTERS.length] + LETTERS[(i * 11 + 3) % LETTERS.length] + LETTERS[(i * 5 + 1) % LETTERS.length];
  const type = manufacturer ? "C" : "F";
  return `${a}${type}${LETTERS[(i * 13) % LETTERS.length]}${String(1000 + i * 37).slice(-4)}${LETTERS[(i * 3 + 2) % LETTERS.length]}`;
}

export type DemoSupplierRow = Record<string, unknown> & { name: string; phone: string };

export function demoSuppliers(): DemoSupplierRow[] {
  return SEEDS.map((s, i) => {
    let gstin: string | null = buildGstin(STATE_CODE[s.state], pan(i, s.manufacturer));
    if (s.gstin === "none") gstin = null;
    if (s.gstin === "bad_checksum") gstin = gstin.slice(0, 14) + (gstin[14] === "A" ? "B" : "A");
    if (s.gstin === "wrong_state") gstin = buildGstin("08", pan(i, s.manufacturer));
    const profile: SimProfile = {
      persona: s.persona ?? "cooperative",
      answer_rate: s.persona === "busy" ? 0.95 : 0.88,
      price_factor: s.price ?? 1,
      flex: s.flex ?? 0.05,
      moq: s.moq ?? 2000,
      lead_days: s.lead ?? 7,
      gst_style: s.gst ?? "plus",
      freight_style: s.freight ?? "included",
      basis_style: s.basis ?? "per_unit",
      advance_pct: s.advance ?? 30,
      sample: s.sample ?? true,
      defect_policy: s.defect ? "replace defective pieces in next lot" : null,
    };
    return {
      name: `${s.name} (Demo)`,
      contact_person: null,
      phone: `+9155555${String(10000 + i).slice(-5)}`,
      whatsapp: null,
      city: s.city,
      state: s.state,
      pincode: s.pincode,
      categories: s.categories,
      is_manufacturer: s.manufacturer,
      gstin,
      year_established: s.year,
      review_rating: s.rating?.[0] ?? null,
      review_count: s.rating?.[1] ?? null,
      source: "seed",
      is_demo: true,
      sim_profile: profile,
    };
  });
}
