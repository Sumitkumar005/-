"use client";

import { useState } from "react";
import { Bot, Check, ChevronDown, CircleAlert, Factory, MessageCircle, Phone, Store, X } from "lucide-react";
import type { BriefView, SupplierCard } from "@/lib/views/brief-view";
import { FLAG_LABEL, FLAG_SHORT } from "@/lib/domain/landed-cost";
import { formatDateTime, formatINR, formatNumber, timeAgo } from "@/lib/format";
import { api } from "@/lib/client-api";
import { TrustBadge } from "@/components/status";
import { Alert, Badge, Button, Card, CardHeader, Input, Label, Select, Spinner, cx } from "@/components/ui";

const basisLabel = (q: NonNullable<SupplierCard["quote"]>, unitWord: string) =>
  ({ per_unit: `/ ${unitWord}`, per_100: "/ 100", per_1000: "/ 1000", per_kg: "/ kg", per_box: `/ box${q.units_per_basis ? ` of ${q.units_per_basis}` : ""}`, lot: `/ lot${q.units_per_basis ? ` of ${q.units_per_basis}` : ""}` })[q.price_basis];

const gstText = (q: NonNullable<SupplierCard["quote"]>) => (q.gst_included === true ? "Included" : q.gst_included === false ? `+${q.gst_rate != null ? Math.round(q.gst_rate * 100) : 18}%` : "Not said");
const freightText = (q: NonNullable<SupplierCard["quote"]>) =>
  q.freight_mode === "included" ? "Free" : q.freight_mode === "fixed" ? formatINR(q.freight_amount) : q.freight_mode === "per_unit" ? `${formatINR(q.freight_amount, { unit: true })}/unit` : q.freight_mode === "to_pay" ? "To-pay (est.)" : "Not said (est.)";
const payText = (q: NonNullable<SupplierCard["quote"]>) => (q.advance_pct == null ? q.payment_terms ?? "Not said" : q.advance_pct === 0 ? "On delivery" : `${q.advance_pct}% advance`);

function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

