import { ButtonLink } from "@/components/ui";
import { Logo } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 text-center">
      <Logo />
      <div>
        <p className="font-display text-6xl font-bold">404</p>
        <p className="mt-2 text-muted">We couldn&apos;t find that page.</p>
      </div>
      <ButtonLink href="/app">Go to your briefs</ButtonLink>
    </div>
  );
}
