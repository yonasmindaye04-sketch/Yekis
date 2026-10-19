/* ────────────────────────────────────────────────────────────────────────
   opsTypes.ts — shared domain types for the Operations Console.
   Mirrors the NestJS admin API payloads (see opsApi.ts for the routes).
   ──────────────────────────────────────────────────────────────────────── */

export type Rail = "TELEBIRR" | "CBE_BIRR" | "M_PESA";

export type PaymentStatus = "SUCCESS" | "PENDING" | "FAILED";
export type PayoutStatus =
  | "PENDING"
  | "PROCESSING"
  | "CONFIRMED"
  | "FAILED"
  | "REVERSED";
export type ContractStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "TERMINATED"
  | "CANCELLED";
export type MilestoneState =
  | "PENDING"
  | "ESCROW_HELD"
  | "WORK_IN_PROGRESS"
  | "SUBMITTED_FOR_REVIEW"
  | "ACCEPTED"
  | "DISPUTED"
  | "RELEASED"
  | "REFUNDED"
  | "PARTIAL_REFUND";
export type ReconStatus = "MATCHED" | "MISMATCH" | "PENDING" | "FAILED";
export type UserRole = "CLIENT" | "FREELANCER" | "BOTH";
export type KycState = "VERIFIED" | "PENDING" | "UNDER_REVIEW" | "REJECTED";
export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type RiskStatus = "OPEN" | "REVIEWING" | "RESOLVED";
export type DisputeStage =
  | "NONE"
  | "STAGE_1_NEGOTIATION"
  | "STAGE_2_EVIDENCE"
  | "STAGE_3_MEDIATION"
  | "STAGE_4_ARBITRATION"
  | "RESOLVED";
export type StaffRole =
  | "SUPER_ADMIN"
  | "OPERATIONS_ADMIN"
  | "FINANCE_ADMIN"
  | "SUPPORT"
  | "COMPLIANCE_ADMIN"
  | "DISPUTE_MEDIATOR"
  | "ADMIN"
  | "COMPLIANCE_OFFICER";

