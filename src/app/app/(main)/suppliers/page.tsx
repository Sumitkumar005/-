import Link from "next/link";
import { requireOpsPage } from "@/lib/ops";
import { db } from "@/lib/db/admin";
import type { Supplier } from "@/lib/db/types";
import { CATEGORIES, getCategory } from "@/lib/domain/categories";
import { TrustBadge } from "@/components/status";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui";
import { AddSupplier } from "./add-supplier";

export const metadata = { title: "Suppliers" };
export const dynamic = "force-dynamic";

export default async function Suppliers({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  await requireOpsPage();
  const { category, q } = await searchParams;
  let query = db().from("suppliers").select("*").order("trust_score", { ascending: false, nullsFirst: false }).limit(500);
  if (category && CATEGORIES.some((c) => c.id === category)) query = query.contains("categories", [category]);
  if (q) query = query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
  const { data } = await query;
  const suppliers = (data ?? []) as Supplier[];

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Supplier directory</h1>
        <p className="mt-1 text-muted">Every call adds to this. Opted-out numbers are never called again.</p>
      </div>
      <AddSupplier categories={CATEGORIES.map((c) => ({ id: c.id, label: c.label }))} />
      <Card className="overflow-hidden">
        <CardHeader
          title={`${suppliers.length} suppliers`}
          action={
            <form className="flex gap-2">
              <input name="q" defaultValue={q} placeholder="Search name" className="focus-ring h-9 rounded-lg border border-line px-3 text-sm" />
              <select name="category" defaultValue={category ?? ""} className="focus-ring h-9 rounded-lg border border-line px-2 text-sm">
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <button className="focus-ring h-9 rounded-lg bg-ink px-3 text-sm font-semibold text-white">Filter</button>
            </form>
          }
        />
        {suppliers.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No suppliers match" body="Add suppliers by hand or import a CSV above. Run supabase/seed.sql to load the demo network." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-paper text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  {["Supplier", "Location", "Categories", "GSTIN", "Trust", "Source"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <Link href={`/app/suppliers/${s.id}`} className="font-medium hover:underline">{s.name}</Link>
                      <div className="mt-0.5 flex gap-1">
                        {s.do_not_call ? <Badge tone="bad">Do not call</Badge> : null}
                        {s.is_manufacturer === false ? <Badge>Trader</Badge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{[s.city, s.state].filter(Boolean).join(", ") || "–"}</td>
                    <td className="px-4 py-3 text-muted">{s.categories.map((c) => getCategory(c).label).join(", ")}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.gstin ?? "–"}</td>
                    <td className="px-4 py-3"><TrustBadge band={s.trust_band} score={s.trust_score} /></td>
                    <td className="px-4 py-3 text-muted">{s.source.replace("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
