"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Logo } from "@/components/brand";
import { Alert, Button, Input, Label, Spinner } from "@/components/ui";

export default function UpdatePassword() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser().auth.getUser().then(({ data }) => setReady(Boolean(data.user)));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    router.replace("/app");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-5">
      <Logo />
      <div className="mt-8 w-full max-w-[400px] rounded-2xl border border-line bg-white p-7 shadow-card">
        <h1 className="text-2xl font-bold">Choose a new password</h1>
        {ready === false ? (
          <div className="mt-4 space-y-3">
            <Alert tone="warn">This reset link has expired or was already used.</Alert>
            <a href="/login" className="text-sm font-semibold text-marigold-deep hover:underline">Request a new link</a>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="p1" hint="(8 or more characters)">New password</Label>
              <Input id="p1" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div>
              <Label htmlFor="p2">Type it again</Label>
              <Input id="p2" type="password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
            {error ? <Alert tone="bad">{error}</Alert> : null}
            <Button type="submit" size="lg" className="w-full" disabled={busy || ready === null}>
              {busy ? <Spinner /> : null} Save and continue
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
