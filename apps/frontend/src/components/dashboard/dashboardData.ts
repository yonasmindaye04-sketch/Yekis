/**
 * Shared types for the workspace dashboard surfaces.
 *
 * This module deliberately holds no sample records. It used to ship a full
 * fixture set (demo wallets, demo milestones, a hard-coded cash-flow series
 * and a fake counterparty map) that the workspace fell back to, which is how
 * a brand-new account saw a populated ledger and charts describing somebody
 * else's business. Every number the dashboard shows now comes from the signed-in
 * account's own API data; the shapes below only describe it.
 */

export type TimeRangeKey = "7d" | "30d" | "90d" | "12m";

/**
 * The escrow states that mean money actually sits in the milestone escrow.
 * PAYMENT_PENDING has not been funded yet; REFUNDED has already gone back.
 */
export const FUNDED_ESCROW_STATES: ReadonlySet<string> = new Set([
  "ESCROW_HELD",
  "WORK_IN_PROGRESS",
  "SUBMITTED_FOR_REVIEW",
  "ACCEPTED",
  "RELEASED",
  "DISPUTED",
  "PARTIAL_REFUND",
]);

/**
 * The rail a movement actually travelled over.
 *
 * INTERNAL_WALLET is money that moved between the caller's own accounts
 * (wallet balance into escrow) and UNFUNDED is a milestone that has not been
 * funded yet. Neither is a payment rail, but both are states the ledger has to
 * be able to say out loud instead of guessing.
 */
export type PaymentRail =
  | "TELEBIRR"
  | "CBE_BIRR"
  | "M_PESA"
  | "CHAPA"
  | "INTERNAL_WALLET"
  | "UNFUNDED";

export const PAYMENT_RAIL_LABELS: Record<PaymentRail, string> = {
  TELEBIRR: "Telebirr",
  CBE_BIRR: "CBE Birr",
  M_PESA: "M-Pesa",
  CHAPA: "Chapa",
  INTERNAL_WALLET: "Wallet",
  UNFUNDED: "Not funded",
};

export function railLabel(rail: PaymentRail | null | undefined): string {
  if (!rail) return PAYMENT_RAIL_LABELS.UNFUNDED;
  return PAYMENT_RAIL_LABELS[rail] ?? rail;
}

export type KanbanColumnId =
  | "BACKLOG"
  | "ESCROW_HELD"
  | "WORK_IN_PROGRESS"
  | "SUBMITTED_FOR_REVIEW"
  | "RELEASED";

export interface KanbanTask {
  id: string;
  code: string;
  title: string;
  contractId?: string;
  contractTitle: string;
  counterparty: string;
  client: string;
  freelancer: string;
  rail: PaymentRail;
  amountMinor: number;
  platformFeeMinor: number;
  providerFeeMinor: number;
  clientFeeMinor: number;
  clientTotalChargeMinor: number;
  netPayoutMinor: number;
  dueDate: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  column: KanbanColumnId;
  category: string;
  escrowState?: string;
  contractFullyExecuted?: boolean;
  deliverableUrl?: string | null;
  submittedAt?: string | null;
  autoReleaseAt?: string | null;
  releasedAt?: string | null;
  fundedAt?: string | null;
}

export type ScheduleEventType =
  | "MILESTONE_DUE"
  | "PAYOUT_RELEASE"
  | "PROPOSAL_DEADLINE"
  | "COMPLIANCE_KYC";

export interface ScheduleEvent {
  id: string;
  milestoneId?: string;
  contractId?: string;
  title: string;
  contractRef: string;
  date: string; // YYYY-MM-DD
  time: string;
  type: ScheduleEventType;
  amountMinor: number;
  rail: PaymentRail | null;
  status: "SCHEDULED" | "COMPLETED" | "AT_RISK";
  counterparty: string;
}

export interface LedgerContractRecord {
  id: string;
  contractId?: string;
  code: string;
  title: string;
  contractTitle: string;
  counterparty: string;
  counterpartyEmail: string;
  category: string;
  rail: PaymentRail;
  escrowState:
    | "PAYMENT_PENDING"
    | "ESCROW_HELD"
    | "WORK_IN_PROGRESS"
    | "SUBMITTED_FOR_REVIEW"
    | "ACCEPTED"
    | "RELEASED"
    | "DISPUTED"
    | "REFUNDED"
    | "PARTIAL_REFUND";
  amountMinor: number;
  platformFeeMinor: number;
  providerFeeMinor: number;
  clientFeeMinor: number;
  clientTotalChargeMinor: number;
  netPayoutMinor: number;
  dueDate: string;
  updatedAt: string;
  contractFullyExecuted?: boolean;
}

/**
 * One bucket of the workspace cash-flow / settlement charts.
 *
 * Every field is ETB except `milestonesCompleted`, which counts the
 * milestones settled inside the bucket. The values come from the caller's own
 * milestones and wallet top-ups; buckets with no activity stay at zero instead
 * of being filled with a plausible-looking curve.
 */
export interface TimeSeriesPoint {
  label: string;
  escrowInflowETB: number;
  payoutReleasedETB: number;
  telebirrETB: number;
  cbeBirrETB: number;
  mpesaETB: number;
  milestonesCompleted: number;
}
