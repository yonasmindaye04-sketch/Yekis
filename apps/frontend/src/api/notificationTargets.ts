/* ───────────────────────────────────────────��────────────────────────────
   notificationTargets.ts — where a notification came from, and where the
   reader should land when they click it.

   The console bell and the client bell show the same records (both call
   GET /api/v1/notifications), but they navigate differently: staff jump to
   an Operations Console page, clients jump to a workspace view. This module
   owns that decision so both bells agree, and so adding a new event type is
   a one-line change in one place instead of two.

   Event types are the BullMQ job names passed to notificationQueue.add(...).
   Entity ids arrive in `metadata` (see notification.worker.ts, which spreads
   everything after `message` into the stored record). Both are verified
   against the real call sites in the backend.

   `page` is deliberately a plain string: it may name either a console
   OpsPageId or a client workspace view. Each caller validates before
   navigating — the console checks `perms.can(page)` so a reviewer is never
   sent to a page their role cannot open, and the client checks the view is
   one it renders. Unmapped types return null and the row stays inert rather
   than guessing.
   ──────────────────────────────────────────────────────────────────────── */

import type { NotificationItem } from "./client";

export interface NotificationTarget {
  /** Console OpsPageId or client workspace view. */
  page: string;
  /** Record to select once the page opens, when the page supports it. */
  focusId?: string;
}

/** Client workspace views this module may route to (see FullPlatformApp's View). */
type AppView =
  | "overview"
  | "jobs"
  | "gigs"
  | "contracts"
  | "wallet"
  | "chat"
  | "verification"
  | "cases";

/** Console OpsPageId (see pages/ops/opsNav.ts). */
type OpsPageId =
  | "overview"
  | "support"
  | "dispute-queue"
  | "risk"
  | "kyc"
  | "reports-queue"
  | "receipts"
  | "ledger"
  | "reconciliation"
  | "reports"
  | "contracts"
  | "payments"
  | "escrow"
  | "payouts"
  | "users"
  | "staff"
  | "audit"
  | "monitoring"
  | "profile";

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

/**
 * Client-facing events. These are delivered straight to the user the event
 * happened to (escrow.service, dispute.service, topup.service, gig.service,
 * proposals.service, contracts.service, payoutAdmin.service, chat.service,
 * kycRefresh.worker).
 */
const APP_TARGETS: Record<string, AppView> = {
  "escrow-funded": "wallet",
  "escrow-released": "wallet",
  "auto-release-warning": "contracts",
  "milestone-submitted": "contracts",
  "contract-executed": "contracts",
  "topup-approved": "wallet",
  "topup-rejected": "wallet",
  "topup-failed": "wallet",
  "topup-success": "wallet",
  "payout-completed": "wallet",
  "payout-failed": "wallet",
  "dispute-raised": "cases",
  "dispute-resolved": "cases",
  "dispute-mutual-withdrawal-proposed": "cases",
  "dispute-mutual-withdrawal-confirmed": "cases",
  "proposal-received": "jobs",
  "proposal-accepted": "jobs",
  "proposal-rejected": "jobs",
  "gig-order-funded": "gigs",
  "gig-delivery-submitted": "gigs",
  "gig-revision-requested": "gigs",
  "gig-order-completed": "gigs",
  "new-message": "chat",
  "kyc-periodic-review-due": "verification",
};

/**
 * Staff-facing events, fanned out to every staff account by
 * notifyStaffOfEvent (lib/staffAlerts.ts). These are the ones that land in
 * the console bell and belong on a queue, not in a personal workspace.
 */
const OPS_TARGETS: Record<string, OpsPageId> = {
  SUPPORT_REQUEST_CREATED: "support",
  "dispute-raised-staff": "dispute-queue",
  "topup-pending-review": "receipts",
  "kyc-pending-review": "kyc",
  "kyc-resubmission-pending-review": "kyc",
  "kyc-duplicate-identity-pending-review": "kyc",
  "kyc-upgrade-pending-review": "kyc",
  "kyc-duplicate-detected": "kyc",
  "kyc-rereview-requested": "kyc",
  "tms-flag-raised": "risk",
  "str-sla-breach": "risk",
  "vat-threshold-reached": "reconciliation",
};

/**
 * The record to focus, per queue. KYC rows are keyed by userId in opsApi's
 * toKyc(), so those notifications must resolve targetUserId rather than the
 * KycRecord id; disputes are keyed by the dispute id.
 */
const OPS_FOCUS_KEYS: Partial<Record<OpsPageId, readonly string[]>> = {
  kyc: ["targetUserId", "userId"],
  "dispute-queue": ["disputeId", "id"],
  support: ["conversationId"],
  receipts: ["topUpId"],
  risk: ["targetUserId", "flagId"],
};

const target = (page: string, keys?: readonly string[], meta?: Record<string, unknown> | null) => {
  let focusId: string | undefined;
  for (const k of keys ?? []) {
    focusId = str(meta?.[k]);
    if (focusId) break;
  }
  return focusId ? { page, focusId } : { page };
};

/** Console destination for a staff notification, or null if there is no queue for it. */
export function opsTargetFor(n: NotificationItem): NotificationTarget | null {
  const page = OPS_TARGETS[n.type];
  if (!page) return null;
  return target(page, OPS_FOCUS_KEYS[page], n.metadata);
}

/** Client destination for a personal notification, or null if it has no page. */
export function appTargetFor(n: NotificationItem): NotificationTarget | null {
  const page = APP_TARGETS[n.type];
  if (!page) return null;
  // Contracts and disputes open the relevant record where the client supports it.
  const keys =
    page === "contracts"
      ? ["contractId", "milestoneId"]
      : page === "cases"
        ? ["disputeId"]
        : page === "jobs"
          ? ["jobId", "proposalId"]
          : page === "chat"
            ? ["conversationId"]
            : page === "gigs"
              ? ["gigOrderId"]
              : undefined;
  return target(page, keys, n.metadata);
}

/** Every event type this module routes, for tests and documentation. */
export const KNOWN_NOTIFICATION_TYPES: readonly string[] = [
  ...Object.keys(APP_TARGETS),
  ...Object.keys(OPS_TARGETS),
];