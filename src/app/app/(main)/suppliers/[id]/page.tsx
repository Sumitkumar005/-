import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { requireOpsPage } from "@/lib/ops";
import { db } from "@/lib/db/admin";
import type { Interaction, Outcome, Quote, Supplier } from "@/lib/db/types";
import { getCategory } from "@/lib/domain/categories";
import { formatPhone } from "@/lib/domain/phone";
import { formatDate, formatINR } from "@/lib/format";
import { TrustBadge } from "@/components/status";
import { Badge, Card, CardHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOpsPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await db().from("suppliers").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const s = data as Supplier;
  const [quotes, calls, outcomes] = await Promise.all([
    db().from("quotes").select("*").eq("supplier_id", id).eq("is_latest", true).order("created_at", { ascending: false }).limit(50),
    db().from("interactions").select("id, brief_id, outcome, summary, created_at, purpose").eq("supplier_id", id).order("created_at", { ascending: false }).limit(50),
    db().from("outcomes").select("*").eq("supplier_id", id).order("created_at", { ascending: false }),
  ]);
  const q = (quotes.data ?? []) as Quote[];
  const c = (calls.data ?? []) as Interaction[];
  const o = (outcomes.data ?? []) as Outcome[];
  const answered = c.filter((x) => x.purpose === "quote" && x.outcome && x.outcome !== "no_answer").length;
  const quoteCalls = c.filter((x) => x.purpose === "quote" && x.outcome).length;

  return (
    <div className="animate-rise space-y-6">
      <Link href="/app/suppliers" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Directory
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{s.name}</h1>
          <p className="mt-1 text-muted">
            {[s.city, s.state, s.pincode].filter(Boolean).join(", ")} · {formatPhone(s.phone)} · {s.is_manufacturer === false ? "Trader" : s.is_manufacturer ? "Manufacturer" : "Type unknown"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {s.categories.map((cat) => <Badge key={cat}>{getCategory(cat).label}</Badge>)}
            {s.do_not_call ? <Badge tone="bad">Do not call</Badge> : null}
            {s.is_demo ? <Badge tone="info">Demo</Badge> : null}
          </div>
        </div>
        <div className="text-right">
          <p className="tabular font-display text-5xl font-bold">{s.trust_score ?? "–"}</p>
          <TrustBadge band={s.trust_band} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Trust ledger" subtitle={`Checked ${s.verified_at ? formatDate(s.verified_at) : "never"}. GSTIN ${s.gstin ?? "not on record"}.`} />
          <ul className="divide-y divide-line">
            {s.trust_ledger.map((e) => (
              <li key={e.code} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                {e.kind === "passed" ? <Check className="h-4 w-4 text-mint-deep" /> : e.kind === "deduction" ? <X className="h-4 w-4 text-coral" /> : <span className="h-4 w-4 text-center text-muted">·</span>}
                <span className="flex-1">{e.label}</span>
                {e.points ? <span className="font-mono text-coral">{e.points}</span> : null}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Track record" />
          <div className="grid grid-cols-3 gap-4 p-5 text-center">
            <div><p className="tabular font-display text-2xl font-semibold">{quoteCalls ? Math.round((answered / quoteCalls) * 100) : 0}%</p><p className="text-xs text-muted">pick-up rate ({quoteCalls} calls)</p></div>
            <div><p className="tabular font-display text-2xl font-semibold">{q.length}</p><p className="text-xs text-muted">quotes given</p></div>
            <div><p className="tabular font-display text-2xl font-semibold">{o.filter((x) => x.ordered).length}</p><p className="text-xs text-muted">orders</p></div>
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {o.map((x) => (
              <li key={x.id} className="px-5 py-2.5 text-sm">
                {x.ordered ? `Ordered${x.order_value ? ` ${formatINR(Number(x.order_value))}` : ""}` : "Not ordered"} · on time {fmt(x.delivered_on_time)} · quality {fmt(x.quality_ok)} · price honoured {fmt(x.quote_honoured)}
                <span className="text-muted"> · {formatDate(x.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent quotes" />
        <ul className="divide-y divide-line">
          {q.length === 0 ? <li className="px-5 py-4 text-sm text-muted">No quotes yet.</li> : null}
          {q.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <Link href={`/app/briefs/${x.brief_id}`} className="hover:underline">₹{x.unit_price} {x.price_basis.replace("_", " ")}{x.moq ? `, MOQ ${x.moq}` : ""}{x.lead_time_days != null ? `, ${x.lead_time_days} days` : ""}</Link>
              <span className="tabular font-semibold">{x.landed_unit_cost != null ? `${formatINR(Number(x.landed_unit_cost), { unit: true })} landed` : "–"}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

const fmt = (v: boolean | null) => (v == null ? "?" : v ? "yes" : "no");
