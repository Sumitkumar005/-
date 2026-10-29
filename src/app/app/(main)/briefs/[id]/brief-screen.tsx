"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CircleAlert, Hourglass, RefreshCw, ShieldCheck } from "lucide-react";
import type { BriefView } from "@/lib/views/brief-view";
import type { CategoryTemplate } from "@/lib/domain/categories";
import { describeSpec } from "@/lib/domain/categories";
import { isActive, PIPELINE, STATUS_LABEL } from "@/lib/domain/brief-state";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { api } from "@/lib/client-api";
import { BriefStatusBadge } from "@/components/status";
import { Alert, Button, Card, Spinner, cx } from "@/components/ui";
import { DraftEditor } from "./draft-editor";
import { Funnel, NegotiationLog, OutcomeForm, QuoteSheet, Shortlist, Timeline } from "./parts";

export function BriefScreen({ initial, categories }: { initial: BriefView; categories: CategoryTemplate[] }) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const b = view.brief;
  const live = isActive(b.status);

  const refresh = useCallback(async () => {
    try {
      setView(await api<BriefView>(`/api/briefs/${b.id}`));
    } catch {
      // keep the last good view; next poll will retry
    }
  }, [b.id]);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [live, refresh]);

  async function act(name: string, path: string, body?: unknown, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(name);
    setError(null);
    try {
      await api(path, "POST", body ?? {});
      await refresh();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const unitWord = b.unit === "pieces" ? "piece" : b.unit.replace(/s$/, "");
  const quoted = view.suppliers.filter((s) => s.quote);
  const canRetry = ["needs_attention", "shortlist_ready"].includes(b.status) && b.run_no < 4;
  const canCancel = !["completed", "cancelled", "supplier_selected"].includes(b.status);

  return (
    <div className="animate-rise space-y-6">
      <div>
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> All briefs
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">{b.title}</h1>
              <BriefStatusBadge status={b.status} />
            </div>
            <p className="mt-1.5 text-muted">
              {describeSpec(b.category, b.spec) || "Spec pending"}
              {b.quantity ? ` · ${formatNumber(b.quantity)} ${b.unit}${b.frequency !== "one_time" ? ` ${b.frequency.replace("_", " ")}` : ""}` : ""}
              {b.delivery_pincode ? ` · to ${b.delivery_pincode}` : ""}
              {b.needed_by ? ` · by ${formatDate(b.needed_by)}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {canRetry && b.status === "shortlist_ready" ? (
              <Button variant="outline" size="sm" disabled={!!busy} onClick={() => act("retry", `/api/briefs/${b.id}/retry`, undefined, "Call more suppliers, including other states? Quotes you already have are kept.")}>
                {busy === "retry" ? <Spinner /> : <RefreshCw className="h-4 w-4" />} Find more suppliers
              </Button>
            ) : null}
            {canCancel && b.status !== "draft" ? (
              <Button variant="danger" size="sm" disabled={!!busy} onClick={() => act("cancel", `/api/briefs/${b.id}/cancel`, undefined, "Cancel this brief? Pending calls will stop.")}>
                Cancel brief
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <Alert tone="bad">{error}</Alert> : null}

      {b.status === "draft" ? (
        <DraftEditor brief={b} categories={categories} onSaved={(nb) => setView((v) => ({ ...v, brief: nb }))} onConfirmed={refresh} />
      ) : (
        <>
          <Progress view={view} />

          {b.status === "needs_attention" ? (
            <Card className="border-coral/30 p-5">
              <div className="flex gap-4">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-coral" />
                <div className="flex-1">
                  <p className="font-semibold">{b.status_reason ?? "This brief needs attention"}</p>
                  <p className="mt-1 text-sm text-muted">Our sourcing desk has been notified. You can also search again: we widen the area and call more suppliers, keeping any quotes already collected.</p>
                  {canRetry ? (
                    <Button className="mt-4" size="sm" disabled={!!busy} onClick={() => act("retry", `/api/briefs/${b.id}/retry`)}>
                      {busy === "retry" ? <Spinner /> : <RefreshCw className="h-4 w-4" />} Search again
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ) : null}

          {b.status === "in_review" ? (
            <Card className="flex items-center gap-4 p-5">
              <ShieldCheck className="h-5 w-5 text-sky" />
              <p className="flex-1 text-sm">
                <span className="font-semibold">Shortlist ready, final human check in progress.</span> <span className="text-muted">A member of our sourcing desk reviews every shortlist during the pilot.</span>
              </p>
              {view.viewerIsOps ? (
                <Button size="sm" variant="primary" disabled={!!busy} onClick={() => act("approve", `/api/ops/briefs/${b.id}/approve`)}>
                  Approve shortlist
                </Button>
              ) : null}
            </Card>
          ) : null}

          {["shortlist_ready", "supplier_selected", "completed"].includes(b.status) ? (
            <>
              <Savings view={view} unitWord={unitWord} />
              <Shortlist view={view} unitWord={unitWord} busy={busy} onSelect={(sid) => act(`select:${sid}`, `/api/briefs/${b.id}/select`, { supplierId: sid })} />
            </>
          ) : null}

          {["supplier_selected", "completed"].includes(b.status) ? <OutcomeForm view={view} onSaved={refresh} /> : null}

          {quoted.length ? <QuoteSheet view={view} unitWord={unitWord} /> : null}

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Funnel view={view} />
            <div className="space-y-6">
              {view.negotiations.length ? <NegotiationLog view={view} unitWord={unitWord} /> : null}
              <Timeline view={view} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const STEP_SHORT: Record<string, string> = { scouting: "Scout", vetting: "Vet", calling: "Call", comparing: "Compare", negotiating: "Negotiate", shortlist_ready: "Shortlist" };

function Progress({ view }: { view: BriefView }) {
  const b = view.brief;
  const s = view.suppliers;
  const counts: Record<string, string> = {
    scouting: s.length ? `${s.length} found` : "",
    vetting: s.length ? `${s.filter((x) => x.status !== "excluded").length} cleared` : "",
    calling: `${s.filter((x) => x.calls.some((c) => c.purpose === "quote")).length} called`,
    comparing: `${s.filter((x) => x.quote).length} quotes`,
    negotiating: view.negotiations.length ? `${view.negotiations.filter((n) => n.outcome === "improved").length} came down` : b.negotiation.allowed ? "" : "Off",
    shortlist_ready: s.filter((x) => x.status === "shortlisted" || x.status === "selected").length ? `${s.filter((x) => x.status === "shortlisted" || x.status === "selected").length} picked` : "",
  };
  const doneStatuses = ["in_review", "shortlist_ready", "supplier_selected", "completed"];
  const currentIdx = doneStatuses.includes(b.status) ? PIPELINE.length : Math.max(0, PIPELINE.indexOf(b.status as (typeof PIPELINE)[number]));
  const halted = b.status === "needs_attention" || b.status === "cancelled";

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{halted ? STATUS_LABEL[b.status] : isActive(b.status) ? "Working on it" : "Sourcing complete"}</p>
        {isActive(b.status) ? (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Hourglass className="h-3.5 w-3.5" /> Updates live
          </span>
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {PIPELINE.map((step, i) => {
          const done = i < currentIdx || (step === "shortlist_ready" && doneStatuses.includes(b.status));
          const active = !halted && i === currentIdx && isActive(b.status);
          return (
            <div key={step}>
              <div className={cx("h-1.5 rounded-full", done ? "bg-ink" : active ? "animate-pulseDot bg-marigold" : "bg-line")} />
              <p className={cx("mt-2 text-xs font-semibold", !done && !active && "text-muted")}>{STEP_SHORT[step]}</p>
              <p className="text-xs text-muted">{done || active ? counts[step] : ""}</p>
            </div>
          );
        })}
      </div>
      {b.summary.note ? <p className="mt-4 text-sm text-muted">{b.summary.note}</p> : null}
    </Card>
  );
}

function Savings({ view, unitWord }: { view: BriefView; unitWord: string }) {
  const s = view.brief.summary;
  if (s.best_landed == null) return null;
  const negotiated = s.first_best_landed != null && s.lowest_landed != null && s.first_best_landed > s.lowest_landed ? s.first_best_landed - s.lowest_landed : null;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Recommended landed cost</p>
        <p className="tabular mt-2 font-display text-3xl font-semibold"><span className="landed">{formatINR(s.best_landed, { unit: true })}</span></p>
        <p className="mt-1 text-sm text-muted">per {unitWord}, GST and delivery included</p>
      </Card>
      <Card className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{s.savings_basis === "current_price" ? "Saving vs what you pay today" : "Saving vs the median quote"}</p>
        <p className="tabular mt-2 font-display text-3xl font-semibold text-mint-deep">{s.savings_total != null ? formatINR(s.savings_total) : "–"}</p>
        <p className="mt-1 text-sm text-muted">{s.savings_per_unit != null ? `${formatINR(s.savings_per_unit, { unit: true })} per ${unitWord} on this order` : "No saving to report"}</p>
      </Card>
      <Card className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Market check</p>
        <p className="tabular mt-2 font-display text-3xl font-semibold">{s.median_landed != null ? formatINR(s.median_landed, { unit: true }) : "–"}</p>
        <p className="mt-1 text-sm text-muted">
          median of {s.quotes ?? 0} quotes{negotiated ? `; negotiation cut the lowest by ${formatINR(negotiated, { unit: true })}` : ""}
          {s.market_reference != null ? `; recent briefs paid ${formatINR(s.market_reference, { unit: true })}` : ""}
        </p>
      </Card>
    </div>
  );
}
