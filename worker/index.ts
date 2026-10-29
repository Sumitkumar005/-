// Pipeline worker. Run alongside the web app: `npm run worker` (or `npm run dev:all`).
// Polls the jobs table, so it survives restarts and needs no extra infrastructure.

import { hostname } from "node:os";
import { db } from "@/lib/db/admin";
import { env } from "@/lib/env";
import { llmName } from "@/lib/llm/client";
import type { Job } from "@/lib/db/types";
import { runJob } from "@/lib/pipeline/runner";

const WORKER_ID = `${hostname()}:${process.pid}`;
const IDLE_MS = 1500;
let stopping = false;

async function claim(): Promise<Job | null> {
  const { data, error } = await db().rpc("claim_job", { p_worker: WORKER_ID });
  if (error) throw new Error(`claim_job failed: ${error.message}. Did you run the migration in supabase/migrations?`);
  const rows = (data ?? []) as Job[];
  return rows[0] ?? null;
}

async function lane(n: number) {
  while (!stopping) {
    let job: Job | null = null;
    try {
      job = await claim();
    } catch (e) {
      console.error(`[lane ${n}]`, (e as Error).message);
      await sleep(5000);
      continue;
    }
    if (!job) {
      await sleep(IDLE_MS);
      continue;
    }
    const started = Date.now();
    const result = await runJob(job);
    const ms = Date.now() - started;
    console.log(`[lane ${n}] ${job.type.padEnd(14)} ${result.padEnd(11)} ${String(ms).padStart(5)}ms  brief=${job.brief_id?.slice(0, 8) ?? "-"}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`BhavTaav worker ${WORKER_ID}`);
  console.log(`  LLM:   ${llmName()}`);
  console.log(`  Voice: ${env.voiceProvider}${env.voiceProvider === "simulated" ? " (no real calls are placed)" : ""}`);
  console.log(`  Lanes: ${env.workerConcurrency}, calling hours ${env.respectCallingHours ? "enforced" : "ignored (simulation)"}`);
  process.on("SIGINT", () => {
    console.log("Stopping after current jobs...");
    stopping = true;
  });
  process.on("SIGTERM", () => (stopping = true));
  await Promise.all(Array.from({ length: env.workerConcurrency }, (_, i) => lane(i + 1)));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
