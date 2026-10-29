import { describe, expect, it } from "vitest";
import { buildGstin, checkGstin, gstinCheckChar, isValidUdyam } from "./gstin";
import { computeLanded, pricePerBuyerUnit, normaliseGstRate } from "./landed-cost";
import { computeTrust } from "./trust";
import { rankQuotes, type RankInput } from "./ranking";
import { isCallingWindow, nextCallingSlot, scheduleSlots } from "./hours";
import { counterTemplate, messageCitesOnly, moneyFigures, planCounter } from "./negotiation";
import { normaliseIndianPhone, maskPhone } from "./phone";
import { proximity } from "./geo";
import { cleanSpec, missingSpecFields, specKey } from "./categories";
import { canTransition } from "./brief-state";

describe("gstin", () => {
  it("accepts a known valid GSTIN and rejects a one-character typo", () => {
    // 27AAPFU0939F1ZV is the widely published sample GSTIN used in GST documentation.
    expect(checkGstin("27AAPFU0939F1ZV").valid).toBe(true);
    expect(checkGstin("27AAPFU0939F1ZW")).toMatchObject({ valid: false, reason: "checksum" });
  });
  it("normalises spacing and case", () => {
    expect(checkGstin(" 27aapfu0939f1zv ").valid).toBe(true);
  });
  it("flags bad format, unknown state and empty", () => {
    expect(checkGstin("12345")).toMatchObject({ valid: false, reason: "format" });
    expect(checkGstin("")).toMatchObject({ valid: false, reason: "empty" });
    const fake = "99ABCDE1234F1Z";
    expect(checkGstin(fake + gstinCheckChar(fake))).toMatchObject({ valid: false, reason: "state_code" });
  });
  it("builds checksum-valid GSTINs with the right state", () => {
    const g = buildGstin("07", "ABCDE1234F");
    const r = checkGstin(g);
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.state).toBe("Delhi");
  });
  it("validates Udyam numbers", () => {
    expect(isValidUdyam("UDYAM-DL-07-0012345")).toBe(true);
    expect(isValidUdyam("UDYAM-DL-7-12345")).toBe(false);
  });
});

describe("landed cost", () => {
  const brief = { quantity: 5000, unit: "pieces" as const, defaultGstRate: 0.18, neededBy: null, maxUnitPrice: null };

  it("converts price bases", () => {
    expect(pricePerBuyerUnit({ unitPrice: 1100, priceBasis: "per_1000" }, "pieces")).toBeCloseTo(1.1);
    expect(pricePerBuyerUnit({ unitPrice: 220, priceBasis: "per_kg", unitsPerBasis: 200 }, "pieces")).toBeCloseTo(1.1);
    expect(pricePerBuyerUnit({ unitPrice: 220, priceBasis: "per_kg" }, "pieces")).toBeNull();
    expect(pricePerBuyerUnit({ unitPrice: 220, priceBasis: "per_kg" }, "kg")).toBe(220);
  });

  it("adds GST, fixed freight and setup cost", () => {
    const r = computeLanded({ unitPrice: 1, priceBasis: "per_unit", gstIncluded: false, gstRate: 0.18, freightMode: "fixed", freightAmount: 500, setupCost: 1500, leadTimeDays: 7 }, brief);
    expect(r.comparable).toBe(true);
    if (!r.comparable) return;
    // (5000 + 1500 + 500) * 1.18 = 8260
    expect(r.landedTotal).toBe(8260);
    expect(r.landedUnit).toBeCloseTo(1.652, 3);
    expect(r.flags).toContain("setup_cost_one_time");
  });

  it("does not double count GST when included and estimates unknown freight", () => {
    const r = computeLanded({ unitPrice: 1.2, priceBasis: "per_unit", gstIncluded: true, freightMode: "unknown", leadTimeDays: 5 }, brief);
    if (!r.comparable) throw new Error("expected comparable");
    expect(r.landedTotal).toBeCloseTo(6000 * 1.04, 2);
    expect(r.flags).toContain("freight_estimated");
    expect(r.flags).not.toContain("gst_assumed");
  });

  it("assumes GST extra when unstated, uses MOQ when above quantity", () => {
    const r = computeLanded({ unitPrice: 1, priceBasis: "per_unit", gstIncluded: null, moq: 10000, freightMode: "included", leadTimeDays: 5 }, brief);
    if (!r.comparable) throw new Error("expected comparable");
    expect(r.effectiveQty).toBe(10000);
    expect(r.landedUnit).toBeCloseTo(1.18, 4);
    expect(r.flags).toEqual(expect.arrayContaining(["gst_assumed", "moq_above_qty"]));
  });

  it("flags deadline misses and budget", () => {
    const now = new Date("2026-11-01T10:00:00+05:30");
    const r = computeLanded({ unitPrice: 2, priceBasis: "per_unit", gstIncluded: true, freightMode: "included", leadTimeDays: 20 }, { ...brief, neededBy: "2026-11-10", maxUnitPrice: 1.5 }, now);
    expect(r.flags).toEqual(expect.arrayContaining(["misses_deadline", "over_budget"]));
  });

  it("marks unconvertible quotes as not comparable", () => {
    const r = computeLanded({ unitPrice: 200, priceBasis: "per_box", freightMode: "included" }, brief);
    expect(r.comparable).toBe(false);
    expect(r.flags).toContain("unit_not_comparable");
  });

  it("normalises GST rate", () => {
    expect(normaliseGstRate(18)).toBe(0.18);
    expect(normaliseGstRate(0.05)).toBe(0.05);
    expect(normaliseGstRate(-1)).toBeNull();
  });
});

