"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Upload, Plus } from "lucide-react";
import { api } from "@/lib/client-api";
import { Alert, Button, Card, Input, Label, Select, Spinner, Textarea, cx } from "@/components/ui";

const SAMPLE = `name,phone,city,state,pincode,categories,gstin,is_manufacturer
Example Cups Pvt Ltd,9811122233,New Delhi,Delhi,110020,paper_cup;food_container,,yes`;

export function AddSupplier({ categories }: { categories: { id: string; label: string }[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"none" | "one" | "csv">("none");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "good" | "bad" | "warn"; text: string; list?: string[] } | null>(null);
  const [csv, setCsv] = useState("");
  const [cats, setCats] = useState<string[]>([]);

  async function addOne(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/suppliers", "POST", {
        name: f.get("name"),
        phone: f.get("phone"),
        city: f.get("city") || null,
        state: f.get("state") || null,
        pincode: f.get("pincode") || null,
        gstin: f.get("gstin") || null,
        is_manufacturer: f.get("mfr") === "" ? null : f.get("mfr") === "yes",
        categories: cats,
        source: f.get("source"),
      });
      setMsg({ tone: "good", text: "Supplier added and vetted." });
      (e.target as HTMLFormElement).reset();
      setCats([]);
      router.refresh();
    } catch (err) {
      setMsg({ tone: "bad", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function importCsv() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ added: number; errors: string[] }>("/api/suppliers/import", "POST", { csv });
      setMsg({ tone: r.errors.length ? "warn" : "good", text: `Added ${r.added} supplier${r.added === 1 ? "" : "s"}.${r.errors.length ? ` ${r.errors.length} rows skipped:` : ""}`, list: r.errors.slice(0, 20) });
      if (r.added) router.refresh();
    } catch (err) {
      setMsg({ tone: "bad", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-2">
        <Button variant={tab === "one" ? "dark" : "outline"} size="sm" onClick={() => setTab(tab === "one" ? "none" : "one")}>
          <Plus className="h-4 w-4" /> Add supplier
        </Button>
        <Button variant={tab === "csv" ? "dark" : "outline"} size="sm" onClick={() => setTab(tab === "csv" ? "none" : "csv")}>
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
      </div>

      {tab === "one" ? (
        <form onSubmit={addOne} className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2"><Label htmlFor="s-name">Business name</Label><Input id="s-name" name="name" required /></div>
          <div><Label htmlFor="s-phone">Phone</Label><Input id="s-phone" name="phone" required inputMode="tel" /></div>
          <div><Label htmlFor="s-city">City</Label><Input id="s-city" name="city" /></div>
          <div><Label htmlFor="s-state">State</Label><Input id="s-state" name="state" placeholder="Delhi" /></div>
          <div><Label htmlFor="s-pin">Pincode</Label><Input id="s-pin" name="pincode" maxLength={6} /></div>
          <div><Label htmlFor="s-gst">GSTIN</Label><Input id="s-gst" name="gstin" className="uppercase" maxLength={15} /></div>
          <div>
            <Label htmlFor="s-mfr">Manufacturer?</Label>
            <Select id="s-mfr" name="mfr" defaultValue="">
              <option value="">Not sure</option><option value="yes">Manufacturer</option><option value="no">Trader</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="s-src">Where from</Label>
            <Select id="s-src" name="source" defaultValue="manual">
              <option value="manual">Manual</option><option value="indiamart_manual">Found on a directory (as a buyer)</option><option value="referral">Referral</option>
            </Select>
          </div>
          <div className="sm:col-span-3">
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button type="button" key={c.id} onClick={() => setCats((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))} className={cx("focus-ring rounded-full border px-3 py-1 text-sm", cats.includes(c.id) ? "border-ink bg-ink text-white" : "border-line bg-white")}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={busy || !cats.length}>{busy ? <Spinner /> : null} Add and vet</Button>
          </div>
        </form>
      ) : null}

      {tab === "csv" ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted">Columns: name, phone, categories (separate with ;), and optionally city, state, pincode, gstin, is_manufacturer, contact_person, email, website. Category ids: {categories.map((c) => c.id).join(", ")}.</p>
          <Textarea rows={6} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={SAMPLE} className="font-mono text-xs" />
          <div className="flex gap-2">
            <input type="file" accept=".csv,text/csv" className="text-sm" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setCsv(await file.text()); }} />
            <Button onClick={importCsv} disabled={busy || csv.trim().length < 10}>{busy ? <Spinner /> : null} Import</Button>
          </div>
        </div>
      ) : null}

      {msg ? (
        <div className="mt-4">
          <Alert tone={msg.tone} title={msg.text}>
            {msg.list?.length ? <ul className="list-disc pl-5">{msg.list.map((l) => <li key={l}>{l}</li>)}</ul> : null}
          </Alert>
        </div>
      ) : null}
    </Card>
  );
}
