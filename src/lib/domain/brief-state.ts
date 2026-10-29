export type BriefStatus =
  | "draft" | "confirmed" | "scouting" | "vetting" | "calling" | "comparing" | "negotiating"
  | "in_review" | "shortlist_ready" | "supplier_selected" | "completed" | "cancelled" | "needs_attention";

export const STATUS_LABEL: Record<BriefStatus, string> = {
  draft: "Draft",
  confirmed: "Starting",
  scouting: "Finding suppliers",
  vetting: "Checking suppliers",
  calling: "Calling suppliers",
  comparing: "Comparing quotes",
  negotiating: "Negotiating",
  in_review: "Final check",
  shortlist_ready: "Shortlist ready",
  supplier_selected: "Supplier chosen",
  completed: "Completed",
  cancelled: "Cancelled",
  needs_attention: "Needs attention",
};

/** Ordered pipeline stages shown in the progress bar. */
export const PIPELINE: BriefStatus[] = ["scouting", "vetting", "calling", "comparing", "negotiating", "shortlist_ready"];

const ACTIVE: BriefStatus[] = ["confirmed", "scouting", "vetting", "calling", "comparing", "negotiating", "in_review"];
export const isActive = (s: BriefStatus) => ACTIVE.includes(s);

const NEXT: Record<BriefStatus, BriefStatus[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["scouting", "cancelled", "needs_attention"],
  scouting: ["vetting", "comparing", "cancelled", "needs_attention"],
  vetting: ["calling", "comparing", "cancelled", "needs_attention"],
  calling: ["comparing", "cancelled", "needs_attention"],
  comparing: ["negotiating", "in_review", "shortlist_ready", "cancelled", "needs_attention"],
  negotiating: ["comparing", "in_review", "shortlist_ready", "cancelled", "needs_attention"],
  in_review: ["shortlist_ready", "comparing", "cancelled", "needs_attention"],
  shortlist_ready: ["supplier_selected", "comparing", "cancelled", "confirmed"],
  supplier_selected: ["completed", "supplier_selected", "cancelled"],
  completed: [],
  cancelled: [],
  needs_attention: ["confirmed", "comparing", "cancelled"],
};

export function canTransition(from: BriefStatus, to: BriefStatus): boolean {
  return NEXT[from]?.includes(to) ?? false;
}
