import Link from "next/link";
import { cx } from "./ui";

/** Mark: a speech bubble carrying the rupee sign. Talk + price = bhav-taav. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cx("h-8 w-8", className)} aria-hidden>
      <path d="M6 3h20a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5H15l-6.2 5.2c-.7.6-1.8.1-1.8-.8V25H6a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Z" fill="#FFB21E" />
      <path d="M11 9.5h10M11 13h10M11 9.5h3.2a3.5 3.5 0 0 1 0 7H11l6.5 6" fill="none" stroke="#0A1628" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <Link href="/" className={cx("focus-ring inline-flex items-center gap-2 rounded-md", className)} aria-label="BhavTaav home">
      <LogoMark />
      <span className={cx("font-display text-[19px] font-bold tracking-tight", dark ? "text-white" : "text-ink")}>
        Bhav<span className="text-marigold">Taav</span>
      </span>
    </Link>
  );
}
