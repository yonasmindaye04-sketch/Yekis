/* ────────────────────────────────────────────────────────────────────────
   opsConst.ts — shared option lists for console filters.

   These mirror the Prisma enums the backend actually accepts. Several are
   easy to get wrong: `/admin/escrows` rejects "PENDING" (it wants a real
   EscrowState such as PAYMENT_PENDING), and M_PESA is a supported rail even
   though the console charts group it with CBE Birr.
   ──────────────────────────────────────────────────────────────────────── */

import type { PrismaEscrowState, PrismaProvider } from "./opsBackend";

/** Payment rails the platform supports. */
export const RAILS: readonly PrismaProvider[] = ["TELEBIRR", "CBE_BIRR", "M_PESA"];

/** PaymentTransaction.status is a free-form string server-side. */
export const PAYMENT_STATUSES = ["PENDING", "SUCCESS", "FAILED"] as const;

/** PayoutTransaction.status. */
export const PAYOUT_STATUSES = [
  "PENDING",
  "PROCESSING",
  "CONFIRMED",
  "FAILED",
  "REVERSED",
] as const;

/** The real Milestone/EscrowState values — "PENDING" is NOT one of them. */
export const ESCROW_STATES: readonly PrismaEscrowState[] = [
  "PAYMENT_PENDING",
  "ESCROW_HELD",
  "WORK_IN_PROGRESS",
  "SUBMITTED_FOR_REVIEW",
  "ACCEPTED",
  "RELEASED",
  "DISPUTED",
  "REFUNDED",
  "PARTIAL_REFUND",
];

/** Escrow states that count as "currently held" funds. */
export const HELD_STATES: readonly PrismaEscrowState[] = [
  "ESCROW_HELD",
  "WORK_IN_PROGRESS",
  "SUBMITTED_FOR_REVIEW",
];

/** Escrow states that represent money returned to the client. */
export const REFUND_STATES: readonly PrismaEscrowState[] = ["REFUNDED", "PARTIAL_REFUND"];

/** Reconciliation outcome derived server-side per transaction. */
export const RECON_STATUSES = ["MATCHED", "MISMATCH", "PENDING", "FAILED"] as const;

/** ContractStatus. */
export const CONTRACT_STATUSES = ["ACTIVE", "COMPLETED", "TERMINATED", "CANCELLED"] as const;

/** Platform user roles. */
export const USER_ROLES = ["CLIENT", "FREELANCER", "BOTH"] as const;

/** KycStatus. */
export const KYC_STATUSES = ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED"] as const;

/** DisputeStage. */
export const DISPUTE_STAGES = [
  "NONE",
  "STAGE_1_NEGOTIATION",
  "STAGE_2_EVIDENCE",
  "STAGE_3_MEDIATION",
  "STAGE_4_ARBITRATION",
  "RESOLVED",
] as const;

/** TransactionFlagType — the TMS rule that raised a flag. */
export const FLAG_TYPES = [
  "STRUCTURING",
  "VELOCITY",
  "ROUND_AMOUNTS",
  "PASS_THROUGH",
  "WALLET_MISMATCH",
  "STAFF_FLAGGED",
  "VAT_THRESHOLD_REACHED",
] as const;

/** TransactionFlagStatus. */
export const FLAG_STATUSES = ["PENDING_REVIEW", "STR_FILED", "DISMISSED"] as const;

/** WalletTopUp status values the review queue can be filtered by. */
export const TOPUP_STATUSES = [
  "PENDING",
  "CHECKOUT_PENDING",
  "APPROVED",
  "REJECTED",
  "FLAGGED",
] as const;

/** LedgerJournal.referenceType values worth filtering on. */
export const JOURNAL_TYPES = [
  "WALLET_TOPUP",
  "ESCROW_FUND",
  "MILESTONE_RELEASE",
  "DISPUTE_REFUND",
  "WITHDRAWAL_PAYOUT",
] as const;

/** Staff roles that can be assigned via POST /admin/staff/:userId/role. */
export const STAFF_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "OPERATIONS_ADMIN",
  "FINANCE_ADMIN",
  "DISPUTE_MEDIATOR",
  "COMPLIANCE_ADMIN",
  "COMPLIANCE_OFFICER",
  "SUPPORT",
] as const;

/** Label for an "ALL" option paired with a value list. */
export const allOf = (values: readonly string[], label: string) =>
  [{ v: "ALL", l: label }, ...values.map((v) => ({ v, l: v.replace(/_/g, " ") }))];