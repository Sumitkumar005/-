import { Suspense } from "react";
import { LockKey, SealCheck, Translate } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand";
import { HeroDemo } from "@/components/landing/hero-demo";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Form side */}
      <div className="flex flex-col px-6 py-7 sm:px-10 lg:px-16">
        <Logo />
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="text-center text-[12px] text-muted lg:text-left">Your first sourcing brief is free. No card needed.</p>
      </div>

      {/* Brand side */}
      <div className="relative hidden overflow-hidden bg-ink text-white lg:flex lg:flex-col">
        <div className="grid-bg absolute inset-0 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]" />
        <div className="absolute -right-24 -top-24 h-[480px] w-[480px] rounded-full bg-marigold/[0.18] blur-[120px]" />
        <div className="absolute -bottom-32 -left-24 h-[420px] w-[420px] rounded-full bg-[#14B8A6]/[0.12] blur-[120px]" />

        <div className="relative flex flex-1 flex-col justify-center px-12 py-14 xl:px-20">
          <p lang="hi" className="font-hindi text-[28px] font-semibold leading-tight xl:text-[34px]">
            भाव-ताव हम करेंगे,
            <br />
            <span className="text-marigold">आप बस चुनिए।</span>
          </p>
          <p className="mt-3 max-w-[460px] text-[15px] leading-relaxed text-white/60">
            We call the suppliers, check their GST, compare every quote at your door and negotiate. You pick from the best three.
          </p>
          <div className="mt-10 max-w-[480px]">
            <HeroDemo />
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4 border-t border-white/[0.07] px-12 py-6 text-[13px] text-white/65 xl:px-20">
          {[
            [Translate, "Calls in Hindi and English"],
            [SealCheck, "GSTIN checked on every supplier"],
            [LockKey, "Your number stays private"],
          ].map(([Icon, t], i) => {
            const I = Icon as typeof LockKey;
            return (
              <p key={i} className="flex items-center gap-2">
                <I weight="duotone" className="h-[18px] w-[18px] shrink-0 text-marigold" />
                {t as string}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
