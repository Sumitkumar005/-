import Link from "next/link";
import { requireOpsPage } from "@/lib/ops";
import { db } from "@/lib/db/admin";
import type { Interaction, OpsTask, Quote } from "@/lib/db/types";
import { env } from "@/lib/env";
import { llmName } from "@/lib/llm/client";
import { timeAgo } from "@/lib/format";
import { Badge, Card, CardHeader, EmptyState, Stat } from "@/components/ui";
import { TaskActions } from "./task-actions";

export const metadata = { title: "Ops desk" };
export const dynamic = "force-dynamic";

export default async function OpsDesk() {
  await requireOpsPage();
  const [tasksRes, jobsRes, evalRes] = await Promise.all([
    db().from("ops_tasks").select("*").eq("status", "open").order("created_at", { ascending: true }).limit(200),
    db().from("jobs").select("status, type, last_error, brief_id, created_at").in("status", ["queued", "running", "failed"]).order("created_at", { ascending: false }).limit(300),
    db().from("interactions").select("id, ground_truth, outcome").eq("purpose", "quote").eq("outcome", "quoted").not("ground_truth", "is", null).order("created_at", { ascending: false }).limit(300),
  ]);
  const tasks = (tasksRes.data ?? []) as OpsTask[];
  const jobs = (jobsRes.data ?? []) as { status: string; type: string; last_error: string | null; brief_id: string | null; created_at: string }[];
  const evalCalls = (evalRes.data ?? []) as Pick<Interaction, "id" | "ground_truth">[];

  // Extraction accuracy against simulator ground truth: the regression signal for prompt or model changes.
  let evalQuotes: Quote[] = [];
  if (evalCalls.length) {
    const { data } = await db().from("quotes").select("*").eq("version", 1).in("interaction_id", evalCalls.map((c) => c.id));
    evalQuotes = (data ?? []) as Quote[];
  }
  const fields = ["unit_price", "moq", "lead_time_days", "advance_pct", "setup_cost"] as const;
  const acc = fields.map((f) => {
    let right = 0;
    let total = 0;
    for (const q of evalQuotes) {
      const gt = evalCalls.find((c) => c.id === q.interaction_id)?.ground_truth as Record<string, number | null> | undefined;
      if (!gt) continue;
      total++;
      const a = q[f] == null ? null : Number(q[f]);
      if (a === (gt[f] ?? null)) right++;
    }
    return { f, pct: total ? Math.round((right / total) * 100) : null, total };
  });

  const failed = jobs.filter((j) => j.status === "failed");
  const quoteTaskIds = tasks.filter((t) => t.kind === "review_quote" && t.ref_id).map((t) => t.ref_id!);
  const { data: tq } = quoteTaskIds.length ? await db().from("quotes").select("*").in("id", quoteTaskIds) : { data: [] };
  const taskQuotes = new Map(((tq ?? []) as Quote[]).map((q) => [q.id, q]));

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ops desk</h1>
        <p className="mt-1 text-muted">Human in the loop: quotes to confirm, briefs that got stuck, opt-outs. LLM: {llmName()}. Voice: {env.voiceProvider}.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Open tasks" value={tasks.length} />
        <Stat label="Jobs in queue" value={jobs.filter((j) => j.status !== "failed").length} sub={`${jobs.filter((j) => j.status === "running").length} running`} />
        <Stat label="Failed jobs" value={failed.length} sub={failed[0]?.last_error?.slice(0, 60) ?? "None"} />
      </div>

      <Card>
        <CardHeader title="Open tasks" />
        {tasks.length === 0 ? (
          <div className="p-5"><EmptyState title="All clear" body="Nothing needs a human right now." /></div>
        ) : (
          <ul className="divide-y divide-line">
            {tasks.map((t) => (
              <li key={t.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone={t.kind === "needs_attention" ? "bad" : t.kind === "opt_out" ? "neutral" : "warn"}>{t.kind.replace("_", " ")}</Badge>
                      <p className="font-medium">{t.title}</p>
                    </div>
                    {t.detail ? <p className="mt-1 text-sm text-muted">{t.detail}</p> : null}
                    <p className="mt-1 text-xs text-muted">
                      {timeAgo(t.created_at)}
                      {t.brief_id ? <> · <Link className="underline" href={`/app/briefs/${t.brief_id}`}>Open brief</Link></> : null}
                      {t.supplier_id ? <> · <Link className="underline" href={`/app/suppliers/${t.supplier_id}`}>Supplier</Link></> : null}
                    </p>
                  </div>
                  <TaskActions task={t} quote={t.ref_id ? taskQuotes.get(t.ref_id) ?? null : null} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Extraction accuracy" subtitle={`Quote fields read from ${evalQuotes.length} simulated calls, checked against the simulator's ground truth. Re-check after any prompt or model change.`} />
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-5">
          {acc.map((a) => (
            <div key={a.f}>
              <p className="tabular font-display text-2xl font-semibold">{a.pct == null ? "–" : `${a.pct}%`}</p>
              <p className="text-xs text-muted">{a.f.replace(/_/g, " ")}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
