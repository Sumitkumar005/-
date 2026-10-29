"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Envelope, Eye, EyeSlash, LockKey, MagicWand, User } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Alert, Button, Spinner, cx } from "@/components/ui";

type Mode = "signin" | "signup" | "reset";

export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<"main" | "link" | null>(null);
  const [error, setError] = useState<string | null>(params.get("error"));
  const [info, setInfo] = useState<string | null>(null);
  const next = params.get("next");
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  async function run(kind: "main" | "link", fn: () => Promise<void>) {
    setBusy(kind);
    setError(null);
    setInfo(null);
    try {
      await fn();
    } catch (err) {
      setError(friendly(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(null);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run("main", async () => {
      const supabase = supabaseBrowser();
      const origin = window.location.origin;
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(dest);
        router.refresh();
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: `${origin}/auth/callback?next=/app` },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/app");
          router.refresh();
        } else setInfo(`We sent a confirmation link to ${email}. Open it to finish signing up.`);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/auth/update-password` });
        if (error) throw error;
        setInfo(`If ${email} has an account, a reset link is on its way.`);
      }
    });
  }

  function magicLink() {
    if (!email) return setError("Enter your email first, then we'll send the link.");
    run("link", async () => {
      const { error } = await supabaseBrowser().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(dest)}`, shouldCreateUser: mode === "signup" },
      });
      if (error) throw error;
      setInfo(`Sign-in link sent to ${email}. It works once and expires in an hour.`);
    });
  }

  const title = mode === "signin" ? "Welcome back" : mode === "signup" ? "Start sourcing" : "Reset your password";
  const subtitle =
    mode === "signin" ? "Sign in to see your briefs and shortlists." : mode === "signup" ? "Create your account. Your first brief is on us." : "Enter your email and we'll send you a reset link.";

  return (
    <div className="animate-rise">
      <h1 className="text-[32px] font-bold leading-tight">{title}</h1>
      <p className="mt-2 text-[15px] text-muted">{subtitle}</p>

      {mode !== "reset" ? (
        <div className="relative mt-8 grid grid-cols-2 rounded-xl bg-paper p-1 text-sm font-semibold ring-1 ring-line">
          <span className={cx("absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-card transition-transform duration-300", mode === "signup" ? "translate-x-[calc(100%+0px)] left-1" : "left-1")} />
          {(["signin", "signup"] as const).map((m) => (
            <button key={m} type="button" onClick={() => switchMode(m)} className={cx("focus-ring relative z-10 rounded-lg py-2.5 transition-colors", mode === m ? "text-ink" : "text-muted hover:text-ink")}>
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "signup" ? (
          <Field id="name" label="Your name" icon={<User className="h-[18px] w-[18px]" />}>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required placeholder="Sumit Kumar" className={inputCls} />
          </Field>
        ) : null}

        <Field id="email" label="Work email" icon={<Envelope className="h-[18px] w-[18px]" />}>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value.trim())} autoComplete="email" required placeholder="you@business.in" className={inputCls} />
        </Field>

        {mode !== "reset" ? (
          <Field
            id="password"
            label="Password"
            icon={<LockKey className="h-[18px] w-[18px]" />}
            aside={
              mode === "signin" ? (
                <button type="button" onClick={() => switchMode("reset")} className="text-[13px] font-medium text-marigold-deep hover:underline">
                  Forgot password?
                </button>
              ) : (
                <span className="text-[12px] text-muted">8 or more characters</span>
              )
            }
          >
            <input
              id="password"
              type={show ? "text" : "password"}
              minLength={mode === "signup" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              className={cx(inputCls, "pr-11")}
            />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="focus-ring absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-ink">
              {show ? <EyeSlash className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </Field>
        ) : null}

        {error ? <Alert tone="bad">{error}</Alert> : null}
        {info ? <Alert tone="good">{info}</Alert> : null}

        <Button type="submit" variant="dark" size="lg" className="w-full" disabled={!!busy}>
          {busy === "main" ? <Spinner /> : null}
          {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          {busy !== "main" ? <ArrowRight weight="bold" className="h-4 w-4" /> : null}
        </Button>
      </form>

      {mode !== "reset" ? (
        <>
          <div className="my-6 flex items-center gap-3 text-[12px] text-muted">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          <Button type="button" variant="outline" size="lg" className="w-full" disabled={!!busy} onClick={magicLink}>
            {busy === "link" ? <Spinner /> : <MagicWand className="h-[18px] w-[18px] text-marigold-deep" />} Email me a sign-in link
          </Button>
        </>
      ) : (
        <button type="button" onClick={() => switchMode("signin")} className="mt-6 text-sm font-medium text-muted hover:text-ink">
          ← Back to sign in
        </button>
      )}
    </div>
  );
}

const inputCls = "focus-ring h-12 w-full rounded-xl border border-line bg-white pl-11 pr-3 text-[15px] text-ink placeholder:text-muted/60 transition hover:border-ink/25 focus:border-ink/40";

function Field({ id, label, icon, aside, children }: { id: string; label: string; icon: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
        {aside}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">{icon}</span>
        {children}
      </div>
    </div>
  );
}

/** Supabase error messages, said plainly. */
function friendly(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "That email and password don't match. Try again, or use a sign-in link.";
  if (/email not confirmed/i.test(msg)) return "Please confirm your email first. Check your inbox for the link.";
  if (/user already registered/i.test(msg)) return "You already have an account. Sign in instead.";
  if (/rate limit|too many/i.test(msg)) return "Too many attempts. Wait a minute and try again.";
  if (/signups not allowed|otp_disabled/i.test(msg)) return "No account found for that email. Create an account first.";
  if (/fetch|network/i.test(msg)) return "Can't reach the server. Check your connection, or that Supabase is configured.";
  return msg;
}
