// === INTERFACES & TYPES ===
export type StatusType =
  | "PENDING"
  | "PENDING_REVIEW"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "VERIFIED"
  | "REJECTED"
  | "DISMISSED"
  | "STR_FILED"
  | "OPEN"
  | "CLOSED"
  | "STAGE_1_NEGOTIATION"
  | "STAGE_2_EVIDENCE"
  | "STAGE_3_MEDIATION"
  | "STAGE_4_ARBITRATION"
  | "RESOLVED"
  | string;

// === MAIN COMPONENT ===
export function StatusBadge({
  status,
  className = "",
}: {
  status: StatusType;
  className?: string;
}) {
  let badgeClass = "status-pill";
  let label = status.replace(/_/g, " ");

  const s = status.toUpperCase();
  if (["APPROVED", "VERIFIED", "RESOLVED", "CLOSED", "DISMISSED"].includes(s)) {
    badgeClass += " success";
  } else if (["REJECTED", "STR_FILED", "STAGE_4_ARBITRATION"].includes(s)) {
    badgeClass += " error";
  } else if (
    [
      "PENDING",
      "PENDING_REVIEW",
      "UNDER_REVIEW",
      "OPEN",
      "STAGE_3_MEDIATION",
    ].includes(s)
  ) {
    badgeClass += " warning";
  }

  return <span className={`${badgeClass} ${className}`.trim()}>{label}</span>;
}
