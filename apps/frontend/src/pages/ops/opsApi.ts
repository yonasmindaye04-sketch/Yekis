/* ────────────────────────────────────────────────────────────────────────
   opsApi.ts — data layer for the Operations Console.

   This is an ADAPTER, not a second API client. It reads through the shared
   `api` client (Bearer auth, /api/v1 prefix, automatic token refresh) and
   maps real backend payloads into the compact console domain model declared
   in opsTypes.ts.

   The console was originally written against a planned `/admin/*` surface
   (overview, badges, activity, health, risk-flags, kyc/queue,
   disputes/mediation, profile-reports). Those routes do not exist. This file
   maps the console onto what the backend actually serves:

     console          → real endpoint
     ────────────────────────────────────────────────────────────────────
     overview()       → dashboard/summary + monitoring/health + payments +
                        payouts + escrows + reconciliation + kyc/review-queue
                        + disputes/staff/queue + staff/reports + tms/queue
     badges()         → dashboard/summary metrics + queue totals
     health()         → monitoring/health
     contracts()      → contracts            (detail fetched on demand)
     payments()       → payments
     payouts()        → payouts
     escrows()        → escrows
     reconciliation() → reconciliation
     ledger()         → ledger + ledger/journals
     users()          → users                (summary fetched on demand)
     staff()          → staff
     reports()        → reports/summary      (+ series derived from lists)
     riskFlags()      → tms/queue
     kycQueue()       → kyc/review-queue
     disputes()       → disputes/staff/queue
     profileReports() → staff/reports

   Permission notes: `/admin/*` uses `requirePermission`, but every other
   staff surface (kyc, tms, disputes, topups, chat, staff reports) uses the
   coarser `requireStaffRole`. A restricted role therefore gets 403 on parts
   of the aggregate — `overview()` degrades per-section instead of failing,
   so the Command Center still renders for SUPPORT or FINANCE_ADMIN.

   Time series: the backend exposes aggregate totals only, no time-series or
   trend endpoint. Charts that need history are derived here from the most
   recent 100 rows of the underlying list endpoints. That is real data, but
   it is windowed — the UI labels these charts accordingly.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import type {
  ActivityEvent,
  Contract,
  DisputeItem,
  DisputeOutcome,
  Escrow,
  HealthState,
  KycDecision,
  KycItem,
  LedgerBundle,
  OpsBadges,
  OverviewBundle,
  Payment,
  Payout,
  ProfileReport,
  ReconRow,
  ReportsBundle,
  ReportResolution,
  RiskFlag,
  StaffMember,
  StaffRole,
  User,
} from "./opsTypes";
import type {
  PrismaEscrowState,
  PrismaLedgerAccountType,
  PrismaPayoutStatus,
  PrismaReportStatus,
  RawAuditLogPage,
  RawChatMessage,
  RawContractDetail,
  RawContractRow,
  RawConversationPage,
  RawDashboardSummary,
  RawDisputeItem,
  RawEscrow,
  RawJournal,
  RawKycItem,
  RawLedgerSummary,
  RawPayment,
  RawPayout,
  RawPermissionMatrix,
  RawProfileReportPage,
  RawReconRow,
  RawReportsSummary,
  RawRiskFlag,
  RawStaffRow,
  RawSystemHealth,
  RawTopUpPage,
  RawUserRow,
  RawUserSummary,
} from "./opsBackend";

/** Rows pulled for list-backed pages and chart series. */
const LIST_LIMIT = 100;
/** Rows for the primary admin tables. */
const TABLE_LIMIT = 25;

const DAY_MS = 86_400_000;

/* ── error type ───────────────────────────────────────────────────────── */
export class OpsApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(status: number, path: string) {
    super(`OPS API ${status} — ${path}`);
    this.name = "OpsApiError";
    this.status = status;
    this.path = path;
  }
}

/** Resolves to `fallback` when the caller lacks permission or the call fails. */
async function soft<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

/* ── mapping helpers ──────────────────────────────────────────────────── */
type Party = { displayName: string | null; email: string } | null | undefined;

const nameOf = (p: Party) => p?.displayName?.trim() || p?.email || "Unknown";

const kycState = (s: string | null | undefined): User["kyc"] =>
  s === "VERIFIED" || s === "UNDER_REVIEW" || s === "REJECTED" ? s : "PENDING";

