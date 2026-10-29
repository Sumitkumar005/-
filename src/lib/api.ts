import { NextResponse } from "next/server";
import type { z } from "zod";
import { getSession, type Session } from "@/lib/auth";
import { TransitionError } from "@/lib/pipeline/repo";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });

/** Wraps a route handler with auth, JSON errors and no leaking of internals. */
export function route<C = unknown>(
  fn: (args: { req: Request; session: Session; ctx: C }) => Promise<Response>,
  opts: { ops?: boolean; buyer?: boolean } = {},
) {
  return async (req: Request, ctx: C) => {
    try {
      const session = await getSession();
      if (!session) throw new HttpError(401, "Please sign in");
      if (opts.ops && !session.isOps) throw new HttpError(403, "Ops access only");
      if (opts.buyer && !session.buyer) throw new HttpError(400, "Finish your business profile first");
      return await fn({ req, session, ctx });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof TransitionError) return NextResponse.json({ error: e.message }, { status: 409 });
      console.error(e);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export async function body<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const raw = await req.json().catch(() => {
    throw new HttpError(400, "Invalid JSON body");
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    throw new HttpError(400, `${i.path.join(".") || "body"}: ${i.message}`);
  }
  return parsed.data;
}