/** All money values are minor units (cents) unless a field says otherwise. */
export interface Metrics {
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

export interface ActivityEvent {
  a: string;
  e: string;
  t: string; // ISO timestamp
}

export interface HealthCheck {
  ok: boolean;
  d: string;
}
export interface HealthState {
  checks: Record<string, HealthCheck>;
  ledger: { dr: number; cr: number; bal: boolean };
  checkedAt: string;
}

export interface Payout {
  id: string;
  user: { displayName: string; email: string };
  acct: string;
  provider: Rail;
  ref: string | null;
  net: number;
  status: PayoutStatus;
  err: string | null;
}

export interface Payment {
  id: string;
  txId: string;
  job: string;
  client: string;
  provider: Rail;
  status: PaymentStatus;
  amount: number;
  created: string;
}

export interface Milestone {
  t: string;
  s: MilestoneState;
  a: number;
}
export interface Contract {
  id: string;
  title: string;
  cat: string;
  client: string;
  clientEmail: string;
  fl: string;
  flEmail: string;
  status: ContractStatus;
  ms: number;
  created: string;
  escrowHeld: number;
  milestones: Milestone[];
  pays: { p: Rail; s: PaymentStatus; a: number; c: string }[];
  disputes: { cat: string; stage: DisputeStage }[];
}

export interface Escrow {
  id: string;
  title: string;
  amt: number;
  state: MilestoneState;
  job: string;
  fl: string;
  rail: string;
  created: string;
  held: boolean;
}

export interface UserActivity {
  jobs: number;
  props: number;
  cClient: number;
  cFree: number;
  gigs: number;
  orders: number;
}
export interface User {
  id: string;
  ucid: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  kyc: KycState;
  created: string;
  suspended: boolean;
  /** 0–100, only known once the detail summary has loaded. */
  completeness: number;
  wallet: number;
  act: UserActivity;
}

export interface StaffMember {
  id: string;
  email: string;
  ucid: string;
  /** Platform role of the underlying user account. */
  userRole: UserRole;
  /** Staff role granting console access, or null for a plain user. */
  staffRole: StaffRole | null;
  suspended: boolean;
}

export interface Account {
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  bal: number;
  c: string; // accent colour
}
export interface JournalEntry {
  id: string;
  desc: string;
  ref: string;
  dr: number;
  cr: number;
  posted: string;
}
export interface LedgerBundle {
  accounts: Account[];
  journal: JournalEntry[];
  integrity: { dr: number; cr: number; bal: boolean; entries: number; journals: number };
}

export interface ReconRow {
  id: string;
  txId: string;
  provider: Rail;
  amt: number;
  rec: ReconStatus;
  diff: number | null;
  esc: MilestoneState;
}

export interface RiskFlag {
  id: string;
  type: string;
  status: RiskStatus;
  created: string;
  /** Rule-specific payload (STRUCTURING counts, VELOCITY windows, …). */
  details: Record<string, unknown>;
  strRef: string | null;
  user: {
    id: string;
    email: string;
    ucid: string;
    kycTier: string | null;
    kycStatus: string | null;
    walletMinor: number | null;
    flagCount: number;
  };
}
export const RISK_LEVEL: Record<string, RiskLevel> = {
  STRUCTURING: "HIGH",
  VELOCITY: "HIGH",
  ROUND_AMOUNTS: "MEDIUM",
  PASS_THROUGH: "HIGH",
  WALLET_MISMATCH: "CRITICAL",
  STAFF_FLAGGED: "MEDIUM",
  VAT_THRESHOLD_REACHED: "LOW",
};

export interface ReportsBundle {
  financial: {
    vol: number;
    released: number;
    refunded: number;
    payouts: number;
    fees: number;
    wh: number;
    failPay: number;
    failPo: number;
  };
  marketplace: {
    clients: number;
    freelancers: number;
    totalContracts: number;
    byStatus: Record<string, number>;
    disputes: number;
    flags: number;
  };
  series: {
    volume12: Series;
    railMonthly: { labels: string[]; telebirr: number[]; cbe: number[] };
    categoryDone: { label: string; value: number; color: string }[];
  };
}

/** Chart series — values are ETB millions unless the chart says otherwise. */
export interface Series {
  labels: string[];
  values: number[];
}

/* ── Review queues ── */
export interface KycDoc {
  /** KycDocument id — exchanged for a signed URL by the evidence viewer. */
  id: string;
  t: string;
  k: "id-front" | "id-back" | "tin" | "license" | "selfie";
}
/**
 * A document the viewer can open. Either `id` (a KycDocument, resolved to a
 * short-lived signed URL) or `url` (a direct link such as a milestone
 * deliverable) must be present.
 */
export interface ViewerDoc {
  id?: string;
  url?: string;
  t: string;
  k: "id-front" | "id-back" | "tin" | "license" | "selfie";
  name?: string;
  doc?: string;
  tin?: string;
}
export interface KycHistory {
  d: string;
  by: string;
  at: string;
  reason?: string;
}
export interface KycItem {
  id: string;
  email: string;
  ucid: string;
  tier: "TIER_1" | "TIER_2" | "TIER_3";
  tin: string | null;
  biz: string | null;
  pep: boolean;
  faydaA: boolean;
  faydaS: boolean;
  dup: boolean;
  /** Why the record was routed to a human, when the backend supplied a
   *  machine-readable reason (Fayda unavailable / not found / duplicate
   *  identity). Null when the case is awaiting a first decision. */
  flag: string | null;
  name: string;
  doc: string;
  status: KycState;
  updated: string;
  docs: KycDoc[];
  history: KycHistory[];
}
export type KycDecision = "VERIFIED" | "REJECTED" | "CLEARER";

export interface EvidenceMsg {
  side: "client" | "freelancer";
  s: string;
  at: string;
}
export interface DisputeItem {
  id: string;
  cat: string;
  stage: DisputeStage;
  job: string;
  clientId: string;
  scope: string;
  ms: string;
  amt: number;
  hasDel: boolean;
  /** Direct link to the submitted deliverable, when one exists. */
  deliverableUrl: string | null;
  slaH: number; // negative = breached
  created: string;
  ev: EvidenceMsg[];
}
export type DisputeOutcome =
  | "RELEASE_TO_FREELANCER"
  | "PARTIAL_SPLIT"
  | "REFUND_TO_CLIENT";

export type ReportReason =
  | "IMPERSONATION"
  | "SPAM"
  | "ABUSIVE_LANGUAGE"
  | "FRAUD";
export type ReportResolution =
  | "RESOLVED_NO_ACTION"
  | "RESOLVED_PROFILE_HIDDEN"
  | "RESOLVED_PROFILE_BANNED";
export interface ProfileReport {
  id: string;
  reported: string;
  reporter: string;
  reason: ReportReason;
  details: string;
  created: string;
  status: "OPEN" | ReportResolution;
}

/* ── Aggregates ── */
export interface OverviewBundle {
  metrics: Metrics;
  activity: ActivityEvent[];
  health: HealthState;
  escrows: Escrow[];
  recon: ReconRow[];
  riskFlags: RiskFlag[];
  queues: {
    kyc: KycItem[];
    disputes: DisputeItem[];
    reports: ProfileReport[];
    payouts: Payout[];
  };
  series: {
    volume14: Series;
    payoutsWeekly: { labels: string[]; payouts: number[]; refunds: number[] };
    /**
     * Optional 12-point trend traces for the stat-card sparklines. The backend
     * exposes aggregate totals only — no time-series endpoint — so these are
     * omitted unless real per-period history is available.
     */
    sparks: Partial<Record<string, number[]>>;
  };
}

export interface OpsBadges {
  payouts: number;
  kyc: number;
  disputes: number;
  reports: number;
  risk: number;
  recon: number;
  monitoring: number;
  /** Open support conversations awaiting a reply. */
  tickets: number;
  /** Wallet top-ups pending receipt review. */
  receipts: number;
}
