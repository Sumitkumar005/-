import { STATUS_LABEL, isActive, type BriefStatus } from "@/lib/domain/brief-state";
import { BAND_LABEL, type TrustBand } from "@/lib/domain/trust";
import { Badge } from "./ui";

export function BriefStatusBadge({ status }: { status: BriefStatus }) {
  const tone =
    status === "shortlist_ready" || status === "completed" || status === "supplier_selected"
      ? "good"
      : status === "needs_attention"
        ? "bad"
        : status === "cancelled" || status === "draft"
          ? "neutral"
          : "warn";
  return (
    <Badge tone={tone} dot={isActive(status)}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function TrustBadge({ band, score }: { band: TrustBand | null; score?: number | null }) {
  if (!band) return <Badge>Not vetted</Badge>;
  const tone = band === "trusted" ? "good" : band === "check" ? "warn" : "bad";
  return (
    <Badge tone={tone}>
      {BAND_LABEL[band]}
      {score != null && band !== "blocked" ? <span className="tabular font-semibold">{score}</span> : null}
    </Badge>
  );
}
