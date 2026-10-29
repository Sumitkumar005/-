// Executes one claimed job: retries with backoff, and surfaces final failures on the brief.

import { db } from "@/lib/db/admin";
import type { Job } from "@/lib/db/types";
import { HANDLERS } from "./steps";
import { getBrief, logEvent, needsAttention } from "./repo";

const TERMINAL = new Set(["cancelled", "completed"]);

export async function runJob(job: Job): Promise<"done" | "retry" | "failed" | "skipped" | "rescheduled"> {
  const finish = (status: string, extra: Record<string, unknown> = {}) =>
    db().from("jobs").update({ status, finished_at: new Date().toISOString(), locked_by: null, ...extra }).eq("id", job.id);

  try {
    const brief = job.brief_id ? await getBrief(job.brief_id) : null;
    if (!brief || TERMINAL.has(brief.status)) {
      await finish("cancelled");
      return "skipped";
    }
    const handler = HANDLERS[job.type];
    if (!handler) throw new Error(`Unknown job type ${job.type}`);
    const res = await handler(job, brief);
    if (res && "rescheduleAt" in res) {
      await db()
        .from("jobs")
        .update({ status: "queued", run_at: res.rescheduleAt.toISOString(), attempts: Math.max(0, job.attempts - 1), locked_by: null, locked_at: null })
        .eq("id", job.id);
      return "rescheduled";
    }
    await finish("done");
    return "done";
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (job.attempts < job.max_attempts) {
      const backoffMs = 5_000 * 3 ** (job.attempts - 1);
      await db()
        .from("jobs")
        .update({ status: "queued", run_at: new Date(Date.now() + backoffMs).toISOString(), last_error: message, locked_by: null, locked_at: null })
        .eq("id", job.id);
      return "retry";
    }
    await finish("failed", { last_error: message });
    if (job.brief_id) {
      const brief = await getBrief(job.brief_id);
      if (brief && !TERMINAL.has(brief.status)) {
        await logEvent(brief.id, "error", `Step "${job.type}" failed`, { detail: message.slice(0, 500), actor: "system" });
        await needsAttention(brief, `Something went wrong while ${STEP_LABEL[job.type] ?? job.type}`, message.slice(0, 500));
      }
    }
    return "failed";
  }
}

const STEP_LABEL: Record<string, string> = {
  scout: "finding suppliers",
  vet: "checking suppliers",
  schedule_calls: "scheduling calls",
  call: "calling a supplier",
  extract: "reading a call",
  compare: "comparing quotes",
  negotiate: "negotiating",
  shortlist: "building the shortlist",
};
