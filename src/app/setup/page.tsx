import { Logo } from "@/components/brand";
import { Card } from "@/components/ui";

export const metadata = { title: "Finish setup" };

export default function Setup() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <Logo />
      <Card className="mt-8 p-8">
        <h1 className="text-2xl font-bold">Connect Supabase to continue</h1>
        <p className="mt-2 text-muted">The app needs a database. It takes about five minutes on the Supabase free plan.</p>
        <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-ink-soft">
          <li>Create a project at supabase.com (free plan is fine).</li>
          <li>In SQL Editor, run <code className="rounded bg-paper px-1.5 py-0.5">supabase/migrations/20261029000001_init.sql</code>, then <code className="rounded bg-paper px-1.5 py-0.5">supabase/seed.sql</code>.</li>
          <li>Copy <code className="rounded bg-paper px-1.5 py-0.5">.env.example</code> to <code className="rounded bg-paper px-1.5 py-0.5">.env.local</code> and paste the project URL, anon key and service role key (Project Settings, API).</li>
          <li>Optional: add a free Groq API key for real AI. Without it, the app runs on a built-in offline mode.</li>
          <li>Restart <code className="rounded bg-paper px-1.5 py-0.5">npm run dev:all</code>.</li>
        </ol>
      </Card>
    </div>
  );
}