/** The backend's EscrowState has PAYMENT_PENDING; the console models it as PENDING. */
const escrowState = (s: PrismaEscrowState): Escrow["state"] =>
  s === "PAYMENT_PENDING" ? "PENDING" : s;

const payoutStatus = (s: PrismaPayoutStatus): Payout["status"] => s;

/** Payment status is a free-form String server-side. */
const paymentStatus = (s: string): Payment["status"] =>
  s === "SUCCESS" || s === "FAILED" ? s : "PENDING";

const ACCOUNT_COLOR: Record<PrismaLedgerAccountType, string> = {
  ASSET: "#2563eb",
  LIABILITY: "#d97706",
  EQUITY: "#7c3aed",
  REVENUE: "#059669",
  EXPENSE: "#dc2626",
};

/** TMS flag status → the console's OPEN / REVIEWING / RESOLVED vocabulary. */
const flagStatus = (s: string): RiskFlag["status"] =>
  s === "PENDING_REVIEW" ? "OPEN" : s === "STR_FILED" ? "REVIEWING" : "RESOLVED";

/** Profile reports read as OPEN until they reach a terminal state. */
const reportStatus = (s: PrismaReportStatus): ProfileReport["status"] =>
  s === "PENDING" || s === "UNDER_REVIEW" ? "OPEN" : s;

/** Hours until a deadline; negative once breached, Infinity when unset. */
function hoursUntil(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}

/** KYC document type → the console's short document keys. */
const KYCDOC: Record<string, KycItem["docs"][number]["k"]> = {
  NATIONAL_ID: "id-front",
  PASSPORT: "id-front",
  DRIVERS_LICENSE: "license",
  TIN_CERTIFICATE: "tin",
  BUSINESS_REGISTRATION: "tin",
  SELFIE_LIVENESS: "selfie",
};

/* ── series derivation (real rows, windowed) ──────────────────────────── */
const toMillions = (minor: number) => Number(((minor / 100) / 1e6).toFixed(4));

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(today.getTime() - i * DAY_MS).toISOString().slice(0, 10));
  }
  return out;
}

function lastNWeeks(n: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(now - i * 7 * DAY_MS).toISOString().slice(0, 10));
  }
  return out;
}

function lastNMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 7));
  }
  return out;
}

/** Monday-anchored week key, so weekly buckets line up across call sites. */
const weekKey = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - ((d.getDay() + 6) % 7) * DAY_MS).toISOString().slice(0, 10);
};

function bucket(rows: Array<{ createdAt: string; amountMinor: number }>, keys: string[], keyOf: (iso: string) => string) {
  const idx = new Map(keys.map((k, i) => [k, i]));
  const out = new Array<number>(keys.length).fill(0);
  for (const r of rows) {
    const i = idx.get(keyOf(r.createdAt));
    if (i !== undefined) out[i] += r.amountMinor;
  }
  return out.map(toMillions);
}

/** Successful payment volume, bucketed by day / week / month key. */
const bucketPayments = (rows: RawPayment[], keys: string[], by: "day" | "week" | "month") =>
  bucket(
    rows.filter((r) => r.status === "SUCCESS"),
    keys,
    by === "day"
      ? (iso) => iso.slice(0, 10)
      : by === "month"
        ? (iso) => iso.slice(0, 7)
        : weekKey,
  );

const bucketPayouts = (rows: RawPayout[], keys: string[]) => bucket(rows, keys, weekKey);

const bucketRefunds = (rows: RawEscrow[], keys: string[]) =>
  bucket(
    rows.filter((r) => r.escrowState === "REFUNDED" || r.escrowState === "PARTIAL_REFUND"),
    keys,
    weekKey,
  );

/* ── raw calls ────────────────────────────────────────────────────────── */
const rDashboard = () => api.adminDashboardSummary() as Promise<RawDashboardSummary>;
const rHealth = () => api.adminSystemHealth() as Promise<RawSystemHealth>;
const rReportsSummary = () => api.adminReportsSummary() as Promise<RawReportsSummary>;
const rLedger = () => api.adminLedgerSummary() as Promise<RawLedgerSummary>;
const rJournals = () =>
  api.adminLedgerJournals({ limit: LIST_LIMIT }) as Promise<{ items: RawJournal[] }>;
