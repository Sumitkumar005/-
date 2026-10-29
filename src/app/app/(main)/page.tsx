import Link from "next/link";
import { ArrowRight, FileText, Plus } from "lucide-react";
import { requirePageSession } from "@/lib/auth";
import { db } from "@/lib/db/admin";
import type { Brief } from "@/lib/db/types";
import { describeSpec, getCategory } from "@/lib/domain/categories";
import { isActive } from "@/lib/domain/brief-state";
import { formatDate, formatINR, formatNumber, timeAgo } from "@/lib/format";
import { BriefStatusBadge } from "@/components/status";
import { ButtonLink, Card, EmptyState, Stat } from "@/components/ui";

export const metadata = { title: "Briefs" };
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await requirePageSession();
  const { data } = await db().from("briefs").select("*").eq("owner_id", session.userId).order("created_at", { ascending: false }).limit(200);
  const briefs = (data ?? []) as Brief[];

  const active = briefs.filter((b) => isActive(b.status)).length;
  const ready = briefs.filter((b) => b.status === "shortlist_ready").length;
  const saved = briefs.reduce((s, b) => s + (b.summary.savings_total ?? 0), 0);
  const called = briefs.reduce((s, b) => s + (b.summary.called ?? 0), 0);

  return (
    <div className="animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Namaste{session.profile.full_name ? `, ${session.profile.full_name.split(" ")[0]}` : ""}</p>
          <h1 className="mt-1 text-3xl font-bold">Your sourcing briefs</h1>
        </div>
        <ButtonLink href="/app/briefs/new" variant="primary">
          <Plus className="h-4 w-4" /> New brief
        </ButtonLink>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="In progress" value={active} sub="briefs being sourced" />
        <Stat label="Shortlists ready" value={ready} sub="waiting for your pick" />
        <Stat label="Suppliers called" value={formatNumber(called)} sub="calls you didn't have to make" />
        <Stat label="Estimated savings" value={formatINR(saved)} sub="per order, across briefs" tone="good" />
      </div>

      <div className="mt-10">
        {briefs.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No briefs yet"
            body="Tell us what you need, for example: 5,000 printed 250 ml paper cups every month, delivered to Gurugram."
            action={<ButtonLink href="/app/briefs/new" variant="primary">Start your first brief</ButtonLink>}
          />
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {briefs.map((b) => (
                <li key={b.id}>
                  <Link href={`/app/briefs/${b.id}`} className="focus-ring group grid gap-3 px-5 py-4 transition hover:bg-paper sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-8">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{b.title}</p>
                        <BriefStatusBadge status={b.status} />
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {getCategory(b.category).label}
                        {describeSpec(b.category, b.spec) ? ` · ${describeSpec(b.category, b.spec)}` : ""}
                        {b.quantity ? ` · ${formatNumber(b.quantity)} ${b.unit}` : ""}
                      </p>
                    </div>
                    <div className="text-sm sm:text-right">
                      {b.summary.best_landed != null ? (
                        <>
                          <p className="tabular font-display text-lg font-semibold"><span className="landed">{formatINR(b.summary.best_landed, { unit: true })}</span></p>
                          <p className="text-xs text-muted">best landed / {b.unit === "pieces" ? "piece" : b.unit.replace(/s$/, "")}</p>
                        </>
                      ) : (
                        <p className="text-muted">{b.summary.quotes ? `${b.summary.quotes} quotes` : "No quotes yet"}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted">
                      <span className="hidden md:inline">{b.status === "draft" ? `Created ${timeAgo(b.created_at)}` : `Updated ${timeAgo(b.updated_at)}`}</span>
                      <span className="md:hidden">{formatDate(b.created_at)}</span>
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