describe("trust ledger", () => {
  const valid = buildGstin("07", "ABCDE1234F");
  it("blocks invalid GSTIN", () => {
    const t = computeTrust({ gstin: valid.slice(0, 14) + (valid[14] === "A" ? "B" : "A") });
    expect(t.band).toBe("blocked");
    expect(t.hardFail).toBe(true);
  });
  it("is transparent about unchecked status and deducts for missing GSTIN", () => {
    expect(computeTrust({ gstin: valid, state: "Delhi" }).ledger.some((e) => e.kind === "not_checked")).toBe(true);
    expect(computeTrust({}).score).toBe(85);
  });
  it("deducts state mismatch and bad history, caps at zero", () => {
    const t = computeTrust({
      gstin: valid,
      state: "Haryana",
      history: { ordersCount: 5, lateCount: 5, qualityIssues: 5, notHonoured: 5, disputes: 5, callsTotal: 10, callsAnswered: 1 },
    });
    expect(t.score).toBe(0);
    expect(t.band).toBe("risky");
  });
  it("blocks cancelled registrations", () => {
    expect(computeTrust({ gstin: valid, verification: { gstStatus: "cancelled" } }).band).toBe("blocked");
  });
});

describe("ranking", () => {
  const base = (o: Partial<RankInput>): RankInput => ({
    supplierId: Math.random().toString(36), name: "x", comparable: true, landedUnit: 1.2,
    trustScore: 90, trustBand: "trusted", leadTimeDays: 7, flags: [], ...o,
  });
  it("prefers cheaper, trusted suppliers and excludes blocked or unrealistic ones", () => {
    const { ranked, stats } = rankQuotes([
      base({ name: "cheap", landedUnit: 1.1 }),
      base({ name: "mid", landedUnit: 1.2 }),
      base({ name: "pricey", landedUnit: 1.3 }),
      base({ name: "blocked", landedUnit: 1.0, trustBand: "blocked", trustScore: 30 }),
      base({ name: "toogood", landedUnit: 0.5 }),
      base({ name: "nounit", landedUnit: null, comparable: false }),
    ]);
    expect(stats?.count).toBe(4); // blocked supplier excluded from market view
    const order = ranked.filter((r) => r.eligible).map((r) => r.name);
    expect(order).toEqual(["cheap", "mid", "pricey"]);
    expect(ranked.find((r) => r.name === "toogood")?.flags).toContain("too_good_to_be_true");
    expect(ranked.find((r) => r.name === "blocked")?.eligible).toBe(false);
    expect(ranked.find((r) => r.name === "cheap")?.reasons[0]).toBe("Lowest landed cost");
  });
  it("lets trust outweigh a tiny price gap", () => {
    const { ranked } = rankQuotes([
      base({ name: "cheap-risky", landedUnit: 1.18, trustScore: 55, trustBand: "risky" }),
      base({ name: "solid", landedUnit: 1.2, trustScore: 95 }),
    ]);
    expect(ranked[0].name).toBe("solid");
  });
  it("handles empty input", () => {
    expect(rankQuotes([]).stats).toBeNull();
  });
});