const rPayments = () =>
  api.adminListPayments({ limit: LIST_LIMIT }) as Promise<{ items: RawPayment[] }>;
const rEscrows = () =>
  api.adminListEscrows({ limit: LIST_LIMIT }) as Promise<{ items: RawEscrow[] }>;
const rPayouts = () =>
  api.adminListPayouts({ limit: LIST_LIMIT }) as Promise<{ items: RawPayout[] }>;
const rRecon = () =>
  api.adminListReconciliation({ limit: LIST_LIMIT }) as Promise<{ items: RawReconRow[] }>;
const rContracts = () =>
  api.adminListContracts({ limit: TABLE_LIMIT }) as Promise<{ items: RawContractRow[] }>;
const rUsers = () =>
  api.adminListUsers({ limit: TABLE_LIMIT }) as Promise<{ items: RawUserRow[] }>;
const rStaff = () => api.getStaffUsers() as Promise<{ items: RawStaffRow[] }>;
const rMatrix = () => api.getPermissionMatrix() as Promise<RawPermissionMatrix>;
const rAudit = () => api.getAuditLogs({ limit: 50 }) as Promise<RawAuditLogPage>;
const rKyc = () =>
  api.getKycReviewQueue({ pageSize: TABLE_LIMIT }) as Promise<{ items: RawKycItem[] }>;
const rDisputes = () =>
  api.getDisputeQueue({ pageSize: TABLE_LIMIT }) as unknown as Promise<{
    items: RawDisputeItem[];
  }>;
const rFlags = () => api.getTmsQueue({ pageSize: TABLE_LIMIT }) as Promise<{ items: RawRiskFlag[] }>;
const rProfileReports = () =>
  api.getProfileReports({ limit: TABLE_LIMIT }) as Promise<RawProfileReportPage>;
const rTopUps = (status: string) =>
  api.getTopUpReviewQueue({ pageSize: TABLE_LIMIT, status }) as Promise<RawTopUpPage>;
const rConversations = (status: "OPEN" | "ALL") =>
  api.getStaffConversations({ pageSize: TABLE_LIMIT, status }) as Promise<RawConversationPage>;

/* ── mappers ──────────────────────────────────────────────────────────── */
const toActivity = (e: RawDashboardSummary["recentActivity"][number]): ActivityEvent => ({
  a: e.eventType,
  e: [e.entityType, e.action].filter(Boolean).join(" · "),
  t: e.createdAt,
});

const toPayment = (r: RawPayment): Payment => ({
  id: r.id,
  txId: r.providerTransactionId,
  job: r.milestone?.contract.job.title ?? "—",
  client: nameOf(r.milestone?.contract.client),
  provider: r.provider,
  status: paymentStatus(r.status),
  amount: r.amountMinor,
  created: r.createdAt,
});

const toPayout = (r: RawPayout): Payout => ({
  id: r.id,
  user: { displayName: nameOf(r.user), email: r.user.email },
  acct: r.payoutAccountIdentifier,
  provider: r.provider,
  ref: r.providerPayoutId,
  net: r.netAmountMinor,
  status: payoutStatus(r.status),
  err: r.errorMessage,
});

const toEscrow = (r: RawEscrow): Escrow => ({
  id: r.id,
  title: r.title,
  amt: r.amountMinor,
  state: escrowState(r.escrowState),
  job: r.contract.job.title,
  fl: nameOf(r.contract.freelancer),
  rail: r.paymentTransactions[0]?.provider ?? "—",
  created: r.createdAt,
});

const toRecon = (r: RawReconRow): ReconRow => ({
  id: r.id,
  txId: r.providerTransactionId,
  provider: r.provider,
  amt: r.amountMinor,
  rec: r.reconciliationStatus,
  diff: r.differenceMinor,
  esc: r.milestone ? escrowState(r.milestone.escrowState) : "PENDING",
});

const toContract = (r: RawContractRow): Contract => ({
  id: r.id,
  title: r.job.title,
  cat: r.job.category,
  client: nameOf(r.client),
  clientEmail: r.client.email,
  fl: nameOf(r.freelancer),
  flEmail: r.freelancer.email,
  status: r.status,
  ms: r._count.milestones,
  created: r.createdAt,
  escrowHeld: 0,
  milestones: [],
  pays: [],
  disputes: [],
});

