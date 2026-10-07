/* ────────────────────────────────────────────────────────────────────────
   opsBackend.ts — wire types for the EXISTING NestJS admin/staff endpoints
   that the Operations Console reads from.

   The console's own domain model (opsTypes.ts) is deliberately compact
   (short keys, pre-formatted) to keep table payloads small. This file
   describes the real backend shapes verbatim; opsApi.ts is the only place
   that translates between the two.

   Endpoints (all under /api/v1, Bearer auth via api client):
     GET    admin/dashboard/summary
     GET    admin/monitoring/health
     GET    admin/reports/summary
     GET    admin/ledger · admin/ledger/journals
     GET    admin/reconciliation · admin/payments · admin/escrows
     GET    admin/payouts        · POST admin/payouts/:id/settle
     GET    admin/contracts      · GET admin/contracts/:id
     GET    admin/users          · GET admin/users/:id
     GET    admin/staff          · POST admin/staff/:id/role
     GET    admin/audit-logs     · GET admin/permissions/matrix
     GET    kyc/review-queue     · POST kyc/:userId/review
     GET    tms/queue
     GET    disputes/staff/queue · POST disputes/:id/resolve
     GET    staff/reports        · PATCH staff/reports/:id
     GET    wallet/topups/queue
     GET    chat/admin/conversations
   ──────────────────────────────────────────────────────────────────────── */

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
export type PageLimit<T> = { items: T[]; total: number; page: number; limit: number };

export type PrismaUserRole = "CLIENT" | "FREELANCER" | "BOTH";
export type PrismaStaffRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "OPERATIONS_ADMIN"
  | "FINANCE_ADMIN"
  | "DISPUTE_MEDIATOR"
  | "COMPLIANCE_ADMIN"
  | "COMPLIANCE_OFFICER"
  | "SUPPORT";
export type PrismaKycTier = "TIER_1" | "TIER_2" | "TIER_3";
export type PrismaKycStatus = "PENDING" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED";
export type PrismaProvider = "TELEBIRR" | "CBE_BIRR" | "M_PESA";
export type PrismaContractStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "TERMINATED"
  | "CANCELLED";
export type PrismaEscrowState =
  | "PAYMENT_PENDING"
  | "ESCROW_HELD"
  | "WORK_IN_PROGRESS"
  | "SUBMITTED_FOR_REVIEW"
  | "ACCEPTED"
  | "RELEASED"
  | "DISPUTED"
  | "REFUNDED"
  | "PARTIAL_REFUND";
export type PrismaPayoutStatus =
  | "PENDING"
  | "PROCESSING"
  | "CONFIRMED"
  | "FAILED"
  | "REVERSED";
export type PrismaDisputeStage =
  | "NONE"
  | "STAGE_1_NEGOTIATION"
  | "STAGE_2_EVIDENCE"
  | "STAGE_3_MEDIATION"
  | "STAGE_4_ARBITRATION"
  | "RESOLVED";
export type PrismaResolutionOutcome =
  | "RELEASE_TO_FREELANCER"
  | "REFUND_TO_CLIENT"
  | "PARTIAL_SPLIT";
export type PrismaLedgerAccountType =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "EXPENSE";
export type PrismaReportStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "RESOLVED_NO_ACTION"
  | "RESOLVED_PROFILE_HIDDEN"
  | "RESOLVED_PROFILE_BANNED";

/* ── dashboard/summary ── */
export interface RawMetrics {
  totalUsers: number;
  activeContracts: number;
  fundsInEscrowMinor: number;
  pendingPayouts: number;
  openDisputes: number;
  pendingIdentity: number;
  openSupportTickets: number;
  pendingPayments: number;
  pendingTopUps: number;
}
export interface RawActivityEvent {
  id: string;
  eventType: string;
  action: string | null;
  entityType: string;
  entityId: string;
  createdAt: string;
  actorRole: string | null;
  amountMinor: number | null;
}
export interface RawDashboardSummary {
  metrics: RawMetrics;
  recentActivity: RawActivityEvent[];
}

/* ── monitoring/health ── */
export interface RawHealthCheck {
  ok: boolean;
  detail?: string;
}
export interface RawSystemHealth {
  checks: {
    database: RawHealthCheck;
    redis: RawHealthCheck;
    objectStore: RawHealthCheck;
    telebirrConfigured: RawHealthCheck;
  };
  ledger: { debitsMinor: number; creditsMinor: number; isBalanced: boolean };
  checkedAt: string;
}