// ---------------------------------------------------------------------------
export function Shortlist({ view, unitWord, busy, onSelect }: { view: BriefView; unitWord: string; busy: string | null; onSelect: (supplierId: string) => void }) {
  const picks = view.suppliers.filter((s) => s.status === "shortlisted" || s.status === "selected").sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  if (!picks.length) return null;
  const b = view.brief;
  return (
    <div>
      <h2 className="text-xl font-semibold">Your shortlist</h2>
      <p className="text-sm text-muted">Ranked on landed cost (60%), trust (25%) and speed (15%), minus anything that needs a second look.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {picks.map((s, i) => {
          const q = s.quote!;
          const selected = s.status === "selected";
          return (
            <Card key={s.supplierId} className={cx("flex flex-col p-5", i === 0 && "border-ink ring-1 ring-ink", selected && "border-mint ring-1 ring-mint")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {i === 0 ? <Badge tone="dark">Best pick</Badge> : <Badge>#{s.rank}</Badge>}
                    {selected ? <Badge tone="good">Chosen</Badge> : null}
                  </div>
                  <p className="mt-2 font-semibold leading-snug">{s.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    {s.isManufacturer === false ? <Store className="h-3 w-3" /> : <Factory className="h-3 w-3" />}
                    {s.isManufacturer === false ? "Trader" : s.isManufacturer ? "Manufacturer" : "Supplier"}
                    {s.city ? `, ${s.city}` : ""}
                  </p>
                </div>
                <TrustBadge band={s.trustBand} score={s.trustScore} />
              </div>
              <div className="mt-4 flex items-end gap-2">
                <p className="tabular font-display text-3xl font-semibold"><span className="landed">{formatINR(q.landed_unit_cost, { unit: true })}</span></p>
                <p className="pb-1 text-xs text-muted">landed / {unitWord}</p>
              </div>
              {q.first_landed != null && q.landed_unit_cost != null && q.first_landed > q.landed_unit_cost ? (
                <p className="text-xs font-medium text-mint-deep">Negotiated down from {formatINR(q.first_landed, { unit: true })}</p>
              ) : null}
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Term k="Quoted" v={`₹${q.unit_price} ${basisLabel(q, unitWord)}`} />
                <Term k="GST" v={gstText(q)} />
                <Term k="MOQ" v={q.moq ? formatNumber(q.moq) : "Not said"} />
                <Term k="Delivery" v={q.lead_time_days != null ? `${q.lead_time_days} days` : "Not said"} />
                <Term k="Freight" v={freightText(q)} />
                <Term k="Payment" v={payText(q)} />
                <Term k="Sample" v={q.sample_available ? (q.sample_cost ? formatINR(q.sample_cost) : "Free") : q.sample_available === false ? "No" : "Not said"} />
                <Term k="Defects" v={q.defect_policy ?? "Not said"} />
              </dl>
              <ul className="mt-4 space-y-1 text-sm">
                {s.reasons.filter((r) => !r.startsWith("Ranked below")).map((r) => (
                  <li key={r} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint-deep" /> {r}
                  </li>
                ))}
                {q.flags.filter((f) => f !== "setup_cost_one_time").map((f) => (
                  <li key={f} className="flex gap-2 text-[#8A5A00]">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {FLAG_LABEL[f] ?? f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-5">
                {s.revealed && (selected || view.viewerIsOps) ? (
                  <div className="space-y-2 rounded-lg bg-paper p-3 text-sm">
                    <p className="flex items-center gap-2 font-medium">
                      <Phone className="h-4 w-4" /> {s.phone}
                    </p>
                    {s.whatsapp && !s.isDemo ? (
                      <a
                        className="focus-ring inline-flex items-center gap-1.5 font-semibold text-mint-deep hover:underline"
                        target="_blank"
                        rel="noreferrer"
                        href={waLink(s.whatsapp, `Namaste, BhavTaav se aapka quote mila: ₹${q.unit_price} ${basisLabel(q, unitWord)} for ${formatNumber(b.quantity)} ${b.unit} (${b.title}). Order ke liye baat karni hai.`)}
                      >
                        <MessageCircle className="h-4 w-4" /> Message on WhatsApp
                      </a>
                    ) : s.isDemo ? (
                      <p className="text-xs text-muted">Demo supplier: contact details are not real.</p>
                    ) : null}
                  </div>
                ) : null}
                {!selected && ["shortlist_ready", "supplier_selected"].includes(b.status) ? (
                  <Button variant={i === 0 ? "primary" : "outline"} className="mt-2 w-full" disabled={!!busy} onClick={() => onSelect(s.supplierId)}>
                    {busy === `select:${s.supplierId}` ? <Spinner /> : null} Choose and get contact
                  </Button>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Term({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="truncate font-medium" title={v}>{v}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function QuoteSheet({ view, unitWord }: { view: BriefView; unitWord: string }) {
  const rows = view.suppliers.filter((s) => s.quote).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || Number(a.quote!.landed_unit_cost ?? 1e9) - Number(b.quote!.landed_unit_cost ?? 1e9));
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Quote sheet, like for like" subtitle={`Every quote converted to landed cost per ${unitWord} at your door. Estimates and assumptions are flagged.`} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-paper text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              {["#", "Supplier", "Quoted as", "GST", "Freight", "Setup", "MOQ", "Lead time", "Payment", "Landed", "Notes"].map((h) => (
                <th key={h} className={cx("px-4 py-3 font-medium", h === "Landed" && "text-right")}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((s) => {
              const q = s.quote!;
              const out = s.rank == null;
              return (
                <tr key={s.supplierId} className={cx(out && "text-muted")}>
                  <td className="px-4 py-3 font-mono text-xs">{s.rank ?? "–"}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{s.name}</p>
                    <TrustBadge band={s.trustBand} score={s.trustScore} />
                  </td>
                  <td className="tabular px-4 py-3">₹{q.unit_price} {basisLabel(q, unitWord)}{q.price_basis === "per_kg" && q.units_per_basis ? <span className="block text-xs text-muted">{q.units_per_basis} pcs/kg</span> : null}</td>
                  <td className="px-4 py-3">{gstText(q)}</td>
                  <td className="px-4 py-3">{freightText(q)}</td>
                  <td className="tabular px-4 py-3">{q.setup_cost ? formatINR(q.setup_cost) : "–"}</td>
                  <td className="tabular px-4 py-3">{q.moq ? formatNumber(q.moq) : "–"}</td>
                  <td className="px-4 py-3">{q.lead_time_days != null ? `${q.lead_time_days} d` : "–"}</td>
                  <td className="px-4 py-3">{payText(q)}</td>
                  <td className="tabular px-4 py-3 text-right font-display text-base font-semibold text-ink">{q.landed_unit_cost != null ? <span className={out ? "" : "landed"}>{formatINR(Number(q.landed_unit_cost), { unit: true })}</span> : "–"}</td>
                  <td className="max-w-[220px] px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {q.flags.map((f) => (
                        <span key={f} title={FLAG_LABEL[f] ?? f} className={cx("rounded px-1.5 py-0.5 text-[11px]", ["unit_not_comparable", "too_good_to_be_true", "quote_expired"].includes(f) ? "bg-coral-soft text-coral" : "bg-marigold-soft text-[#8A5A00]")}>
                          {FLAG_SHORT[f] ?? f}
                        </span>
                      ))}
                      {out && s.reasons.length ? <span className="text-[11px] text-coral">{s.reasons[0]}</span> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
const STATUS_TEXT: Record<string, [string, "neutral" | "good" | "warn" | "bad" | "info"]> = {
  candidate: ["Lined up", "neutral"],
  excluded: ["Skipped", "bad"],
  queued: ["Call scheduled", "info"],
  calling: ["On the call", "warn"],
  callback: ["Calling back", "warn"],
  quoted: ["Quoted", "good"],
  declined: ["Declined", "neutral"],
  unreachable: ["Unreachable", "neutral"],
  opted_out: ["Opted out", "bad"],
  shortlisted: ["Shortlisted", "good"],
  not_shortlisted: ["Quoted", "neutral"],
  selected: ["Chosen", "good"],
};

export function Funnel({ view }: { view: BriefView }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader title="Suppliers and calls" subtitle={`${view.suppliers.length} considered. Open any row to read the call.`} />
      {view.suppliers.length === 0 ? <p className="px-5 py-8 text-sm text-muted">Finding suppliers near you...</p> : null}
      <ul className="divide-y divide-line">
        {view.suppliers.map((s) => {
          const [label, tone] = STATUS_TEXT[s.status] ?? [s.status, "neutral"];
          const isOpen = open === s.supplierId;
          return (
            <li key={s.supplierId}>
              <button type="button" onClick={() => setOpen(isOpen ? null : s.supplierId)} className="focus-ring flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-paper" aria-expanded={isOpen}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="truncate text-xs text-muted">{s.excludeReason ?? s.matchReason ?? ""}{s.callAttempts > 1 ? ` · ${s.callAttempts} calls` : ""}</p>
                </div>
                <Badge tone={tone} dot={s.status === "calling"}>{label}</Badge>
                <ChevronDown className={cx("h-4 w-4 text-muted transition", isOpen && "rotate-180")} />
              </button>
              {isOpen ? (
                <div className="space-y-4 bg-paper/70 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <TrustBadge band={s.trustBand} score={s.trustScore} />
                    {s.gstin ? <span className="font-mono">GSTIN {s.gstin}</span> : <span>No GSTIN yet</span>}
                    <span>Phone {s.phone}</span>
                    {s.isDemo ? <Badge>Demo supplier</Badge> : null}
                  </div>
                  {s.trustLedger.length ? (
                    <ul className="grid gap-1 text-xs sm:grid-cols-2">
                      {s.trustLedger.map((e) => (
                        <li key={e.code} className="flex items-center gap-1.5">
                          {e.kind === "passed" ? <Check className="h-3 w-3 text-mint-deep" /> : e.kind === "deduction" ? <X className="h-3 w-3 text-coral" /> : <span className="h-3 w-3 text-center text-muted">·</span>}
                          <span className="flex-1">{e.label}</span>
                          {e.points ? <span className="font-mono text-coral">{e.points}</span> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {s.calls.length === 0 ? <p className="text-sm text-muted">No calls yet.</p> : null}
                  {s.calls.map((c) => (
                    <div key={c.id} className="rounded-lg border border-line bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 text-xs text-muted">
                        <span className="font-semibold text-ink">{c.purpose === "negotiation" ? "Negotiation" : "Quote call"}</span>
                        <span>
                          {formatDateTime(c.created_at)}
                          {c.duration_s ? ` · ${Math.floor(c.duration_s / 60)}m ${c.duration_s % 60}s` : ""}
                          {c.provider === "simulated" ? " · simulated" : ""}
                        </span>
                      </div>
                      {c.summary ? <p className="px-3 pt-2 text-sm font-medium">{c.summary}</p> : null}
                      <div className="max-h-72 space-y-2 overflow-y-auto px-3 py-3">
                        {c.transcript.length === 0 ? <p className="text-sm text-muted">{c.outcome === "no_answer" ? "No answer." : "Transcript will appear when the call ends."}</p> : null}
                        {c.transcript.map((t, i) => (
                          <div key={i} className={cx("flex gap-2 text-sm", t.speaker === "agent" ? "" : "flex-row-reverse text-right")}>
                            <span className={cx("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full", t.speaker === "agent" ? "bg-ink text-marigold" : "bg-marigold-soft text-ink")}>
                              {t.speaker === "agent" ? <Bot className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
                            </span>
                            <p className={cx("max-w-[85%] rounded-xl px-3 py-2", t.speaker === "agent" ? "bg-paper" : "bg-marigold-soft/60")}>{t.text}</p>
                          </div>
                        ))}
                      </div>
                      {c.recording_url ? (
                        <audio controls preload="none" src={c.recording_url} className="w-full px-3 pb-3" />
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
export function NegotiationLog({ view, unitWord }: { view: BriefView; unitWord: string }) {
  const name = (id: string) => view.suppliers.find((s) => s.supplierId === id)?.name ?? "Supplier";
  return (
    <Card>
      <CardHeader title="Negotiation" subtitle="Real competing prices only. Supplier names never shared." />
      <ul className="divide-y divide-line">
        {view.negotiations.map((n) => (
          <li key={n.id} className="px-5 py-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{name(n.supplier_id)}</p>
              <Badge tone={n.outcome === "improved" ? "good" : n.outcome === "declined" ? "bad" : "neutral"}>{n.outcome === "improved" ? "Came down" : n.outcome === "held" ? "Held price" : n.outcome === "no_response" ? "With ops desk" : n.outcome ?? "Pending"}</Badge>
            </div>
            {n.before_landed != null && n.after_landed != null && n.after_landed < n.before_landed ? (
              <p className="tabular mt-1 text-mint-deep">
                {formatINR(Number(n.before_landed), { unit: true })} → {formatINR(Number(n.after_landed), { unit: true })} landed / {unitWord}
              </p>
            ) : null}
            {n.ask_unit_price > 0 ? <p className="mt-1 text-xs text-muted">Asked {formatINR(Number(n.ask_unit_price), { unit: true })} / {unitWord} before GST and freight</p> : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
export function Timeline({ view }: { view: BriefView }) {
  const events = [...view.events].reverse().slice(0, 60);
  return (
    <Card>
      <CardHeader title="Activity" />
      <ol className="space-y-0 px-5 py-4">
        {events.map((e, i) => (
          <li key={e.id} className="relative flex gap-3 pb-4">
            {i < events.length - 1 ? <span className="absolute left-[5px] top-3 h-full w-px bg-line" /> : null}
            <span className={cx("relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-white", e.kind === "needs_attention" || e.kind === "error" ? "bg-coral" : e.kind === "shortlist" || e.kind === "selected" ? "bg-mint" : e.actor === "buyer" ? "bg-sky" : "bg-ink")} />
            <div className="min-w-0">
              <p className="text-sm font-medium">{e.title}</p>
              {e.detail ? <p className="text-xs leading-relaxed text-muted">{e.detail}</p> : null}
              <p className="mt-0.5 text-[11px] text-muted">{timeAgo(e.created_at, new Date(view.serverTime).getTime())}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// ---------------------------------------------------------------------------
export function OutcomeForm({ view, onSaved }: { view: BriefView; onSaved: () => void }) {
  const chosen = view.suppliers.filter((s) => s.status === "selected");
  const [supplierId, setSupplierId] = useState(chosen[0]?.supplierId ?? "");
  const [ordered, setOrdered] = useState<"yes" | "no">("yes");
  const [value, setValue] = useState("");
  const [onTime, setOnTime] = useState("");
  const [quality, setQuality] = useState("");
  const [honoured, setHonoured] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  if (!chosen.length) return null;
  const tri = (v: string) => (v === "" ? null : v === "yes");

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/briefs/${view.brief.id}/outcome`, "POST", {
        supplierId,
        ordered: ordered === "yes",
        order_value: value ? Number(value) : null,
        delivered_on_time: tri(onTime),
        quality_ok: tri(quality),
        quote_honoured: tri(honoured),
      });
      setMsg({ tone: "good", text: "Thanks. This supplier's trust score now reflects your order." });
      onSaved();
    } catch (e) {
      setMsg({ tone: "bad", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const YesNo = ({ id, label, v, set }: { id: string; label: string; v: string; set: (s: string) => void }) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={v} onChange={(e) => set(e.target.value)}>
        <option value="">Not yet / not sure</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </Select>
    </div>
  );

  return (
    <Card>
      <CardHeader title={view.outcome ? "Order outcome (recorded)" : "How did it go?"} subtitle="Takes 20 seconds and makes every future shortlist sharper, for you and other buyers." />
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        {chosen.length > 1 ? (
          <div>
            <Label htmlFor="o-s">Supplier</Label>
            <Select id="o-s" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              {chosen.map((c) => (
                <option key={c.supplierId} value={c.supplierId}>{c.name}</option>
              ))}
            </Select>
          </div>
        ) : null}
        <div>
          <Label htmlFor="o-ordered">Did you place the order?</Label>
          <Select id="o-ordered" value={ordered} onChange={(e) => setOrdered(e.target.value as "yes" | "no")}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </div>
        {ordered === "yes" ? (
          <>
            <div>
              <Label htmlFor="o-val" hint="(optional)">Order value (₹)</Label>
              <Input id="o-val" type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <YesNo id="o-time" label="Delivered on time?" v={onTime} set={setOnTime} />
            <YesNo id="o-q" label="Quality as agreed?" v={quality} set={setQuality} />
          </>
        ) : null}
        <YesNo id="o-h" label="Did they honour the quoted price?" v={honoured} set={setHonoured} />
      </div>
      <div className="flex items-center gap-3 border-t border-line px-5 py-4">
        <Button onClick={save} disabled={busy || !supplierId}>
          {busy ? <Spinner /> : null} Save outcome
        </Button>
        {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}
      </div>
    </Card>
  );
}
