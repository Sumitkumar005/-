import { Suspense } from "react";
import { Logo } from "@/components/brand";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="grid-bg absolute inset-0 opacity-60" />
        <div className="absolute -right-24 top-10 h-96 w-96 rounded-full bg-marigold/25 blur-3xl" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <p className="font-display text-4xl font-bold leading-tight">“Tell us what you buy every month. We'll tell you what it should cost.”</p>
          <p className="mt-4 text-white/60">Calls, GST checks, landed-cost comparison and negotiation. You talk only to the best three.</p>
        </div>
      </div>
    </div>
  );
}
