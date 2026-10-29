import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const cx = clsx;

type ButtonVariant = "primary" | "dark" | "outline" | "ghost" | "danger";
const BTN: Record<ButtonVariant, string> = {
  primary: "bg-marigold text-ink hover:bg-marigold-deep hover:text-white shadow-sm",
  dark: "bg-ink text-white hover:bg-ink-3",
  outline: "border border-line bg-white text-ink hover:border-ink/30 hover:bg-paper",
  ghost: "text-ink hover:bg-ink/5",
  danger: "border border-coral/30 bg-white text-coral hover:bg-coral-soft",
};
const SIZE = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };

export function Button({ variant = "dark", size = "md", className, ...p }: ComponentProps<"button"> & { variant?: ButtonVariant; size?: keyof typeof SIZE }) {
  return (
    <button
      className={cx("focus-ring inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50", BTN[variant], SIZE[size], className)}
      {...p}
    />
  );
}

export function ButtonLink({ variant = "dark", size = "md", className, ...p }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: keyof typeof SIZE }) {
  return <Link className={cx("focus-ring inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition", BTN[variant], SIZE[size], className)} {...p} />;
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={cx("rounded-xl border border-line bg-white shadow-card", className)} {...p} />;
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex items-start justify-between gap-4 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "info" | "dark" | "gold";
const TONE: Record<Tone, string> = {
  neutral: "bg-ink/5 text-ink-soft",
  good: "bg-mint-soft text-mint-deep",
  warn: "bg-marigold-soft text-[#8A5A00]",
  bad: "bg-coral-soft text-coral",
  info: "bg-sky-soft text-sky",
  dark: "bg-ink text-white",
  gold: "bg-marigold text-ink",
};

export function Badge({ tone = "neutral", className, children, dot }: { tone?: Tone; className?: string; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", TONE[tone], className)}>
      {dot ? <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export function Label({ children, hint, htmlFor }: { children: ReactNode; hint?: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
      {children}
      {hint ? <span className="ml-1 font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

const field = "focus-ring w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-muted/70 transition hover:border-ink/25";

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input className={cx(field, "h-10", className)} {...p} />;
}

export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea className={cx(field, "py-2.5 leading-relaxed", className)} {...p} />;
}

export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select className={cx(field, "h-10 pr-8", className)} {...p} />;
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "default" }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={cx("tabular mt-2 font-display text-3xl font-semibold", tone === "good" ? "text-mint-deep" : "text-ink")}>{value}</p>
      {sub ? <p className="mt-1 text-sm text-muted">{sub}</p> : null}
    </Card>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white px-6 py-14 text-center">
      {icon ? <div className="mb-3 text-muted">{icon}</div> : null}
      <p className="font-semibold text-ink">{title}</p>
      {body ? <p className="mt-1 max-w-md text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)} aria-hidden />;
}

export function Alert({ tone = "warn", title, children }: { tone?: "warn" | "bad" | "info" | "good"; title?: ReactNode; children?: ReactNode }) {
  const map = { warn: "border-marigold/40 bg-marigold-soft", bad: "border-coral/30 bg-coral-soft", info: "border-sky/30 bg-sky-soft", good: "border-mint/30 bg-mint-soft" };
  return (
    <div className={cx("rounded-xl border px-4 py-3 text-sm text-ink", map[tone])}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={cx(title && "mt-0.5", "text-ink-soft")}>{children}</div> : null}
    </div>
  );
}
