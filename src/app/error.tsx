"use client";

import { Button } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const setup = /Missing environment variable/.test(error.message);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="font-display text-3xl font-bold">{setup ? "Setup needed" : "Something went wrong"}</p>
      <p className="max-w-md text-muted">{setup ? error.message : "Please try again. If it keeps happening, the details are in the server log."}</p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        {setup ? <a className="font-semibold underline" href="/setup">Setup guide</a> : null}
      </div>
    </div>
  );
}
