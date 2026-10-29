// Bolna posts call execution updates here. Configure the webhook URL in your Bolna agent as
// https://<your-app>/api/webhooks/voice/bolna?secret=<VOICE_WEBHOOK_SECRET>

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db/admin";
import { env } from "@/lib/env";
import { enqueue } from "@/lib/pipeline/repo";
import { parseProviderTranscript, VOICE_COST_PER_MIN } from "@/lib/voice/provider";

type Execution = {
  id?: string;
  execution_id?: string;
  status?: string;
  transcript?: string;
  conversation_duration?: number;
  total_cost?: number;
  telephony_data?: { recording_url?: string; duration?: number | string };
};

const FAILED = new Set(["failed", "error", "no-answer", "busy", "canceled", "cancelled", "balance-low"]);

function secretOk(given: string | null): boolean {
  const want = env.voiceWebhookSecret;
  if (!want || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!secretOk(new URL(req.url).searchParams.get("secret"))) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const ex = (await req.json().catch(() => null)) as Execution | null;
  const ref = ex?.id ?? ex?.execution_id;
  if (!ref) return NextResponse.json({ error: "missing execution id" }, { status: 400 });

  const { data: it } = await db().from("interactions").select("id, brief_id, supplier_id, status, outcome").eq("provider", "bolna").eq("provider_ref", ref).maybeSingle();
  if (!it) return NextResponse.json({ ok: true, ignored: "unknown execution" });
  if (it.outcome || it.status === "completed") return NextResponse.json({ ok: true, duplicate: true });

  const status = (ex?.status ?? "").toLowerCase();
  const { data: bs } = await db().from("brief_suppliers").select("id, call_attempts").eq("brief_id", it.brief_id).eq("supplier_id", it.supplier_id).maybeSingle();
  if (!bs) return NextResponse.json({ ok: true });

  if (status === "completed") {
    const duration = Number(ex?.conversation_duration ?? ex?.telephony_data?.duration ?? 0) || null;
    await db()
      .from("interactions")
      .update({
        status: "completed",
        transcript: parseProviderTranscript(ex?.transcript),
        duration_s: duration,
        recording_url: ex?.telephony_data?.recording_url ?? null,
        cost_inr: duration ? Math.round((duration / 60) * VOICE_COST_PER_MIN * 100) / 100 : null,
        ended_at: new Date().toISOString(),
      })
      .eq("id", it.id);
    await enqueue("extract", it.brief_id, { interactionId: it.id, briefSupplierId: bs.id, attempt: bs.call_attempts }, { dedupeKey: `extract:${it.id}` });
  } else if (FAILED.has(status)) {
    // Mark the call complete with no transcript; extraction treats it as no answer and schedules a retry.
    await db().from("interactions").update({ status: "completed", transcript: [], ended_at: new Date().toISOString(), summary: `Call ${status}` }).eq("id", it.id);
    await enqueue("extract", it.brief_id, { interactionId: it.id, briefSupplierId: bs.id, attempt: bs.call_attempts }, { dedupeKey: `extract:${it.id}` });
  }
  return NextResponse.json({ ok: true });
}
