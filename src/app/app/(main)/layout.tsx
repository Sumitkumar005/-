import { redirect } from "next/navigation";
import { requirePageSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { AppShell } from "@/components/app-shell";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePageSession();
  if (!session.buyer) redirect("/app/onboarding");
  const demo = [
    env.voiceProvider === "simulated" ? "supplier calls are simulated, nobody is actually dialled" : null,
    env.llmProvider === "mock" ? "AI runs in offline mode (add GROQ_API_KEY for the real model)" : null,
  ].filter(Boolean) as string[];
  return (
    <AppShell businessName={session.buyer.business_name} email={session.email} isOps={session.isOps} demoNotes={demo}>
      {children}
    </AppShell>
  );
}
