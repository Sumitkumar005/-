import { redirect } from "next/navigation";
import { db } from "@/lib/db/admin";
import type { Buyer, Profile } from "@/lib/db/types";
import { supabaseServer } from "@/lib/supabase/server";

export type Session = { userId: string; email: string | null; profile: Profile; buyer: Buyer | null; isOps: boolean };

/** Verified user (checked against Supabase Auth), plus profile and buyer. Null when signed out. */
export async function getSession(): Promise<Session | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const [{ data: profile }, { data: buyer }] = await Promise.all([
    db().from("profiles").select("*").eq("id", user.id).maybeSingle(),
    db().from("buyers").select("*").eq("owner_id", user.id).maybeSingle(),
  ]);
  // Profile is created by a trigger; create it here if the trigger was skipped.
  const p = (profile as Profile | null) ?? ((await db().from("profiles").upsert({ id: user.id }).select("*").single()).data as Profile);
  return { userId: user.id, email: user.email ?? null, profile: p, buyer: buyer as Buyer | null, isOps: p.role === "ops" || p.role === "admin" };
}

export async function requirePageSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}