/** Folds an on-demand detail payload into a list row. */
export const withContractDetail = (row: Contract, d: RawContractDetail): Contract => ({
  ...row,
  escrowHeld: d.totals.escrowHeldMinor,
  milestones: d.milestones.map((m) => ({
    t: m.title,
    s: escrowState(m.escrowState),
    a: m.amountMinor,
  })),
  pays: d.payments.map((p) => ({
    p: p.provider,
    s: paymentStatus(p.status),
    a: p.amountMinor,
    c: p.createdAt,
  })),
  disputes: d.disputes.map((x) => ({ cat: x.category, stage: x.stage })),
});

const toUser = (r: RawUserRow): User => ({
  id: r.id,
  ucid: r.ucid,
  email: r.email,
  phone: r.phone,
  name: r.displayName ?? "",
  role: r.role,
  kyc: kycState(r.cachedKycStatus),
  created: r.createdAt,
  suspended: r.isSuspended,
  wallet: 0,
  act: { jobs: 0, props: 0, cClient: 0, cFree: 0, gigs: 0, orders: 0 },
});

/** Folds an on-demand user summary into a list row. */
export const withUserDetail = (row: User, d: RawUserSummary): User => ({
  ...row,
  wallet: d.walletBalance,
  kyc: kycState(d.user.cachedKycStatus),
  act: {
    jobs: d.activity.jobsPosted,
    props: d.activity.proposalsSubmitted,
    cClient: d.activity.contractsAsClient,
    cFree: d.activity.contractsAsFreelancer,
    gigs: d.activity.gigsOwned,
    orders: d.activity.gigOrders,
  },
});

const toKyc = (r: RawKycItem): KycItem => ({
  id: r.userId,
  email: r.user.email,
  ucid: r.user.ucid,
  tier: r.tier,
  tin: r.tin,
  biz: r.businessRegNumber,
  pep: r.isPepMatch,
  faydaA: r.faydaVerificationAttempted,
  faydaS: r.faydaVerificationSucceeded,
  dup: false,
  name: r.fullName ?? "",
  doc: r.documentNumber ?? "—",
  status: r.status,
  updated: r.updatedAt,
  docs: r.documents.map((d) => ({ t: d.documentType, k: KYCDOC[d.documentType] ?? "id-front" })),
  history: [],
});

const toDispute = (r: RawDisputeItem): DisputeItem => {
  const ms = r.contract?.milestones ?? [];
  return {
    id: r.id,
    cat: r.category,
    stage: r.stage,
    job: r.contract?.job.title ?? "—",
    clientId: r.contract?.client.id ?? "—",
    scope: r.description,
    ms: ms.map((m) => m.title).join(", ") || "—",
    amt: ms.reduce((s, m) => s + m.amountMinor, 0),
    hasDel: ms.some((m) => Boolean(m.deliverableUrl)),
    slaH: hoursUntil(r.mediationDeadlineAt),
    created: r.createdAt,
    ev: r.evidence.map((e) => ({
      side: e.submittedByUserId === r.contract?.freelancer.id ? ("freelancer" as const) : ("client" as const),
      s: e.statement,
      at: e.createdAt,
    })),
  };
};

const toProfileReport = (r: RawProfileReportPage["data"][number]): ProfileReport => ({
  id: r.id,
  reported: r.reportedUser.displayName ?? r.reportedUser.ucid,
  reporter: "—",
  reason: r.reason as ProfileReport["reason"],
  details: r.details ?? "",
  created: r.createdAt,
  status: reportStatus(r.status),
});

const toHealth = (h: RawSystemHealth): HealthState => ({
  checks: Object.fromEntries(
    Object.entries(h.checks).map(([k, v]) => [
      k,
      { ok: v.ok, d: v.ok ? "OK" : v.detail ?? "Unavailable" },
    ]),
  ),
  ledger: {
    dr: h.ledger.debitsMinor,
    cr: h.ledger.creditsMinor,
    bal: h.ledger.isBalanced,
  },
  checkedAt: h.checkedAt,
});

const EMPTY_HEALTH: HealthState = {
  checks: {},
  ledger: { dr: 0, cr: 0, bal: true },
  checkedAt: new Date(0).toISOString(),
};

