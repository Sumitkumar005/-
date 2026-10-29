"use client";

import { useMemo, useState } from "react";
import { Calculator, CheckCircle, IdentificationBadge, Plus, Trash, XCircle } from "@phosphor-icons/react";
import { computeLanded, FLAG_SHORT, type FreightMode, type PriceBasis } from "@/lib/domain/landed-cost";
import { checkGstin } from "@/lib/domain/gstin";
import { cx } from "@/components/ui";

// Free tools that run the exact same code as the product, in the browser. No sign-up, nothing stored.

type Row = {
  name: string;
  price: string;
  basis: PriceBasis;
  perKg: string;
  gst: "incl" | "18" | "12" | "5" | "unknown";
  freight: "included" | "fixed" | "to_pay";
  freightAmt: string;
  setup: string;
  moq: string;
};

const START: Row[] = [
  { name: "Supplier A", price: "990", basis: "per_1000", perKg: "", gst: "18", freight: "to_pay", freightAmt: "", setup: "", moq: "10000" },
  { name: "Supplier B", price: "1.14", basis: "per_unit", perKg: "", gst: "incl", freight: "included", freightAmt: "", setup: "", moq: "5000" },
  { name: "Supplier C", price: "182", basis: "per_kg", perKg: "170", gst: "18", freight: "fixed", freightAmt: "450", setup: "1500", moq: "3000" },
];

const blank = (i: number): Row => ({ name: `Supplier ${String.fromCharCode(65 + i)}`, price: "", basis: "per_unit", perKg: "", gst: "18", freight: "included", freightAmt: "", setup: "", moq: "" });

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const COLS = "1.15fr 0.8fr 0.75fr 0.7fr 0.85fr 1.55fr 0.85fr 0.8fr 140px 32px";

function Cell({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cx("block min-w-0", className)}>
      <span className="mb-1 block text-[11px] font-medium text-muted lg:sr-only">{label}</span>
      {children}
    </label>
  );
}

const sel = "focus-ring h-9 w-full rounded-lg border border-line bg-white px-2 text-[13px]";
const inp = "focus-ring h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[13px] tabular placeholder:text-muted/60";

export function FreeTools() {
  const [tab, setTab] = useState<"landed" | "gstin">("landed");
  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-white shadow-lift">
      <div className="flex gap-1 border-b border-line bg-paper/70 p-1.5">
        {(
          [
            ["landed", "Landed cost calculator", Calculator],
            ["gstin", "GSTIN checker", IdentificationBadge],
          ] as const
        ).map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={cx("focus-ring flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold transition", tab === id ? "bg-white text-ink shadow-card" : "text-muted hover:text-ink")}>
            <Icon weight="duotone" className={cx("h-[18px] w-[18px]", tab === id && "text-marigold-deep")} /> {label}
          </button>
        ))}
      </div>
      {tab === "landed" ? <LandedCalculator /> : <GstinChecker />}
    </div>
  );
}