/* ── reports/summary ── */
export interface RawReportsSummary {
  financial: {
    transactionVolumeMinor: number;
    releasedFundsMinor: number;
    refundedFundsMinor: number;
    payoutsMinor: number;
    platformFeesMinor: number;
    withholdingMinor: number;
    failedPaymentCount: number;
    failedPayoutCount: number;
  };
  marketplace: {
    clientCount: number;
    freelancerCount: number;
    totalContracts: number;
    contractsByStatus: Record<string, number>;
    openDisputes: number;
    openRiskFlags: number;
  };
  generatedAt: string;
}

/* ── ledger ── */
export interface RawLedgerAccount {
  id: string;
  code: string;
  name: string;
  type: PrismaLedgerAccountType;
  currency: string;
  balanceMinor: number;
}
export interface RawLedgerSummary {
  accounts: RawLedgerAccount[];
  journalCount: number;
  integrity: {
    isBalanced: boolean;
    totalEntries: number;
    totalDebitsMinor: number;
    totalCreditsMinor: number;
    discrepancyMinor: number;
  };
}
export interface RawJournal {
  id: string;
  description: string;
  referenceType: string;
  referenceId: string | null;
  postedAt: string;
  totalDebitsMinor: number;
  totalCreditsMinor: number;
}

/* ── payments / escrows / payouts / reconciliation ── */
export interface RawParty {
  id: string;
  email: string;
  displayName: string | null;
}
export interface RawPayment {
  id: string;
  provider: PrismaProvider;
  providerTransactionId: string;
  amountMinor: number;
  status: string;
  createdAt: string;
  milestone: {
    id: string;
    title: string;
    contract: {
      id: string;
      client: RawParty;
      freelancer: RawParty;
      job: { title: string };
    };
  } | null;
}
export interface RawEscrow {
  id: string;
  title: string;
  amountMinor: number;
  escrowState: PrismaEscrowState;
  createdAt: string;
  contract: {
    id: string;
    job: { title: string };
    client: RawParty;
    freelancer: RawParty;
  };
  paymentTransactions: Array<{
    provider: PrismaProvider;
    providerTransactionId: string;
    status: string;
  }>;
  escrowHolds: Array<{ id: string; reason: string; createdAt: string }>;
}
export interface RawPayout {
  id: string;
  amountMinor: number;
  feeMinor: number;
  netAmountMinor: number;
  provider: PrismaProvider;
  providerPayoutId: string | null;
  payoutAccountIdentifier: string;
  status: PrismaPayoutStatus;
  errorMessage: string | null;
  createdAt: string;
  user: RawParty;
}
export interface RawReconRow {
  id: string;
  provider: PrismaProvider;
  providerTransactionId: string;
  amountMinor: number;
  status: string;
  createdAt: string;
  reconciliationStatus: "PENDING" | "FAILED" | "MATCHED" | "MISMATCH";
  differenceMinor: number | null;
  milestone: { escrowState: PrismaEscrowState } | null;
}

/* ── contracts ── */
export interface RawContractRow {
  id: string;
  status: PrismaContractStatus;
  createdAt: string;
  client: RawParty & { role: PrismaUserRole };
  freelancer: RawParty & { role: PrismaUserRole };
  job: { id: string; title: string; category: string };
  _count: { milestones: number };
}
export interface RawContractDetail {
  contract: {
    id: string;
    status: PrismaContractStatus;
    createdAt: string;
    jobTitle: string;
    jobCategory: string;
  };
  parties: { client: RawParty; freelancer: RawParty };
  milestones: Array<{
    id: string;
    title: string;
    amountMinor: number;
    escrowState: PrismaEscrowState;
  }>;
  payments: Array<{
    provider: PrismaProvider;
    amountMinor: number;
    status: string;
    createdAt: string;
    milestone: { title: string };
  }>;
  disputes: Array<{ id: string; stage: PrismaDisputeStage; category: string }>;
  totals: { escrowHeldMinor: number; milestoneCount: number };
}

/* ── users / staff ── */
export interface RawUserRow {
  id: string;
  ucid: string;
  email: string;
  phone: string;
  displayName: string | null;
  role: PrismaUserRole;
  staffRole: PrismaStaffRole | null;
  isSuspended: boolean;
  cachedKycTier: PrismaKycTier | null;
  cachedKycStatus: PrismaKycStatus | null;
  createdAt: string;
}
export interface RawUserSummary {
  user: {
    id: string;
    email: string;
    phone: string;
    displayName: string | null;
    cachedKycTier: PrismaKycTier | null;
    cachedKycStatus: PrismaKycStatus | null;
    profileCompleteness: number;
  };
  walletBalance: number;
  activity: {
    jobsPosted: number;
    proposalsSubmitted: number;
    contractsAsClient: number;
    contractsAsFreelancer: number;
    gigsOwned: number;
    gigOrders: number;
  };
  recentConversations: Array<{ id: string; subject: string; status: string; updatedAt: string }>;
  recentAudit: Array<{ id: string; eventType: string; entityType: string; entityId: string; createdAt: string; actorRole: string | null }>;
}
export interface RawStaffRow {
  id: string;
  ucid: string;
  email: string;
  displayName: string | null;
  role: PrismaUserRole;
  staffRole: PrismaStaffRole | null;
  isSuspended: boolean;
}

