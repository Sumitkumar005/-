import Link from "next/link";
import { cx } from "./ui";

/** Wordmark: a rupee-tag mark and the name. */
export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <Link href="/" className={cx("focus-ring inline-flex items-center gap-2 rounded-md", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-marigold font-display text-lg font-extrabold text-ink">₹</span>
      <span className={cx("font-display text-lg font-bold tracking-tight", dark ? "text-white" : "text-ink")}>
        Bhav<span className="text-marigold-deep">Taav</span>
      </span>
    </Link>
  );
}