function LandedCalculator() {
  const [qty, setQty] = useState("5000");
  const [rows, setRows] = useState<Row[]>(START);
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const results = useMemo(() => {
    const q = num(qty);
    return rows.map((r) => {
      const price = num(r.price);
      if (!q || !price) return null;
      return computeLanded(
        {
          unitPrice: price,
          priceBasis: r.basis,
          unitsPerBasis: r.basis === "per_kg" ? num(r.perKg) : null,
          gstIncluded: r.gst === "incl" ? true : r.gst === "unknown" ? null : false,
          gstRate: r.gst === "incl" || r.gst === "unknown" ? null : Number(r.gst) / 100,
          moq: num(r.moq),
          leadTimeDays: 7,
          freightMode: (r.freight === "fixed" ? "fixed" : r.freight) as FreightMode,
          freightAmount: num(r.freightAmt),
          setupCost: num(r.setup),
        },
        { quantity: q, unit: "pieces", defaultGstRate: 0.18, neededBy: null, maxUnitPrice: null },
      );
    });
  }, [qty, rows]);

  const values = results.map((r) => (r && r.comparable ? r.landedUnit : null));
  const best = Math.min(...values.filter((v): v is number => v != null));

  return (
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="text-[13px] font-medium">Pieces per order</span>
          <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" className={cx(inp, "mt-1 w-36")} />
        </label>
        <p className="pb-2 text-[13px] text-muted">Type in the quotes you got. We work out what one piece really costs at your door.</p>
      </div>

      <div className="mt-5 hidden gap-2 px-3.5 text-[11px] font-semibold uppercase tracking-wide text-muted lg:grid" style={{ gridTemplateColumns: COLS }}>
        <span>Supplier</span><span>Price ₹</span><span>Per</span><span>Pcs / kg</span><span>GST</span><span>Freight</span><span>Plate ₹ (once)</span><span>MOQ</span><span className="text-right">Landed / piece</span><span />
      </div>
      <div className="mt-2 space-y-2.5">
        {rows.map((r, i) => {
          const res = results[i];
          const v = values[i];
          const isBest = v != null && v === best && values.filter((x) => x != null).length > 1;
          return (
            <div key={i} className={cx("grid grid-cols-2 items-center gap-2 rounded-2xl border p-3.5 transition sm:grid-cols-4 lg:[grid-template-columns:var(--cols)]", isBest ? "border-mint/50 bg-mint-soft/30" : "border-line")} style={{ ["--cols" as string]: COLS }}>
              <Cell label="Supplier" className="col-span-2 sm:col-span-1">
                <input value={r.name} onChange={(e) => set(i, { name: e.target.value })} className={cx(inp, "font-semibold")} />
              </Cell>
              <Cell label="Price ₹">
                <input value={r.price} onChange={(e) => set(i, { price: e.target.value })} placeholder="0.00" inputMode="decimal" className={inp} />
              </Cell>
              <Cell label="Per">
                <select value={r.basis} onChange={(e) => set(i, { basis: e.target.value as PriceBasis })} className={sel}>
                  <option value="per_unit">piece</option>
                  <option value="per_100">100</option>
                  <option value="per_1000">1000</option>
                  <option value="per_kg">kg</option>
                </select>
              </Cell>
              <Cell label="Pcs / kg">
                <input value={r.basis === "per_kg" ? r.perKg : ""} disabled={r.basis !== "per_kg"} onChange={(e) => set(i, { perKg: e.target.value })} placeholder={r.basis === "per_kg" ? "e.g. 170" : "–"} inputMode="numeric" className={cx(inp, "disabled:bg-paper disabled:text-muted")} />
              </Cell>
              <Cell label="GST">
                <select value={r.gst} onChange={(e) => set(i, { gst: e.target.value as Row["gst"] })} className={sel}>
                  <option value="incl">Included</option>
                  <option value="18">+18%</option>
                  <option value="12">+12%</option>
                  <option value="5">+5%</option>
                  <option value="unknown">Not said</option>
                </select>
              </Cell>
              <Cell label="Freight">
                <div className="flex gap-1.5">
                  <select value={r.freight} onChange={(e) => set(i, { freight: e.target.value as Row["freight"] })} className={r.freight === "fixed" ? sel.replace("w-full", "w-[92px] shrink-0") : sel}>
                    <option value="included">Free</option>
                    <option value="fixed">Fixed ₹</option>
                    <option value="to_pay">To-pay</option>
                  </select>
                  {r.freight === "fixed" ? <input aria-label="Freight amount" value={r.freightAmt} onChange={(e) => set(i, { freightAmt: e.target.value })} placeholder="₹" inputMode="numeric" className={cx(inp, "min-w-0 flex-1")} /> : null}
                </div>
              </Cell>
              <Cell label="Plate ₹ (once)">
                <input value={r.setup} onChange={(e) => set(i, { setup: e.target.value })} placeholder="0" inputMode="numeric" className={inp} />
              </Cell>
              <Cell label="MOQ">
                <input value={r.moq} onChange={(e) => set(i, { moq: e.target.value })} placeholder="–" inputMode="numeric" className={inp} />
              </Cell>
              <div className="col-span-2 text-right sm:col-span-3 lg:col-span-1">
                {res == null ? (
                  <p className="text-[13px] text-muted">Enter a price</p>
                ) : !res.comparable ? (
                  <p className="text-[13px] font-medium text-coral">Add pieces per kg</p>
                ) : (
                  <>
                    <p className="tabular font-display text-[22px] font-semibold leading-none">
                      <span className="landed">₹{res.landedUnit.toFixed(2)}</span>
                    </p>
                    <p className="mt-1 text-[11px]">{isBest ? <span className="font-semibold text-mint-deep">Cheapest at your door</span> : <span className="text-muted">landed / piece</span>}</p>
                  </>
                )}
                {res && res.flags.length ? (
                  <div className="mt-1 flex flex-wrap justify-end gap-1">
                    {res.flags.filter((f) => !["lead_time_unknown", "unit_not_comparable"].includes(f)).map((f) => (
                      <span key={f} className="rounded bg-marigold-soft px-1.5 py-0.5 text-[10px] text-[#8A5A00]">{FLAG_SHORT[f] ?? f}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex justify-end">
                {rows.length > 2 ? (
                  <button type="button" aria-label="Remove quote" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-coral-soft hover:text-coral">
                    <Trash className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {rows.length < 6 ? (
          <button type="button" onClick={() => setRows([...rows, blank(rows.length)])} className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-ink hover:bg-paper">
            <Plus weight="bold" className="h-4 w-4" /> Add another quote
          </button>
        ) : (
          <span />
        )}
        <p className="text-[12px] text-muted">To-pay freight is estimated at 4% of goods. One-time plate cost is spread over this order. If MOQ is above your quantity, we price the MOQ.</p>
      </div>
    </div>
  );
}

const ENTITY: Record<string, string> = {
  C: "Company", F: "Firm or LLP", P: "Individual (proprietor)", H: "Hindu Undivided Family", A: "Association of persons",
  T: "Trust", B: "Body of individuals", L: "Local authority", J: "Artificial juridical person", G: "Government",
};

function GstinChecker() {
  const [value, setValue] = useState("");
  const r = value.trim() ? checkGstin(value) : null;
  const reason = r && !r.valid ? { empty: "", format: "Doesn't match the 15-character GSTIN format.", state_code: "The first two digits are not a valid state code.", checksum: "The last character doesn't match. A typo, or a made-up number." }[r.reason] : "";

  return (
    <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_1fr]">
      <div>
        <label htmlFor="gstin-check" className="text-[13px] font-medium">Supplier&apos;s GSTIN</label>
        <input
          id="gstin-check"
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          maxLength={20}
          placeholder="e.g. 27AAPFU0939F1ZV"
          className="focus-ring mt-1 h-12 w-full rounded-xl border border-line bg-white px-4 font-mono text-[16px] tracking-wider placeholder:font-sans placeholder:tracking-normal placeholder:text-muted/60"
        />
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          Checks format, state code and the checksum built into every GSTIN, right in your browser. It catches typos and invented numbers. Whether the registration is still active needs the GST portal; inside BhavTaav we check that too when a GST data provider is connected.
        </p>
      </div>
      <div className="rounded-2xl border border-line bg-paper/60 p-5">
        {!r ? (
          <p className="text-[14px] text-muted">Type or paste a GSTIN to check it.</p>
        ) : r.valid ? (
          <div>
            <p className="flex items-center gap-2 text-[16px] font-semibold text-mint-deep">
              <CheckCircle weight="fill" className="h-5 w-5" /> Looks genuine
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[14px]">
              <div><dt className="text-[12px] text-muted">Registered in</dt><dd className="font-medium">{r.state}</dd></div>
              <div><dt className="text-[12px] text-muted">PAN</dt><dd className="font-mono font-medium">{r.pan}</dd></div>
              <div><dt className="text-[12px] text-muted">Type of business</dt><dd className="font-medium">{ENTITY[r.pan[3]] ?? "Other"}</dd></div>
              <div><dt className="text-[12px] text-muted">Registration no. in state</dt><dd className="font-medium">{r.gstin[12]}</dd></div>
            </dl>
            <p className="mt-4 text-[12px] text-muted">Tip: if their invoice address is in another state, ask why.</p>
          </div>
        ) : (
          <div>
            <p className="flex items-center gap-2 text-[16px] font-semibold text-coral">
              <XCircle weight="fill" className="h-5 w-5" /> Not a valid GSTIN
            </p>
            <p className="mt-2 text-[14px] text-ink-soft">{reason}</p>
            <p className="mt-4 text-[12px] text-muted">Don&apos;t pay an advance to a supplier whose GSTIN fails this check.</p>
          </div>
        )}
      </div>
    </div>
  );
}
