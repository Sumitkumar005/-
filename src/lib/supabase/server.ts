import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, requireEnv } from "@/lib/env";

/** Per-request Supabase client bound to the user's auth cookies. */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(requireEnv(env.supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"), requireEnv(env.supabaseAnonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component: the proxy refreshes cookies instead.
        }
      },
    },
  });
}
