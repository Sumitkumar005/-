import { redirect } from "next/navigation";
import { requirePageSession } from "@/lib/auth";
import { STATES } from "@/lib/domain/geo";
import { Logo } from "@/components/brand";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Your business" };

export default async function Onboarding() {
  const session = await requirePageSession();
  if (session.buyer) redirect("/app");
  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-xl px-5 py-10">
        <Logo />
        <h1 className="mt-10 text-3xl font-bold">Tell us about your business</h1>
        <p className="mt-2 text-muted">Suppliers only ever hear the type of business and city, never your name or number, until you choose them.</p>
        <OnboardingForm states={STATES} defaultName={session.profile.full_name ?? ""} />
      </div>
    </div>
  );
}