/* ── aggregates ───────────────────────────────────────────────────────── */
async function loadOverview(): Promise<OverviewBundle> {
  const [dash, health, payments, payouts, escrows, recon, kyc, disputes, reports, flags] =
    await Promise.all([
      soft(rDashboard(), null),
      soft(rHealth(), null),
      soft(rPayments(), { items: [] as RawPayment[] }),
      soft(rPayouts(), { items: [] as RawPayout[] }),
      soft(rEscrows(), { items: [] as RawEscrow[] }),
      soft(rRecon(), { items: [] as RawReconRow[] }),
      soft(rKyc(), { items: [] as RawKycItem[] }),
      soft(rDisputes(), { items: [] as RawDisputeItem[] }),
      soft(rProfileReports(), null),
      soft(rFlags(), { items: [] as RawRiskFlag[] }),
    ]);

  if (!dash) throw new OpsApiError(403, "admin/dashboard/summary");

  const d14 = lastNDays(14);
  const w8 = lastNWeeks(8);

  return {
    metrics: dash.metrics,
    activity: (dash.recentActivity ?? []).map(toActivity),
    health: health ? toHealth(health) : EMPTY_HEALTH,
    escrows: escrows.items.map(toEscrow),
    recon: recon.items.map(toRecon),
    riskFlags: flags.items.map((f) => ({
      id: f.id,
      type: f.type,
      status: flagStatus(f.status),
      created: f.createdAt,
    })),
    queues: {
      kyc: kyc.items.map(toKyc),
      disputes: disputes.items.map(toDispute),
      reports: (reports?.data ?? []).map(toProfileReport),
      payouts: payouts.items.map(toPayout),
    },
    series: {
      volume14: {
        labels: d14.map((d) => d.slice(5)),
        values: bucketPayments(payments.items, d14, "day"),
      },
      payoutsWeekly: {
        labels: w8.map((d) => d.slice(5)),
        payouts: bucketPayouts(payouts.items, w8),
        refunds: bucketRefunds(escrows.items, w8),
      },
      sparks: {},
    },
  };
}

async function loadBadges(): Promise<OpsBadges> {
  const dash = await rDashboard();
  const m = dash.metrics;
  const [flags, reports, tickets] = await Promise.all([
    soft(rFlags(), { items: [] as RawRiskFlag[] }),
    soft(rProfileReports(), null),
    soft(rConversations("OPEN"), { items: [], total: 0, page: 1, pageSize: 0 }),
  ]);
  return {
    payouts: m.pendingPayouts,
    kyc: m.pendingIdentity,
    disputes: m.openDisputes,
    reports: (reports?.data ?? []).filter((r) => reportStatus(r.status) === "OPEN").length,
    risk: flags.items.filter((f) => flagStatus(f.status) === "OPEN").length,
    recon: m.pendingPayments,
    monitoring: 0,
    tickets: tickets.total,
    receipts: m.pendingTopUps,
  };
}

async function loadReports(): Promise<ReportsBundle> {
  const raw = await rReportsSummary();
  const [payments, contracts] = await Promise.all([
    soft(rPayments(), { items: [] as RawPayment[] }),
    soft(rContracts(), { items: [] as RawContractRow[] }),
  ]);

  const w12 = lastNWeeks(12);
  const m6 = lastNMonths(6);

  const telebirr = new Array<number>(m6.length).fill(0);
  const cbe = new Array<number>(m6.length).fill(0);
  const mIdx = new Map(m6.map((k, i) => [k, i]));
  for (const p of payments.items) {
    if (p.status !== "SUCCESS") continue;
    const i = mIdx.get(p.createdAt.slice(0, 7));
    if (i === undefined) continue;
    // M_PESA is grouped with CBE Birr: the console charts two rails only.
    if (p.provider === "TELEBIRR") telebirr[i] += p.amountMinor;
    else cbe[i] += p.amountMinor;
  }

  const byCat = new Map<string, number>();
  for (const c of contracts.items) {
    if (c.status !== "COMPLETED") continue;
    byCat.set(c.job.category, (byCat.get(c.job.category) ?? 0) + 1);
  }
  const palette = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0284c7"];
  const categoryDone = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value], i) => ({
      label: label.replace(/_/g, " "),
      value,
      color: palette[i % palette.length],
    }));

  const f = raw.financial;
  const mk = raw.marketplace;

  return {
    financial: {
      vol: f.transactionVolumeMinor,
      released: f.releasedFundsMinor,
      refunded: f.refundedFundsMinor,
      payouts: f.payoutsMinor,
      fees: f.platformFeesMinor,
      wh: f.withholdingMinor,
      failPay: f.failedPaymentCount,
      failPo: f.failedPayoutCount,
    },
    marketplace: {
      clients: mk.clientCount,
      freelancers: mk.freelancerCount,
      totalContracts: mk.totalContracts,
      byStatus: mk.contractsByStatus ?? {},
      disputes: mk.openDisputes,
      flags: mk.openRiskFlags,
    },
    series: {
      volume12: {
        labels: w12.map((d) => d.slice(5)),
        values: bucketPayments(payments.items, w12, "week"),
      },
      railMonthly: {
        labels: m6.map((m) => m.slice(2)),
        telebirr: telebirr.map(toMillions),
        cbe: cbe.map(toMillions),
      },
      categoryDone,
    },
  };
}

