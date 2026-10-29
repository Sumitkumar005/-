import { z } from "zod";
import { json, underLimit, visitorKey } from "@/lib/chat/server";
import { db } from "@/lib/db/admin";
import { normaliseIndianPhone } from "@/lib/domain/phone";

// Public endpoint: saves a lead from the landing-page chat.

const Schema = z.object({
  kind: z.enum(["quote", "callback"]),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20),
  need: z.string().trim().min(2).max(300),
  quantity: z.string().trim().max(80).optional().nullable(),
  city: z.string().trim().max(60).optional().nullable(),
  consent: z.literal(true),
  path: z.string().max(200).optional().nullable(),
  utm: z.record(z.string(), z.string().max(120)).optional(),
  transcript: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1000) })).max(40).optional(),
  // Honeypot: hidden from people, filled in by bots.
  website: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    if (i.path[0] === "consent") return json({ error: "Please tick the box so we can message you on WhatsApp." }, 400);
    if (i.path[0] === "website") return json({ ok: true }); // pretend success for bots
    return json({ error: "Please check your name and what you need." }, 400);
  }
  const b = parsed.data;
  const phone = normaliseIndianPhone(b.phone);
  if (!phone) return json({ error: "Enter a 10-digit Indian mobile number." }, 400);
  if (!(await underLimit(`lead:${visitorKey(req)}`, 5))) return json({ error: "We already have your details. We'll be in touch soon." }, 429);

  const utm = Object.fromEntries(Object.entries(b.utm ?? {}).filter(([k]) => /^utm_[a-z]+$/.test(k)).slice(0, 6));
  const { error } = await db()
    .from("leads")
    .insert({
      kind: b.kind,
      name: b.name,
      phone,
      need: b.need,
      quantity: b.quantity || null,
      city: b.city || null,
      consent_at: new Date().toISOString(),
      source_path: b.path ?? null,
      utm,
      transcript: b.transcript ?? [],
    });
  if (error) {
    console.error("lead insert:", error.message);
    return json({ error: "Couldn't save that just now. Please try again in a minute." }, 500);
  }
  return json({ ok: true });
}
