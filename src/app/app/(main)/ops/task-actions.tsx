"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OpsTask, Quote } from "@/lib/db/types";
import { api } from "@/lib/client-api";
import { Button, Input, Label, Select, Spinner } from "@/components/ui";

export function TaskActions({ task, quote }: { task: OpsTask; quote: Quote | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function fix(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const n = (k: string) => (f.get(k) === "" ? null : Number(f.get(k)));
    await run(() =>
      api(`/api/ops/quotes/${quote!.id}`, "POST", {
        unit_price: n("unit_price"),
        price_basis: f.get("price_basis"),
        units_per_basis: n("units_per_basis"),
        gst_included: f.get("gst") === "" ? null : f.get("gst") === "yes",
        moq: n("moq"),
        lead_time_days: n("lead_time_days"),
        taskId: task.id,
      }),
    );
    setEditing(false);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        {quote && quote.is_latest ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>Correct quote</Button>
        ) : null}
        <Button size="sm" disabled={busy} onClick={() => run(() => api(`/api/ops/tasks/${task.id}`, "POST", { action: "resolve" }))}>
          {busy ? <Spinner /> : null} Resolve
        </Button>
      </div>
      {error ? <p className="text-xs text-coral">{error}</p> : null}
      {editing && quote ? (
        <form onSubmit={fix} className="grid w-full max-w-xl grid-cols-2 gap-2 rounded-lg border border-line bg-paper p-3 sm:grid-cols-3">
          <div><Label htmlFor="up">Price (₹)</Label><Input id="up" name="unit_price" type="number" step="0.01" defaultValue={quote.unit_price} required /></div>
          <div>
            <Label htmlFor="pb">Per</Label>
            <Select id="pb" name="price_basis" defaultValue={quote.price_basis}>
              {["per_unit", "per_100", "per_1000", "per_kg", "per_box", "lot"].map((b) => <option key={b} value={b}>{b.replace("_", " ")}</option>)}
            </Select>
          </div>
          <div><Label htmlFor="upb">Units per kg/box/lot</Label><Input id="upb" name="units_per_basis" type="number" defaultValue={quote.units_per_basis ?? ""} /></div>
          <div>
            <Label htmlFor="g">GST</Label>
            <Select id="g" name="gst" defaultValue={quote.gst_included == null ? "" : quote.gst_included ? "yes" : "no"}>
              <option value="">Not said</option><option value="yes">Included</option><option value="no">Extra</option>
            </Select>
          </div>
          <div><Label htmlFor="m">MOQ</Label><Input id="m" name="moq" type="number" defaultValue={quote.moq ?? ""} /></div>
          <div><Label htmlFor="l">Lead days</Label><Input id="l" name="lead_time_days" type="number" defaultValue={quote.lead_time_days ?? ""} /></div>
          <div className="col-span-full"><Button size="sm" type="submit" disabled={busy}>Save and re-compare</Button></div>
        </form>
      ) : null}
    </div>
  );
}