async function loadLedger(): Promise<LedgerBundle> {
  const [summary, journals] = await Promise.all([
    rLedger(),
    soft(rJournals(), { items: [] as RawJournal[] }),
  ]);
  return {
    accounts: (summary.accounts ?? []).map((a) => ({
      code: a.code,
      name: a.name,
      type: a.type,
      bal: a.balanceMinor,
      c: ACCOUNT_COLOR[a.type],
    })),
    journal: journals.items.map((j) => ({
      id: j.id,
      desc: j.description,
      ref: j.referenceType,
      dr: j.totalDebitsMinor,
      cr: j.totalCreditsMinor,
      posted: j.postedAt,
    })),
    integrity: {
      dr: summary.integrity?.totalDebitsMinor ?? 0,
      cr: summary.integrity?.totalCreditsMinor ?? 0,
      bal: summary.integrity?.isBalanced ?? true,
      entries: summary.integrity?.totalEntries ?? 0,
      journals: summary.journalCount ?? 0,
    },
  };
}

/* ── service ──────────────────────────────────────────────────────────── */

/** Default rejection text used when a reviewer asks for a clearer photo. */
export const KYC_CLEARER_REASON =
  "Photo is unclear, blurry, or cropped. Please re-upload a clear image.";

export const opsApi = {
  overview: () => loadOverview(),
  badges: () => loadBadges(),
  activity: async () => {
    const dash = await soft(rDashboard(), null);
    return (dash?.recentActivity ?? []).map(toActivity);
  },
  health: async () => toHealth(await rHealth()),

  contracts: async () => (await rContracts()).items.map(toContract),
  contractDetail: (id: string) => api.adminGetContract(id) as Promise<RawContractDetail>,

  payments: async () => (await rPayments()).items.map(toPayment),
  payouts: async () => (await rPayouts()).items.map(toPayout),
  settlePayout: (id: string, body: { outcome: "CONFIRMED" | "FAILED"; ref?: string; reason?: string }) =>
    api.adminSettlePayout(id, {
      decision: body.outcome,
      providerPayoutId: body.ref,
      failureReason: body.reason,
    }),

  escrows: async () => (await rEscrows()).items.map(toEscrow),
  reconciliation: async () => (await rRecon()).items.map(toRecon),
  ledger: () => loadLedger(),

  users: async () => (await rUsers()).items.map(toUser),
  userDetail: (id: string) => api.adminGetUser(id) as Promise<RawUserSummary>,

  staff: async () =>
    (await rStaff()).items.map(
      (r): StaffMember => ({
        id: r.id,
        email: r.email,
        ucid: r.ucid,
        userRole: r.role,
        staffRole: r.staffRole,
        suspended: r.isSuspended,
      }),
    ),
  /** `null` demotes the account back to a regular user. */
  setStaffRole: (id: string, role: StaffRole | null) => api.setStaffRole(id, role),

  reports: () => loadReports(),
  riskFlags: async () =>
    (await rFlags()).items.map((f) => ({
      id: f.id,
      type: f.type,
      status: flagStatus(f.status),
      created: f.createdAt,
    })),

  kycQueue: async () => (await rKyc()).items.map(toKyc),
  kycHistory: (userId: string) => api.getKycReviewHistory(userId),
  kycDocumentUrl: (documentId: string) => api.getKycDocumentUrl(documentId),
  /**
   * The backend accepts VERIFIED | REJECTED only. "CLEARER" (ask the user for
   * a better photo) has no route of its own, so it resolves as a REJECTED
   * carrying a re-upload reason — the same behaviour as the queue it replaces.
   */
  kycDecide: (userId: string, decision: KycDecision, reason?: string) =>
    api.reviewKyc(
      userId,
      decision === "VERIFIED" ? "VERIFIED" : "REJECTED",
      decision === "VERIFIED" ? undefined : reason ?? KYC_CLEARER_REASON,
    ),

  disputes: async () => (await rDisputes()).items.map(toDispute),
  resolveDispute: (
    id: string,
    body: { outcome: DisputeOutcome; split?: number; recommendation: string },
  ) =>
    api.resolveDispute(id, {
      outcome: body.outcome,
      recommendation: body.recommendation,
      freelancerShareMinor: body.split,
    }),

  profileReports: async () => (await rProfileReports()).data.map(toProfileReport),
  resolveProfileReport: (id: string, action: ReportResolution, notes: string) =>
    api.resolveProfileReport(id, action, notes),

  /* ── surfaces carried over from the dashboard this console replaces ── */
  auditLogs: () => rAudit(),
  permissionMatrix: () => rMatrix(),
  reviewTopUp: (id: string, decision: "APPROVED" | "REJECTED", reason?: string) =>
    api.reviewTopUp(id, decision, reason),
  flagTopUp: (id: string, reason: string) => api.flagTopUpSuspicious(id, reason),
  topUpReceiptUrl: (id: string) => api.getTopUpReceiptUrl(id),
  topUpQueue: (status = "PENDING") => rTopUps(status).then((r) => r.items),

  conversations: (status: "OPEN" | "ALL") => rConversations(status),
  chatMessages: (id: string) => api.getChatMessages(id) as Promise<RawChatMessage[]>,
  sendChatMessage: (id: string, body: string, attachmentUrl?: string) =>
    api.sendChatMessage(id, body, attachmentUrl),
  uploadChatAttachment: (file: File) => api.uploadChatAttachment(file),
  setConversationStatus: (id: string, status: "OPEN" | "CLOSED") =>
    api.setConversationStatus(id, status),
  refreshFeaturedCarousel: () => api.refreshFeaturedCarousel(),
};

