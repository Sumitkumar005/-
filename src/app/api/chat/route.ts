import { z } from "zod";
import { chatReply, ChatUnavailable, json, underLimit, visitorKey } from "@/lib/chat/server";
import { env } from "@/lib/env";

// Public endpoint for the landing-page chat. No auth, so every request is size- and rate-limited.

const MAX_USER_TURNS = 10;

const Schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1000) }))
    .min(1)
    .max(MAX_USER_TURNS * 2),
});

const FALLBACK = "I can't answer that right now. Tap \"Talk to a person\" and leave your WhatsApp number. Someone from the team will reply.";

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid message" }, 400);
  const messages = parsed.data.messages;
  const last = messages[messages.length - 1];
  if (last.role !== "user" || last.content.length > 500) return json({ error: "Keep messages under 500 characters" }, 400);
  if (messages.filter((m) => m.role === "user").length > MAX_USER_TURNS) {
    return json({ reply: "We've covered a lot. The fastest way from here is a person: tap \"Get a quote\" or \"Talk to a person\".", limited: true });
  }

  if (!env.groqChatApiKey) return json({ reply: FALLBACK, fallback: true });
  if (!(await underLimit(`ip:${visitorKey(req)}`, env.chatPerIpDaily)) || !(await underLimit("global", env.chatGlobalDaily))) {
    return json({ reply: "You've reached today's chat limit. Tap \"Talk to a person\" and we'll reply on WhatsApp.", limited: true });
  }

  try {
    return json({ reply: await chatReply(messages) });
  } catch (e) {
    console.error("chat:", e instanceof ChatUnavailable ? e.message : e);
    return json({ reply: FALLBACK, fallback: true });
  }
}
