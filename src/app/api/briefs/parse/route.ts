import { z } from "zod";
import { body, ok, route } from "@/lib/api";
import { createBriefFromText } from "@/lib/briefs/service";

export const POST = route(async ({ req, session }) => {
  const { text } = await body(req, z.object({ text: z.string().max(4000) }));
  const brief = await createBriefFromText(session, text);
  return ok({ id: brief.id }, 201);
}, { buyer: true });
