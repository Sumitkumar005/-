// Voice provider abstraction. "simulated" runs entirely in-process; "bolna" places real calls
// through Bolna (Indian telephony, Hinglish voices) and reports back via webhook.

import { z } from "zod";
import type { Brief, Buyer, Supplier, Turn } from "@/lib/db/types";
import { env, requireEnv } from "@/lib/env";
import { llmJson } from "@/lib/llm/client";
import type { CallScript } from "@/lib/agents/call-script";
import { getCategory } from "@/lib/domain/categories";
import { simulateFacts, templateTranscript, type SimFacts } from "./simulate";

export type CallRequest = {
  interactionId: string;
  brief: Brief;
  buyer: Buyer;
  supplier: Supplier;
  attempt: number;
  script: CallScript;
};

export type CallStart =
  | { mode: "completed"; turns: Turn[]; durationS: number; groundTruth?: SimFacts; costInr: number }
  | { mode: "pending"; providerRef: string };

/** Approximate all-in cost per connected minute (telephony + STT + LLM + TTS). */
export const VOICE_COST_PER_MIN = 6;

export function voiceProviderName(): string {
  return env.voiceProvider;
}

export async function startCall(req: CallRequest): Promise<CallStart> {
  if (env.voiceProvider === "bolna") return startBolnaCall(req);
  return startSimulatedCall(req);
}

// ---------------------------------------------------------------------------
// Simulated
// ---------------------------------------------------------------------------

const TranscriptSchema = z.object({ turns: z.array(z.object({ speaker: z.enum(["agent", "supplier"]), text: z.string() })) });

async function startSimulatedCall(req: CallRequest): Promise<CallStart> {
  const facts = simulateFacts(req.brief, req.supplier, req.attempt);
  const unitWord = getCategory(req.brief.category).unit === "pieces" ? "piece" : getCategory(req.brief.category).unit.replace(/s$/, "");
  const template = templateTranscript(facts, req.script.opening, unitWord);
  let turns = template;

  // With a real model available, let it voice the same facts more naturally, but only keep it if
  // every number survived. Otherwise the ground truth would no longer match the transcript.
  if (env.llmProvider === "groq" && facts.outcome === "quoted") {
    try {
      const out = await llmJson(TranscriptSchema, {
        task: "simulate_call",
        fast: true,
        temperature: 0.7,
        system:
          "You write realistic Hinglish phone call transcripts between an AI sourcing agent and an Indian wholesaler. Keep it short (8 to 14 turns). Use every fact given, with the exact numbers, and add nothing that contradicts them. Do not add any prices or numbers beyond the facts.",
        user: `Opening line (agent, use as is): ${req.script.opening}\n\nFacts the supplier states:\n${template.filter((t) => t.speaker === "supplier").map((t) => `- ${t.text}`).join("\n")}`,
      });
      const text = out.turns.map((t) => t.text).join(" ");
      const required = [facts.unit_price, facts.moq, facts.lead_time_days, facts.setup_cost, facts.freight_amount].filter((n): n is number => n != null);
      if (required.every((n) => text.includes(String(n))) && out.turns.length >= 4) turns = out.turns;
    } catch {
      // Template transcript is a fine fallback.
    }
  }

  if (env.simCallDelayMs) await new Promise((r) => setTimeout(r, env.simCallDelayMs));
  return {
    mode: "completed",
    turns,
    durationS: facts.duration_s,
    groundTruth: facts,
    costInr: Math.round((facts.duration_s / 60) * VOICE_COST_PER_MIN * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Bolna (real calls)
// ---------------------------------------------------------------------------

async function startBolnaCall(req: CallRequest): Promise<CallStart> {
  const { apiKey, agentId, fromNumber } = env.bolna;
  if (req.supplier.is_demo) throw new Error("Refusing to place a real call to a demo supplier");
  if (req.supplier.do_not_call) throw new Error("Supplier has opted out of calls");
  if (!req.supplier.phone) throw new Error("Supplier has no phone number");

  const res = await fetch("https://api.bolna.ai/call", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${requireEnv(apiKey, "BOLNA_API_KEY")}` },
    body: JSON.stringify({
      agent_id: requireEnv(agentId, "BOLNA_AGENT_ID"),
      recipient_phone_number: req.supplier.phone,
      ...(fromNumber ? { from_phone_number: fromNumber } : {}),
      user_data: { ...req.script.variables, opening: req.script.opening, interaction_id: req.interactionId },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as { execution_id?: string; message?: string; retry_after_seconds?: number };
  if (!res.ok || !json.execution_id) {
    throw new Error(`Bolna call failed (${res.status}): ${json.message ?? "no execution id"}`);
  }
  return { mode: "pending", providerRef: json.execution_id };
}

/** Bolna transcripts arrive as "assistant: ...\nuser: ..." text. */
export function parseProviderTranscript(text: string | null | undefined): Turn[] {
  if (!text) return [];
  const turns: Turn[] = [];
  for (const line of text.split(/\n+/)) {
    const m = line.match(/^\s*(assistant|agent|bot|user|human|customer)\s*:\s*(.*)$/i);
    if (m) turns.push({ speaker: /assistant|agent|bot/i.test(m[1]) ? "agent" : "supplier", text: m[2].trim() });
    else if (turns.length && line.trim()) turns[turns.length - 1].text += ` ${line.trim()}`;
  }
  return turns.filter((t) => t.text);
}
