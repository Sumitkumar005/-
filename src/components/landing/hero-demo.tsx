"use client";

import { useEffect, useState } from "react";
import { cx } from "@/components/ui";

// A scripted replay of one real pipeline run from the demo network, looping.
// Each tick is 450 ms; the whole story takes about 12 seconds.

const LINES = [
  { who: "agent", text: "Namaste, main BhavTaav ki AI assistant hoon. Ye call record ho rahi hai." },
  { who: "supplier", text: "Haan ji, boliye." },
  { who: "agent", text: "250 ml printed cups, 5,000 har mahine. Rate kya hoga?" },
  { who: "supplier", text: "₹1.06 per piece, GST 18% alag. 7 din mein delivery." },
] as const;

const QUOTES = [
  { name: "Gurgaon Cup House", raw: "₹1.14 incl. GST, free delivery", landed: 1.54, after: 1.45, trust: 92 },
  { name: "Okhla Cupcraft", raw: "₹1.06 + 18% GST, plate ₹1,500", landed: 1.6, after: 1.53, trust: 88 },
  { name: "Bawana Paper Cups", raw: "₹990 per 1000, to-pay freight", landed: 1.36, after: null, trust: 85, flag: "MOQ 10,000" },
];

const PHASES = [
  { until: 9, label: "Calling 6 of 9", tone: "warn", step: 2 },
  { until: 15, label: "Comparing 7 quotes", tone: "warn", step: 3 },
  { until: 20, label: "Negotiating", tone: "warn", step: 4 },
  { until: 28, label: "Shortlist ready", tone: "good", step: 5 },
] as const;

const STEPS = ["Scout", "Vet", "Call", "Compare", "Negotiate"];
const LOOP = 28;

export function HeroDemo() {
  const [t, setT] = useState(LOOP - 1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setT(0);
    const id = setInterval(() => setT((x) => (x + 1) % LOOP), 450);
    return () => clearInterval(id);
  }, []);

  const phase = PHASES.find((p) => t < p.until) ?? PHASES[PHASES.length - 1];
  const linesShown = Math.min(LINES.length, Math.floor(t / 2) + 1);
  const quotesShown = t < 9 ? 0 : Math.min(QUOTES.length, t - 8);
  const negotiated = t >= 17;
  const ready = t >= 20;

  return (
    <div className="relative mx-auto w-full max-w-[460px] xl:max-w-[520px]">
      <div className="absolute -inset-6 -z-10 rounded-[32px] bg-marigold/20 blur-3xl" />
      <div className="rounded-[22px] border border-white/10 bg-white/[0.07] p-1.5 shadow-2xl backdrop-blur-md">
        <div className="overflow-hidden rounded-[18px] bg-white text-ink">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-5 pt-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Live brief</p>
              <p className="mt-0.5 text-[15px] font-semibold">250 ml printed paper cups</p>
              <p className="text-xs text-muted">5,000 a month · Gurugram 122002</p>
            </div>
            <span className={cx("mt-1 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors", phase.tone === "good" ? "bg-mint-soft text-mint-deep" : "bg-marigold-soft text-[#8A5A00]")}>
              <span className={cx("h-1.5 w-1.5 rounded-full bg-current", phase.tone !== "good" && "animate-pulseDot")} />
              {phase.label}
            </span>
          </div>

          {/* Progress */}
          <div className="mt-4 grid grid-cols-5 gap-1 px-5">
            {STEPS.map((s, i) => (
              <div key={s}>
                <div className="h-1 overflow-hidden rounded-full bg-line">
                  <div className={cx("h-full rounded-full transition-all duration-700", i < phase.step ? "w-full bg-ink" : i === phase.step && !ready ? "w-1/2 bg-marigold" : ready ? "w-full bg-ink" : "w-0")} />
                </div>
                <p className={cx("mt-1.5 text-[10px] font-medium", i <= phase.step || ready ? "text-ink" : "text-muted")}>{s}</p>
              </div>
            ))}
          </div>

          {/* Call or quotes */}
          <div className="relative mt-4 h-[226px] border-t border-line bg-paper/70">
            <div className={cx("absolute inset-0 px-5 py-3.5 transition-all duration-500", t < 9 ? "opacity-100" : "pointer-events-none -translate-y-2 opacity-0")}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-ink">
                  On call · Okhla Cupcraft <span className="font-normal text-muted">01:{String(4 + t * 3).padStart(2, "0")}</span>
                </p>
                <Wave />
              </div>
              <div className="mt-2.5 space-y-2">
                {LINES.slice(0, linesShown).map((l, i) => (
                  <div key={i} className={cx("flex animate-rise", l.who === "supplier" && "justify-end")}>
                    <p className={cx("max-w-[82%] rounded-2xl px-3 py-1.5 text-[12px] leading-snug", l.who === "agent" ? "rounded-bl-md bg-ink text-white" : "rounded-br-md bg-marigold-soft text-ink")}>{l.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={cx("absolute inset-0 px-4 py-3 transition-all duration-500", t >= 9 ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0")}>
              <div className="flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                <span>Quote</span>
                <span>Landed / cup</span>
              </div>
              <div className="mt-1.5 space-y-1.5">
                {QUOTES.slice(0, quotesShown).map((q, i) => {
                  const best = ready && i === 0;
                  const price = negotiated && q.after ? q.after : q.landed;
                  return (
                    <div key={q.name} className={cx("flex animate-rise items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2 transition-colors duration-500", best ? "border-mint/50 ring-1 ring-mint/30" : "border-line")}>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                          {q.name}
                          {best ? <span className="rounded bg-ink px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-white">Best pick</span> : null}
                        </p>
                        <p className="truncate text-[11px] text-muted">
                          {q.raw}
                          {q.flag ? <span className="ml-1 text-[#8A5A00]">· {q.flag}</span> : null}
                        </p>
                      </div>
                      <div className="text-right">
                        {negotiated && q.after ? <p className="tabular text-[10px] text-muted line-through">₹{q.landed.toFixed(2)}</p> : null}
                        <p className={cx("tabular font-display text-[17px] font-semibold leading-none", negotiated && q.after ? "text-mint-deep" : "")}>₹{price.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <p className="text-[11px] text-muted">GST + freight included · 1 GSTIN blocked</p>
            <p className={cx("text-[12px] font-semibold transition-all duration-500", ready ? "text-mint-deep opacity-100" : "opacity-0")}>Saves ₹750 / order</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Wave() {
  return (
    <span className="flex h-4 items-center gap-[2px]" aria-hidden>
      {[0.5, 0.9, 0.6, 1, 0.4, 0.8, 0.55].map((h, i) => (
        <span key={i} className="w-[2px] animate-wave rounded-full bg-mint" style={{ height: `${h * 100}%`, animationDelay: `${i * 90}ms` }} />
      ))}
    </span>
  );
}
