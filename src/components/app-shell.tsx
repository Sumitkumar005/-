"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, LayoutDashboard, LogOut, Plus, Store, Info } from "lucide-react";
import { Logo } from "./brand";
import { cx } from "./ui";

export function AppShell({ children, businessName, email, isOps, demoNotes }: { children: React.ReactNode; businessName: string; email: string | null; isOps: boolean; demoNotes: string[] }) {
  const path = usePathname();
  const nav = [
    { href: "/app", label: "Briefs", icon: LayoutDashboard, active: path === "/app" || (path.startsWith("/app/briefs") && path !== "/app/briefs/new") },
    { href: "/app/briefs/new", label: "New brief", icon: Plus, active: path === "/app/briefs/new" },
    ...(isOps
      ? [
          { href: "/app/suppliers", label: "Suppliers", icon: Store, active: path.startsWith("/app/suppliers") },
          { href: "/app/ops", label: "Ops desk", icon: Inbox, active: path.startsWith("/app/ops") },
        ]
      : []),
  ];
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <div className="bg-ink">
      <aside className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-ink px-4 py-3 lg:h-screen lg:flex-col lg:items-stretch lg:justify-start lg:border-b-0 lg:px-4 lg:py-6">
        <Logo dark className="lg:px-2" />
        <nav className="flex gap-1 lg:mt-10 lg:flex-col">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cx(
                "focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                n.active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
              )}
            >
              <n.icon className={cx("h-4 w-4", n.active && "text-marigold")} />
              <span className="hidden sm:inline">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="hidden lg:mt-auto lg:block">
          <div className="rounded-lg bg-white/5 px-3 py-3">
            <p className="truncate text-sm font-semibold text-white">{businessName}</p>
            <p className="truncate text-xs text-white/50">{email}</p>
            {isOps ? <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-marigold">Ops access</p> : null}
          </div>
          <form action="/auth/signout" method="post">
            <button className="focus-ring mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>
      </div>
      <div className="min-w-0">
        {demoNotes.length ? (
          <div className="flex items-center gap-2 border-b border-marigold/30 bg-marigold-soft px-5 py-2 text-xs text-[#6B4600]">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="font-semibold">Demo mode:</span> {demoNotes.join("; ")}.
            </span>
          </div>
        ) : null}
        <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