/* ── KYC ── */
export interface RawKycDocument {
  id: string;
  documentType: string;
  uploadedAt: string;
}
export interface RawKycItem {
  id: string;
  userId: string;
  tier: PrismaKycTier;
  status: PrismaKycStatus;
  fullName: string | null;
  documentNumber: string | null;
  tin: string | null;
  businessRegNumber: string | null;
  isPepMatch: boolean;
  faydaVerificationAttempted: boolean;
  faydaVerificationSucceeded: boolean;
  rejectionReason: string | null;
  updatedAt: string;
  user: { id: string; email: string; ucid: string };
  documents: RawKycDocument[];
}
export interface RawKycHistory {
  id: string;
  decision: PrismaKycStatus;
  tierAtDecision: PrismaKycTier;
  reason: string | null;
  createdAt: string;
}

/* ── disputes ── */
export interface RawDisputeItem {
  id: string;
  category: string;
  stage: PrismaDisputeStage;
  description: string;
  negotiationDeadlineAt: string | null;
  mediationDeadlineAt: string | null;
  createdAt: string;
  evidence: Array<{
    id: string;
    submittedByUserId: string;
    statement: string;
    createdAt: string;
  }>;
  contract: {
    id: string;
    job: { title: string };
    client: { id: string; email: string };
    freelancer: { id: string; email: string };
    milestones: Array<{
      id: string;
      title: string;
      amountMinor: number;
      deliverableUrl: string | null;
    }>;
  } | null;
}

/* ── TMS risk flags ── */
export interface RawRiskFlag {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  reviewNotes: string | null;
  strReferenceNumber: string | null;
  details: Record<string, unknown>;
  user: {
    id: string;
    email: string;
    phone: string;
    ucid: string;
    kyc: { tier: PrismaKycTier; status: PrismaKycStatus } | null;
    wallet: { balanceMinor: number } | null;
    transactionFlags: Array<{
      id: string;
      type: string;
      status: string;
      createdAt: string;
      strFiledAt: string | null;
    }>;
  };
}

/* ── staff profile reports ── */
export interface RawProfileReport {
  id: string;
  reason: string;
  details: string | null;
  status: PrismaReportStatus;
  staffNotes: string | null;
  createdAt: string;
  reportedUser: { id: string; ucid: string; displayName: string | null };
}
export type RawProfileReportPage = {
  data: RawProfileReport[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

/* ── wallet top-up (receipt) queue ── */
export interface RawTopUpItem {
  id: string;
  provider: PrismaProvider;
  amountMinor: number;
  referenceNumber: string;
  status: string;
  rejectionReason: string | null;
  receiptImagePath: string | null;
  createdAt: string;
  user: { id: string; email: string; phone: string; ucid: string };
  userHistory: {
    approvedCount: number;
    approvedTotalMinor: number;
    rejectedCount: number;
  };
}
export type RawTopUpPage = {
  items: RawTopUpItem[];
  total: number;
  page: number;
  pageSize: number;
};

/* ── support chat queue ── */
export interface RawConversation {
  id: string;
  subject: string;
  status: string;
  updatedAt: string;
  creator: { id: string; email: string; role: PrismaUserRole };
  assignedStaff: { id: string; name: string } | null;
  messages: Array<{ body: string; createdAt: string }>;
}
export type RawConversationPage = {
  items: RawConversation[];
  total: number;
  page: number;
  pageSize: number;
};
export interface RawChatMessage {
  id: string;
  body: string;
  attachmentUrl: string | null;
  origin?: string;
  createdAt: string;
  sender: {
    id: string;
    email: string;
    staffRole: PrismaStaffRole | null;
    displayName: string | null;
  };
}

/* ── audit ── */
export interface RawAuditLog {
  id: string;
  userId: string | null;
  eventType: string;
  entityType: string;
  entityId: string;
  actorRole: string | null;
  action: string | null;
  amountMinor: number | null;
  ipAddress: string | null;
  createdAt: string;
}
export type RawAuditLogPage = PageLimit<RawAuditLog>;

/* ── permissions ── */
export interface RawPermissionMatrix {
  permissions: readonly string[];
  roles: Record<string, readonly string[]>;
}

export interface RawGigModeration {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  freelancer: { id: string; email: string; displayName: string | null; ucid: string };
  packages: Array<{ id: string; tier: string; priceMinor: number; deliveryDays: number }>;
}
