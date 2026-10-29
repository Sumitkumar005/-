// One interface for every model call. Groq in production, a deterministic offline mock otherwise.
// Every JSON response is validated with zod; the pipeline never trusts raw model output.

import { z } from "zod";
import { env } from "@/lib/env";
import { toStrictJsonSchema } from "./schema";
import { mockJson } from "./mock";

export type JsonTask = {
  /** Stable task name; also selects the mock handler. */
  task: string;
  system: string;
  user: string;
  /** Structured context the offline mock uses instead of reading prose. */
  context?: unknown;
  fast?: boolean;
  temperature?: number;
};

export class LlmError extends Error {}

export async function llmJson<S extends z.ZodType>(schema: S, t: JsonTask): Promise<z.infer<S>> {
  if (env.llmProvider === "mock") return schema.parse(await mockJson(t.task, t.context, t.user));
  return groqJson(schema, t);
}

export function llmName(): string {
  return env.llmProvider === "mock" ? "offline mock (set GROQ_API_KEY for real AI)" : `Groq ${env.groqModel}`;
}

// ---------------------------------------------------------------------------
// Groq (OpenAI-compatible API)
// ---------------------------------------------------------------------------

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const STRICT_MODELS = new Set(["openai/gpt-oss-120b", "openai/gpt-oss-20b"]);

let nextSlot = 0;
/** Spaces requests to stay under the free-tier requests-per-minute limit. */
async function rateLimit() {
  const gap = 60_000 / env.groqRpm;
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + gap;
  if (wait) await sleep(wait);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function groqJson<S extends z.ZodType>(schema: S, t: JsonTask): Promise<z.infer<S>> {
  const primary = t.fast ? env.groqFastModel : env.groqModel;
  const attempts: { model: string; strict: boolean }[] = [
    { model: primary, strict: STRICT_MODELS.has(primary) },
    { model: primary, strict: false },
    { model: env.groqFallbackModel, strict: false },
  ];
  let lastErr: unknown;
  for (const a of attempts) {
    try {
      const raw = await groqCall(a.model, schema, t, a.strict);
      const parsed = schema.safeParse(raw);
      if (parsed.success) return parsed.data;
      lastErr = new LlmError(`Schema mismatch from ${a.model}: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    } catch (e) {
      lastErr = e;
      if (e instanceof LlmError && /401|invalid api key/i.test(e.message)) throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new LlmError(String(lastErr));
}

async function groqCall(model: string, schema: z.ZodType, t: JsonTask, strict: boolean): Promise<unknown> {
  const jsonSchema = toStrictJsonSchema(schema);
  const system = strict
    ? t.system
    : `${t.system}\n\nReply with a single JSON object only, matching this JSON Schema exactly:\n${JSON.stringify(jsonSchema)}`;
  const body: Record<string, unknown> = {
    model,
    temperature: t.temperature ?? 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: t.user },
    ],
    response_format: strict
      ? { type: "json_schema", json_schema: { name: t.task, strict: true, schema: jsonSchema } }
      : { type: "json_object" },
  };
  if (model.startsWith("openai/gpt-oss")) body.reasoning_effort = "low";

  for (let tries = 0; tries < 4; tries++) {
    await rateLimit();
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.groqApiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 30) * 1000 : 2000 * 2 ** tries);
      continue;
    }
    const json = (await res.json().catch(() => null)) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } } | null;
    if (!res.ok) throw new LlmError(`Groq ${res.status} (${model}): ${json?.error?.message ?? "request failed"}`);
    const content = json?.choices?.[0]?.message?.content ?? "";
    try {
      return JSON.parse(stripFences(content));
    } catch {
      throw new LlmError(`Groq returned non-JSON content (${model})`);
    }
  }
  throw new LlmError(`Groq rate limited (${model}) after retries`);
}

function stripFences(s: string): string {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (m ? m[1] : s).trim();
}