/* ── tiny data hook ───────────────────────────────────────────────────── */
export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

interface InternalState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useApi<T>(fetcher: (s: AbortSignal) => Promise<T>): ApiState<T> {
  const [state, setState] = useState<InternalState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  /* `fetcher` is a fresh closure on every render, so it is kept in a ref and
     synced in an effect rather than used as an effect dependency — otherwise
     every render would retrigger the request. */
  const fnRef = useRef(fetcher);
  useEffect(() => {
    fnRef.current = fetcher;
  }, [fetcher]);

  const ctrlRef = useRef<AbortController | null>(null);

  /** Issues the request; only ever calls setState asynchronously. */
  const run = useCallback((ctrl: AbortController) => {
    fnRef.current(ctrl.signal)
      .then((data) => {
        if (!ctrl.signal.aborted) setState({ data, error: null, loading: false });
      })
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) {
          setState((prev) => ({
            ...prev,
            error: e instanceof Error ? e.message : String(e),
            loading: false,
          }));
        }
      });
  }, []);

  const reload = useCallback(() => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    run(ctrl);
  }, [run]);

  useEffect(() => {
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    run(ctrl);
    return () => ctrl.abort();
  }, [run]);

  return { ...state, reload };
}

/* ── formatting helpers (minor units → ETB) ──────────────────────────── */
export const fmt = (v: number) => `ETB ${(v / 100).toLocaleString()}`;
export const fmt2 = (v: number) => `ETB ${(v / 100).toFixed(2)}`;
export const fmtE = (v: number) => {
  const e = v / 100;
  return e >= 1e6
    ? `${(e / 1e6).toFixed(1)}M`
    : e >= 1e3
      ? `${(e / 1e3).toFixed(0)}K`
      : e.toFixed(0);
};
export const dt = (s: string) =>
  new Date(s).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const dts = (s: string) =>
  new Date(s).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });