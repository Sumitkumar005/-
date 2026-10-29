import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, requireEnv } from "@/lib/env";

let client: SupabaseClient | null = null;

/** Service-role client. Server and worker only: it bypasses RLS, so callers must check ownership. */
export function db(): SupabaseClient {
  if (typeof window !== "undefined") throw new Error("db() must not run in the browser");
  if (!client) {
    client = createClient(
      requireEnv(env.supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv(env.supabaseServiceKey, "SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}

/** Unwraps a Supabase response, throwing with context on error. */
export function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}