describe("calling hours", () => {
  it("respects IST window, Sundays and holidays", () => {
    expect(isCallingWindow(new Date("2026-11-02T11:00:00+05:30"))).toBe(true); // Monday
    expect(isCallingWindow(new Date("2026-11-02T19:00:00+05:30"))).toBe(false);
    expect(isCallingWindow(new Date("2026-11-01T11:00:00+05:30"))).toBe(false); // Sunday
    expect(isCallingWindow(new Date("2026-11-09T11:00:00+05:30"))).toBe(false); // holiday
  });
  it("finds the next slot", () => {
    expect(nextCallingSlot(new Date("2026-11-02T08:00:00+05:30")).toISOString()).toBe(new Date("2026-11-02T10:00:00+05:30").toISOString());
    // Saturday evening -> Monday 10:00
    expect(nextCallingSlot(new Date("2026-10-31T19:00:00+05:30")).toISOString()).toBe(new Date("2026-11-02T10:00:00+05:30").toISOString());
    // Saturday 7 Nov evening: Sun 8 Nov and Mon 9 Nov are skipped
    expect(nextCallingSlot(new Date("2026-11-07T19:00:00+05:30")).toISOString()).toBe(new Date("2026-11-10T10:00:00+05:30").toISOString());
  });
  it("spreads slots inside the window", () => {
    const slots = scheduleSlots(new Date("2026-11-02T18:20:00+05:30"), 3, 15);
    expect(slots.every(isCallingWindow)).toBe(true);
  });
});

describe("negotiation guard", () => {
  it("cites a real competitor and asks within limits", () => {
    const p = planCounter({ ownLanded: 1.4, ownGoodsPerUnit: 1.1, competitor: { quoteId: "q1", landed: 1.3 } });
    expect(p?.basis).toBe("competitor");
    expect(p?.citedQuoteId).toBe("q1");
    expect(p!.askUnitPrice).toBeLessThan(1.1);
    expect(p!.askUnitPrice).toBeGreaterThanOrEqual(1.1 * 0.85 - 0.01);
  });
  it("never asks more than 15% off", () => {
    const p = planCounter({ ownLanded: 2, ownGoodsPerUnit: 1.6, competitor: { quoteId: "q", landed: 1 } });
    expect(p!.askUnitPrice).toBeCloseTo(1.36, 2);
  });
  it("falls back to a small discount when already cheapest", () => {
    expect(planCounter({ ownLanded: 1, ownGoodsPerUnit: 0.8, competitor: { quoteId: "q", landed: 1.2 } })?.basis).toBe("discount");
  });
  it("detects invented numbers in a message", () => {
    expect(moneyFigures("rate ₹1.15 hai, aur Rs 2 bhi, 3 rupaye")).toEqual([1.15, 2, 3]);
    expect(messageCitesOnly("₹1.30 vs ₹1.05", [1.3, 1.05])).toBe(true);
    expect(messageCitesOnly("₹1.30 vs ₹0.99", [1.3, 1.05])).toBe(false);
  });
  it("template only uses allowed numbers", () => {
    const p = planCounter({ ownLanded: 1.4, ownGoodsPerUnit: 1.1, competitor: { quoteId: "q1", landed: 1.3 } })!;
    expect(messageCitesOnly(counterTemplate(p, "pieces"), [p.askUnitPrice, p.citeLanded!])).toBe(true);
  });
});

describe("phone, geo, spec, state", () => {
  it("normalises Indian numbers", () => {
    expect(normaliseIndianPhone("098123 45678")).toBe("+919812345678");
    expect(normaliseIndianPhone("+91-98123-45678")).toBe("+919812345678");
    expect(normaliseIndianPhone("011-2345 6789")).toBe("+911123456789");
    expect(normaliseIndianPhone("12345")).toBeNull();
    expect(maskPhone("+919812345678")).toBe("+91 98xxx xx678");
  });
  it("matches NCR across states", () => {
    expect(proximity({ pincode: "122002", state: "Haryana" }, { pincode: "110020", state: "Delhi" })).toBe("metro");
    expect(proximity({ pincode: "122002" }, { pincode: "122015" })).toBe("local");
    expect(proximity({ pincode: "122002", state: "Haryana" }, { pincode: "400001", state: "Maharashtra" })).toBe("national");
  });
  it("cleans spec values and finds gaps", () => {
    const s = cleanSpec("paper_cup", { capacity_ml: "250 ml", wall: "Single", print: "2 colour", junk: 1 });
    expect(s).toEqual({ capacity_ml: 250, wall: "single", print: "2 colour" });
    expect(missingSpecFields("paper_cup", s)).toHaveLength(0);
    expect(missingSpecFields("paper_cup", {}).map((f) => f.key)).toEqual(["capacity_ml", "wall", "print"]);
    expect(specKey("paper_cup", s)).toBe("paper_cup|capacity_ml=250|wall=single|gsm=?|print=2 colour");
  });
  it("guards state transitions", () => {
    expect(canTransition("draft", "confirmed")).toBe(true);
    expect(canTransition("completed", "draft")).toBe(false);
    expect(canTransition("calling", "shortlist_ready")).toBe(false);
  });
});
