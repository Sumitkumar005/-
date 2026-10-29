"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Rocket } from "lucide-react";
import type { Brief } from "@/lib/db/types";
import type { CategoryTemplate } from "@/lib/domain/categories";
import { api } from "@/lib/client-api";
import { Alert, Button, Card, CardHeader, Input, Label, Select, Spinner } from "@/components/ui";

type SpecValue = string | number | boolean | null;

export function DraftEditor({ brief, categories, onSaved, onConfirmed }: { brief: Brief; categories: CategoryTemplate[]; onSaved: (b: Brief) => void; onConfirmed: () => void }) {
  const [f, setF] = useState({
    title: brief.title,
    category: brief.category,
    spec: brief.spec as Record<string, SpecValue>,
    quantity: brief.quantity?.toString() ?? "",
    frequency: brief.frequency,
    delivery_pincode: brief.delivery_pincode ?? "",
    needed_by: brief.needed_by ?? "",
    current_unit_price: brief.current_unit_price?.toString() ?? "",
    target_unit_price: brief.target_unit_price?.toString() ?? "",
    max_unit_price: brief.max_unit_price?.toString() ?? "",
    must_haves: brief.must_haves.join(", "),
    negotiation_allowed: brief.negotiation.allowed,
    max_suppliers: brief.max_suppliers,
  });
  const [busy, setBusy] = useState<"save" | "go" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState(brief.open_questions);
  const cat = useMemo(() => categories.find((c) => c.id === f.category) ?? categories[categories.length - 1], [categories, f.category]);
  const unitWord = cat.unit === "pieces" ? "piece" : cat.unit.replace(/s$/, "");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const num = (s: string) => (s.trim() === "" ? null : Number(s));

  async function save(): Promise<Brief | null> {
    const payload = {
      title: f.title,
      category: f.category,
      spec: f.spec,
      quantity: num(f.quantity),
      frequency: f.frequency,
      delivery_pincode: f.delivery_pincode.trim() || null,
      needed_by: f.needed_by || null,
      current_unit_price: num(f.current_unit_price),
      target_unit_price: num(f.target_unit_price),
      max_unit_price: num(f.max_unit_price),
      must_haves: f.must_haves.split(",").map((s) => s.trim()).filter(Boolean),
      negotiation_allowed: f.negotiation_allowed,
      max_suppliers: f.max_suppliers,
    };
    for (const k of ["quantity", "current_unit_price", "target_unit_price", "max_unit_price"] as const) {
      const v = payload[k];
      if (v != null && (!Number.isFinite(v) || v <= 0)) {
        setError("Quantity and prices must be positive numbers");
        return null;
      }
    }
    const saved = await api<Brief>(`/api/briefs/${brief.id}`, "PATCH", payload);
    setQuestions(saved.open_questions);
    onSaved(saved);
    return saved;
  }

  async function run(kind: "save" | "go") {
    setBusy(kind);
    setError(null);
    try {
      const saved = await save();
      if (saved && kind === "go") {
        await api(`/api/briefs/${brief.id}/confirm`, "POST", {});
        onConfirmed();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const groups = Array.from(new Set(categories.map((c) => c.group)));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <CardHeader title="Check your brief" subtitle="This is exactly what our agent will ask suppliers to quote on." />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={80} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="category">Category</Label>
            <Select id="category" value={f.category} onChange={(e) => set("category", e.target.value)}>
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {categories.filter((c) => c.group === g).map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>

          {cat.fields.map((fld) => {
            const v = f.spec[fld.key];
            const setSpec = (val: SpecValue) => set("spec", { ...f.spec, [fld.key]: val });
            return (
              <div key={fld.key} className={fld.type === "text" && fld.key === "description" ? "sm:col-span-2" : ""}>
                <Label htmlFor={`spec-${fld.key}`} hint={fld.required ? undefined : "(optional)"}>
                  {fld.label}
                  {fld.suffix ? ` (${fld.suffix})` : ""}
                </Label>
                {fld.type === "select" ? (
                  <Select id={`spec-${fld.key}`} value={(v as string) ?? ""} onChange={(e) => setSpec(e.target.value || null)}>
                    <option value="">Choose</option>
                    {fld.options!.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </Select>
                ) : fld.type === "boolean" ? (
                  <Select id={`spec-${fld.key}`} value={v === true ? "yes" : v === false ? "no" : ""} onChange={(e) => setSpec(e.target.value === "" ? null : e.target.value === "yes")}>
                    <option value="">Not needed / not sure</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </Select>
                ) : (
                  <Input id={`spec-${fld.key}`} type={fld.type === "number" ? "number" : "text"} min={0} value={(v as string | number | null) ?? ""} placeholder={fld.hint} onChange={(e) => setSpec(e.target.value === "" ? null : fld.type === "number" ? Number(e.target.value) : e.target.value)} />
                )}
              </div>
            );
          })}

          <div>
            <Label htmlFor="quantity">Quantity per order ({cat.unit})</Label>
            <Input id="quantity" type="number" min={1} value={f.quantity} onChange={(e) => set("quantity", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="frequency">How often</Label>
            <Select id="frequency" value={f.frequency} onChange={(e) => set("frequency", e.target.value as Brief["frequency"])}>
              <option value="one_time">One time</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="pin">Delivery pincode</Label>
            <Input id="pin" inputMode="numeric" maxLength={6} value={f.delivery_pincode} onChange={(e) => set("delivery_pincode", e.target.value.replace(/\D/g, ""))} />
          </div>
          <div>
            <Label htmlFor="needed_by" hint="(optional)">Needed by</Label>
            <Input id="needed_by" type="date" value={f.needed_by} onChange={(e) => set("needed_by", e.target.value)} />
          </div>

          <div className="sm:col-span-2 rounded-lg bg-paper p-4">
            <p className="text-sm font-semibold">Prices, per {unitWord}, delivered, GST included</p>
            <p className="text-xs text-muted">All optional. What you pay today lets us show your real saving. Your maximum filters quotes; your target is used when negotiating.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["current_unit_price", "You pay today"],
                  ["target_unit_price", "Target"],
                  ["max_unit_price", "Maximum"],
                ] as const
              ).map(([k, l]) => (
                <div key={k}>
                  <Label htmlFor={k}>{l} (₹)</Label>
                  <Input id={k} type="number" min={0} step="0.01" value={f[k]} onChange={(e) => set(k, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="must" hint="(comma separated)">Must haves</Label>
            <Input id="must" value={f.must_haves} placeholder="GST invoice, sample before bulk, food grade" onChange={(e) => set("must_haves", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="neg">Negotiate for me</Label>
            <Select id="neg" value={f.negotiation_allowed ? "yes" : "no"} onChange={(e) => set("negotiation_allowed", e.target.value === "yes")}>
              <option value="yes">Yes, with the top three</option>
              <option value="no">No, just get quotes</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="maxs">Suppliers to call</Label>
            <Select id="maxs" value={f.max_suppliers} onChange={(e) => set("max_suppliers", Number(e.target.value))}>
              {[6, 8, 10, 12, 15, 20].map((n) => (
                <option key={n} value={n}>Up to {n}</option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {questions.length ? (
          <Alert tone="warn" title="We still need">
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </Alert>
        ) : (
          <Alert tone="good" title="Ready to source">Everything a supplier needs to quote is here.</Alert>
        )}
        {brief.raw_text ? (
          <Card className="p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <MessageCircle className="h-3.5 w-3.5" /> You wrote
            </p>
            <p className="mt-2 text-sm italic text-ink-soft">“{brief.raw_text}”</p>
          </Card>
        ) : null}
        <Card className="p-4 text-sm text-muted">
          <p className="font-semibold text-ink">What happens next</p>
          <p className="mt-1">We pick suppliers near your pincode, check their GST, and call them. You will see every call and quote here as it happens. Most briefs reach a shortlist within 48 hours.</p>
        </Card>
        {error ? <Alert tone="bad">{error}</Alert> : null}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" disabled={!!busy} onClick={() => run("save")}>
            {busy === "save" ? <Spinner /> : null} Save draft
          </Button>
          <Button variant="primary" className="flex-1" disabled={!!busy} onClick={() => run("go")}>
            {busy === "go" ? <Spinner /> : <Rocket className="h-4 w-4" />} Start sourcing
          </Button>
        </div>
      </div>
    </div>
  );
}
