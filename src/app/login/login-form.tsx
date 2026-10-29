"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Alert, Button, Input, Label, Spinner, cx } from "@/components/ui";

export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error"));
  const [info, setInfo] = useState<string | null>(null);
  const next = params.get("next");
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const supabase = supabaseBrowser();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(dest);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/app` },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/app");
          router.refresh();
        } else setInfo("Check your email for a confirmation link, then sign in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">{mode === "signin" ? "Welcome back" : "Start sourcing"}</h1>
      <p className="mt-2 text-muted">{mode === "signin" ? "Sign in to see your briefs and shortlists." : "Your first sourcing brief is free."}</p>

      <div className="mt-8 grid grid-cols-2 rounded-lg bg-ink/5 p-1 text-sm font-medium">
        {(["signin", "signup"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={cx("focus-ring rounded-md py-2 transition", mode === m ? "bg-white shadow-card" : "text-muted")}>
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "signup" ? (
          <div>
            <Label htmlFor="name">Your name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </div>
        ) : null}
        <div>
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="password" hint={mode === "signup" ? "(8+ characters)" : undefined}>Password</Label>
          <Input id="password" type="password" minLength={mode === "signup" ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} required />
        </div>
        {error ? <Alert tone="bad">{error}</Alert> : null}
        {info ? <Alert tone="good">{info}</Alert> : null}
        <Button type="submit" variant="dark" size="lg" className="w-full" disabled={busy}>
          {busy ? <Spinner /> : null}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
