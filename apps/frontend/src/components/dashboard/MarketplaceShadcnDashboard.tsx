import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ShieldCheck,
  Briefcase,
  CheckCircle2,
  ArrowUpRight,
  Plus,
  Search,
  Table2,
  Kanban,
  Calendar,
  BarChart3,
  ChevronDown,
  ArrowRight,
  RefreshCw,
  Clock,
  AlertCircle,
  FileSignature,
  MessageCircle,
} from "lucide-react";
import type {
  Contract,
  EscrowFeeConfig,
  Job,
  Milestone,
  TopUpRequest,
  WalletResponse,
} from "../../api/client";
import type {
  KanbanColumnId,
  KanbanTask,
  LedgerContractRecord,
  PaymentRail,
  ScheduleEvent,
  TimeRangeKey,
} from "./dashboardData";
import { FUNDED_ESCROW_STATES, getTodayAddisIso } from "./dashboardData";
import {
  briefsCreatedSince,
  escrowFundedTotals,
  onTimeStats,
  periodChange,
  topUpTotals,
} from "./dashboardAnalytics";
import { useShadcnLayout } from "./ShadcnLayoutContext";
import { FeaturedCarousel } from "../../FeaturedCarousel";
import { useI18n } from "../../i18n";
import { DASHBOARD_COPY } from "./dashboardCopy";
import { ConfirmActionModal, formatStatusLabel } from "../../pages/ops/components/ui";
import { FirstRunChecklist } from "./FirstRunChecklist";
import { DASHBOARD_EXTRAS_COPY, type DashboardExtrasCopy } from "./dashboardExtrasCopy";
import {
  GETTING_STARTED_CHANGED_EVENT,
  getShowGettingStartedGuide,
  setShowGettingStartedGuide,
} from "../../lib/onboardingGuidePref";

const LazyCashflowAreaChart = lazy(() =>
  import("./ShadcnCharts").then((m) => ({ default: m.InteractiveCashflowAreaChart })),
);
const LazyRailVelocityBarChart = lazy(() =>
  import("./ShadcnCharts").then((m) => ({ default: m.InteractiveRailVelocityBarChart })),
);
const LazyAdvancedDataTable = lazy(() =>
  import("./AdvancedDataTable").then((m) => ({ default: m.AdvancedDataTable })),
);
const LazyKanbanBoardView = lazy(() =>
  import("./KanbanBoardView").then((m) => ({ default: m.KanbanBoardView })),
);
const LazyCalendarScheduleView = lazy(() =>
  import("./CalendarScheduleView").then((m) => ({ default: m.CalendarScheduleView })),
);

interface MarketplaceShadcnDashboardProps {
  userId?: string;
  kycVerified?: boolean;
  kycStatus?: string;
  proposalsCount?: number;
  unreadMessagesCount?: number;
  lastUpdatedAt?: Date | null;
  workspaceError?: string | null;
  canHire: boolean;
  canWork: boolean;
  viewerRole?: "CLIENT" | "FREELANCER" | "ADMIN";
  wallet: WalletResponse;
  /** Open marketplace briefs — what a freelancer competes for. */
  jobs: Job[];
  /** The caller's own posted jobs — what a client is hiring for. */
  myJobs?: Job[];
  contracts?: Contract[];
  milestones: Milestone[];
  topUps: TopUpRequest[];
  feeConfig?: EscrowFeeConfig | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onNavigateView: (view: string) => void;
  onOpenEscrow?: (milestoneId?: string) => void;
  onOpenContract?: (contractId?: string) => void;
  onFundMilestone?: (milestoneId: string) => Promise<void> | void;
  onSelectProfile?: (userId: string) => void;
  onOpenChat?: (userId: string, userName?: string) => void;
}

/** The window the KPI trend cards compare against. */
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function toKanbanCol(state: string): KanbanColumnId {
  if (state === "ESCROW_HELD") return "ESCROW_HELD";
  if (state === "WORK_IN_PROGRESS") return "WORK_IN_PROGRESS";
  if (state === "SUBMITTED_FOR_REVIEW" || state === "ACCEPTED")
    return "SUBMITTED_FOR_REVIEW";
  if (state === "RELEASED") return "RELEASED";
  if (state === "DISPUTED" || state === "REFUNDED" || state === "PARTIAL_REFUND")
    return "DISPUTED_REFUNDED";
  return "BACKLOG";
}

function formatAutoReleaseHint(
  autoReleaseAt: string | null | undefined,
  extra: DashboardExtrasCopy,
): string | null {
  if (!autoReleaseAt) return null;
  const targetMs = Date.parse(autoReleaseAt);
  if (!Number.isFinite(targetMs)) return null;
  const diffMs = targetMs - Date.now();
  if (diffMs <= 0) return extra.attentionAutoReleaseSoon;
  const days = Math.ceil(diffMs / 86_400_000);
  if (days <= 1) return extra.attentionAutoReleaseSoon;
  return extra.attentionAutoReleaseCountdown(days);
}

function deriveContractNextStep(
  contract: Contract,
  extra: DashboardExtrasCopy,
): string {
  if (!contract.clientAcceptedAt || !contract.fullyExecuted) {
    return extra.nextStepSignContract;
  }
  const ms = contract.milestones ?? [];
  if (ms.some((m) => m.escrowState === "DISPUTED")) {
    return extra.nextStepResolveDispute;
  }
  if (ms.some((m) => m.escrowState === "SUBMITTED_FOR_REVIEW")) {
    return extra.nextStepReviewDelivery;
  }
  if (ms.some((m) => m.escrowState === "PAYMENT_PENDING")) {
    return extra.nextStepFundMilestone;
  }
  if (
    ms.some(
      (m) =>
        m.escrowState === "ESCROW_HELD" || m.escrowState === "WORK_IN_PROGRESS",
    )
  ) {
    return extra.nextStepWorkInProgress;
  }
  return extra.nextStepCompleted;
}

/**
 * The escrow state as the ledger shows it.
 *
 * Every state the platform can store is passed through unchanged. Previously
 * only six of them were, so a refunded milestone was displayed as "Escrow
 * Held" — a row that claimed money was still secured when it had already
 * gone back to the client.
 */
function toLedgerState(
  state: string,
): LedgerContractRecord["escrowState"] {
  if (
    state === "ESCROW_HELD" ||
    state === "WORK_IN_PROGRESS" ||
    state === "SUBMITTED_FOR_REVIEW" ||
    state === "ACCEPTED" ||
    state === "RELEASED" ||
    state === "PAYMENT_PENDING" ||
    state === "DISPUTED" ||
    state === "REFUNDED" ||
    state === "PARTIAL_REFUND"
  ) {
    return state;
  }
  return "ESCROW_HELD";
}

export function MarketplaceShadcnDashboard({
  userId,
  kycVerified = true,
  kycStatus = "VERIFIED",
  proposalsCount = 0,
  unreadMessagesCount = 0,
  lastUpdatedAt = null,
  workspaceError = null,
  canHire,
  canWork,
  viewerRole: explicitViewerRole,
  wallet,
  jobs,
  myJobs,
  contracts = [],
  milestones,
  topUps,
  feeConfig,
  isRefreshing,
  onRefresh,
  onNavigateView,
  onOpenEscrow,
  onOpenContract,
  onFundMilestone,
  onSelectProfile,
  onOpenChat,
}: MarketplaceShadcnDashboardProps) {
  const {
    dashboardVariant,
    setDashboardVariant,
    opsSubTab,
    setOpsSubTab,
    setCommandPaletteOpen,
  } = useShadcnLayout();
  const { t, language } = useI18n();
  const copy = (DASHBOARD_COPY[language] ?? DASHBOARD_COPY.en).overview;
  const extra = DASHBOARD_EXTRAS_COPY[language] ?? DASHBOARD_EXTRAS_COPY.en;
  const d = t.workspace.dashboard;
  const viewerRole = explicitViewerRole ?? (canWork ? "FREELANCER" : "CLIENT");

  const [timeRange, setTimeRange] = useState<TimeRangeKey>("30d");
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [expandedKpi, setExpandedKpi] = useState<
    "wallet" | "escrow" | "milestones" | "jobs" | null
  >(null);
  const [fundTarget, setFundTarget] = useState<{
    id: string;
    title: string;
    counterparty: string;
    amountMinor: number;
    clientFeeMinor: number;
    clientTotalChargeMinor: number;
  } | null>(null);
  const [fundLoading, setFundLoading] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(() =>
    getShowGettingStartedGuide(userId),
  );

  useEffect(() => {
    setShowGettingStarted(getShowGettingStartedGuide(userId));
    const onSync = () => setShowGettingStarted(getShowGettingStartedGuide(userId));
    window.addEventListener(GETTING_STARTED_CHANGED_EVENT, onSync);
    return () => window.removeEventListener(GETTING_STARTED_CHANGED_EVENT, onSync);
  }, [userId]);

  const effectiveWallet = wallet;
  const effectiveMilestones = milestones;
  const effectiveTopUps = topUps;

  const pendingTopUps = useMemo(
    () =>
      effectiveTopUps.filter(
        (t) => t.status === "PENDING" || t.status === "CHECKOUT_PENDING",
      ),
    [effectiveTopUps],
  );
  const pendingTopUpTotalMinor = useMemo(
    () => pendingTopUps.reduce((sum, t) => sum + t.amountMinor, 0),
    [pendingTopUps],
  );
  const hasApprovedTopUp = useMemo(
    () => effectiveTopUps.some((t) => t.status === "APPROVED"),
    [effectiveTopUps],
  );
  const hasSettledOrApprovedActivity = useMemo(
    () =>
      effectiveMilestones.some((m) => m.escrowState === "RELEASED") ||
      hasApprovedTopUp,
    [effectiveMilestones, hasApprovedTopUp],
  );
  const hasFundedMilestone = useMemo(
    () => effectiveMilestones.some((m) => FUNDED_ESCROW_STATES.has(m.escrowState)),
    [effectiveMilestones],
  );
  const hasClientActivity = useMemo(
    () =>
      (myJobs?.length ?? 0) > 0 ||
      contracts.length > 0 ||
      effectiveMilestones.length > 0 ||
      hasApprovedTopUp,
    [contracts.length, effectiveMilestones.length, hasApprovedTopUp, myJobs],
  );
  const isZeroStateClientHome = viewerRole === "CLIENT" && !hasClientActivity;
  const isFirstRunClient =
    viewerRole === "CLIENT" && !hasFundedMilestone && showGettingStarted;

  const isApplePlatform =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
  const shortcutLabel = isApplePlatform ? "⌘K" : "Ctrl+K";

  const todayAddisIso = useMemo(() => getTodayAddisIso(), []);

  /**
   * The facts the ledger, kanban and schedule need for one milestone.
   *
   * Every value comes from the milestone payload the API returns for the
   * signed-in account. Nothing is looked up in a fixture table and nothing is
   * derived from the row's position in a list, so a row can only ever show
   * the contract, the counterparty and the rail that actually belong to it.
   */
  const metaFor = (m: Milestone) => {
    const funded = FUNDED_ESCROW_STATES.has(m.escrowState);
    const rail: PaymentRail = m.paymentRail
      ? (m.paymentRail as PaymentRail)
      : funded
        ? "INTERNAL_WALLET"
        : "UNFUNDED";
    const counterparty =
      m.counterparty?.name?.trim() || m.counterparty?.email || "Unknown counterparty";
    const client =
      m.contract?.clientName?.trim() ||
      (m.counterparty?.role === "CLIENT" ? counterparty : "Account Client");
    const freelancer =
      m.contract?.freelancerName?.trim() ||
      (m.counterparty?.role === "FREELANCER" ? counterparty : "Account Freelancer");
    return {
      contractTitle: m.contract?.title?.trim() || `Contract ${m.contractId.slice(0, 8)}`,
      counterparty,
      counterpartyEmail: m.counterparty?.email ?? "",
      client,
      freelancer,
      category:
        m.contract?.category?.replaceAll("_", " ").toLowerCase() || "Uncategorised",
      rail,
    };
  };

  type ClientAttentionItem = {
    id: string;
    priority: number;
    title: string;
    subtitle: string;
    reason: string;
    tone: "amber" | "crimson" | "emerald" | "blue";
    kind: "PROPOSALS" | "SIGN" | "FUND" | "REVIEW" | "OVERDUE" | "MESSAGE" | "DELIVER";
    amountMinor?: number;
    clientFeeMinor?: number;
    clientTotalChargeMinor?: number;
    contractId?: string;
    countdown?: string | null;
    actionLabel: string;
  };

  const attentionItems = useMemo<ClientAttentionItem[]>(() => {
    if (viewerRole === "CLIENT") {
      const items: ClientAttentionItem[] = [];
      const jobsWithProposals = (myJobs ?? []).filter((j) => (j.proposalsCount ?? 0) > 0);
      if (jobsWithProposals.length > 0) {
        const totalProps = jobsWithProposals.reduce(
          (sum, j) => sum + (j.proposalsCount ?? 0),
          0,
        );
        items.push({
          id: "att-proposals",
          priority: 1,
          title:
            jobsWithProposals.length === 1
              ? jobsWithProposals[0].title
              : extra.openJobsTitle,
          subtitle: extra.openJobsDesc,
          reason: extra.attentionProposalsReason(totalProps),
          tone: "amber",
          kind: "PROPOSALS",
          actionLabel: extra.attentionReviewProposalsAction,
        });
      }

      for (const c of contracts) {
        if (c.status !== "CANCELLED" && !c.clientAcceptedAt) {
          const freelancerName =
            c.freelancer?.displayName?.trim() ||
            `${c.freelancer?.firstName ?? ""} ${c.freelancer?.lastName ?? ""}`.trim() ||
            c.freelancer?.email ||
            "Freelancer";
          items.push({
            id: `att-sign-${c.id}`,
            priority: 2,
            title: c.job?.title || `Contract #${c.id.slice(0, 8)}`,
            subtitle: freelancerName,
            reason: extra.attentionContractSignReason,
            tone: "amber",
            kind: "SIGN",
            contractId: c.id,
            actionLabel: extra.attentionSignContractAction,
          });
        }
      }

      for (const m of effectiveMilestones) {
        const meta = metaFor(m);
        const dueStr = (m.dueDate || "").slice(0, 10);
        const overdue =
          Boolean(dueStr) &&
          dueStr < todayAddisIso &&
          m.escrowState !== "RELEASED" &&
          m.escrowState !== "REFUNDED";

        if (m.escrowState === "PAYMENT_PENDING" && m.contract?.fullyExecuted !== false) {
          items.push({
            id: m.id,
            priority: 3,
            title: m.title,
            subtitle: meta.counterparty,
            reason: overdue
              ? extra.attentionOverdueFundingReason
              : extra.attentionFundingReason,
            tone: overdue ? "crimson" : "amber",
            kind: "FUND",
            amountMinor: m.amountMinor,
            clientFeeMinor: m.clientFeeMinor ?? 0,
            clientTotalChargeMinor: m.clientTotalChargeMinor ?? m.amountMinor,
            actionLabel: extra.attentionFundAction,
          });
        } else if (m.escrowState === "SUBMITTED_FOR_REVIEW") {
          items.push({
            id: m.id,
            priority: 4,
            title: m.title,
            subtitle: meta.counterparty,
            reason: extra.attentionSubmittedReason,
            tone: "emerald",
            kind: "REVIEW",
            amountMinor: m.amountMinor,
            clientFeeMinor: m.clientFeeMinor ?? 0,
            clientTotalChargeMinor: m.clientTotalChargeMinor ?? m.amountMinor,
            countdown: formatAutoReleaseHint(m.autoReleaseAt, extra),
            actionLabel: extra.attentionReviewAction,
          });
        } else if (overdue) {
          items.push({
            id: m.id,
            priority: 5,
            title: m.title,
            subtitle: meta.counterparty,
            reason: extra.attentionOverdueReason(dueStr),
            tone: "crimson",
            kind: "OVERDUE",
            amountMinor: m.amountMinor,
            actionLabel: extra.attentionInspectAction,
          });
        }
      }

      if (unreadMessagesCount > 0) {
        items.push({
          id: "att-messages",
          priority: 6,
          title: extra.attentionUnreadMessagesTitle,
          subtitle: extra.attentionUnreadMessagesReason(unreadMessagesCount),
          reason: extra.attentionUnreadMessagesReason(unreadMessagesCount),
          tone: "blue",
          kind: "MESSAGE",
          actionLabel: extra.attentionOpenMessagesAction,
        });
      }

      return items.sort((a, b) => a.priority - b.priority).slice(0, 6);
    }

    return effectiveMilestones
      .map<ClientAttentionItem | null>((m) => {
        const meta = metaFor(m);
        const dueStr = (m.dueDate || "").slice(0, 10);
        const overdue =
          Boolean(dueStr) &&
          dueStr < todayAddisIso &&
          m.escrowState !== "RELEASED" &&
          m.escrowState !== "REFUNDED";

        if (
          m.escrowState === "ESCROW_HELD" ||
          m.escrowState === "WORK_IN_PROGRESS"
        ) {
          return {
            id: m.id,
            priority: overdue ? 1 : 2,
            title: m.title,
            subtitle: meta.counterparty,
            reason: overdue
              ? extra.attentionOverdueDeliveryReason(dueStr)
              : extra.attentionDeliveryReadyReason,
            tone: overdue ? "crimson" : "emerald",
            kind: "DELIVER",
            amountMinor: m.amountMinor,
            actionLabel: extra.attentionDeliverAction,
          };
        }
        return null;
      })
      .filter((x): x is ClientAttentionItem => x !== null)
      .slice(0, 4);
  }, [
    contracts,
    effectiveMilestones,
    extra,
    myJobs,
    todayAddisIso,
    unreadMessagesCount,
    viewerRole,
  ]);

  /**
   * A client is hiring against their own briefs; a freelancer is competing
   * for the open marketplace. Showing one account the other's briefs under a
   * headline that says "your hiring briefs" is how the workspace ended up
   * presenting another account's work as the caller's own.
   */
  const effectiveJobs = useMemo(
    () => (canWork ? jobs : (myJobs ?? [])),
    [canWork, jobs, myJobs],
  );
  const briefScope = canWork ? "marketplace" : "own";

  const ledgerRecords = useMemo<LedgerContractRecord[]>(
    () =>
      effectiveMilestones.map((m, idx) => {
        const meta = metaFor(m);
        const platformFeeMinor = m.platformFeeMinor ?? 0;
        const providerFeeMinor = m.providerFeeMinor ?? 0;
        const clientFeeMinor = m.clientFeeMinor ?? 0;
        const clientTotalChargeMinor = m.clientTotalChargeMinor ?? m.amountMinor + clientFeeMinor;
        const netPayoutMinor =
          m.netPayoutMinor ?? Math.max(0, m.amountMinor - platformFeeMinor - providerFeeMinor);
        return {
          id: m.id,
          contractId: m.contractId,
          code: `MS-${m.id.replace(/^ms-/, "") || 200 + idx}`,
          title: m.title,
          contractTitle: meta.contractTitle,
          counterparty: meta.counterparty,
          counterpartyEmail: meta.counterpartyEmail,
          category: meta.category,
          rail: meta.rail,
          escrowState: toLedgerState(m.escrowState),
          amountMinor: m.amountMinor,
          platformFeeMinor,
          providerFeeMinor,
          clientFeeMinor,
          clientTotalChargeMinor,
          netPayoutMinor,
          dueDate: (m.dueDate || "").slice(0, 10),
          updatedAt: (m.releasedAt || m.submittedAt || m.dueDate || "").slice(0, 10),
          contractFullyExecuted: m.contract?.fullyExecuted,
        };
      }),
    [effectiveMilestones],
  );

  const kanbanTasks = useMemo<KanbanTask[]>(
    () =>
      effectiveMilestones.map((m, idx) => {
        const meta = metaFor(m);
        const state = m.escrowState;
        const platformFeeMinor = m.platformFeeMinor ?? 0;
        const providerFeeMinor = m.providerFeeMinor ?? 0;
        const clientFeeMinor = m.clientFeeMinor ?? 0;
        const clientTotalChargeMinor = m.clientTotalChargeMinor ?? m.amountMinor + clientFeeMinor;
        const netPayoutMinor =
          m.netPayoutMinor ?? Math.max(0, m.amountMinor - platformFeeMinor - providerFeeMinor);
        return {
          id: m.id,
          code: `MS-${m.id.replace(/^ms-/, "") || 200 + idx}`,
          title: m.title,
          contractId: m.contractId,
          contractTitle: meta.contractTitle,
          counterparty: meta.counterparty,
          client: meta.client,
          freelancer: meta.freelancer,
          rail: meta.rail,
          amountMinor: m.amountMinor,
          platformFeeMinor,
          providerFeeMinor,
          clientFeeMinor,
          clientTotalChargeMinor,
          netPayoutMinor,
          dueDate: (m.dueDate || "").slice(0, 10),
          priority: m.amountMinor >= 5_000_000 ? "HIGH" : m.amountMinor >= 3_500_000 ? "MEDIUM" : "LOW",
          column: toKanbanCol(state),
          category: meta.category,
          escrowState: state,
          contractFullyExecuted: m.contract?.fullyExecuted,
          deliverableUrl: m.deliverableUrl ?? null,
          submittedAt: m.submittedAt ?? null,
          autoReleaseAt: m.autoReleaseAt ?? null,
          releasedAt: m.releasedAt ?? null,
          fundedAt: m.fundedAt ?? null,
        };
      }),
    [effectiveMilestones],
  );

  const scheduleEvents = useMemo<ScheduleEvent[]>(() => {
    const milestoneEvents: ScheduleEvent[] = effectiveMilestones.map((m) => {
      const meta = metaFor(m);
      const due = m.dueDate ? new Date(m.dueDate) : null;
      const dueTime =
        due && !Number.isNaN(due.getTime())
          ? due.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Africa/Addis_Ababa",
            })
          : "";
      return {
        id: `ms-${m.id}`,
        milestoneId: m.id,
        contractId: m.contractId,
        title: m.title,
        contractRef: `${meta.contractTitle} · ${m.id.replace(/^ms-/, "").toUpperCase()}`,
        date: (m.dueDate || new Date().toISOString()).slice(0, 10),
        time: dueTime,
        type:
          m.escrowState === "RELEASED"
            ? "PAYOUT_RELEASE"
            : m.escrowState === "DISPUTED"
              ? "COMPLIANCE_KYC"
              : "MILESTONE_DUE",
        amountMinor: m.amountMinor,
        rail: meta.rail,
        status:
          m.escrowState === "RELEASED"
            ? "COMPLETED"
            : m.escrowState === "DISPUTED"
              ? "AT_RISK"
              : "SCHEDULED",
        counterparty: meta.counterparty,
      };
    });
    const jobEvents: ScheduleEvent[] = effectiveJobs.slice(0, 10).map((j) => {
      const deadline = j.deadline ? new Date(j.deadline) : null;
      const deadlineTime =
        deadline && !Number.isNaN(deadline.getTime())
          ? deadline.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Africa/Addis_Ababa",
            })
          : "";
      return {
        id: `job-${j.id}`,
        title: j.title,
        contractRef: j.id,
        date: (j.deadline || new Date().toISOString()).slice(0, 10),
        time: deadlineTime,
        type: "PROPOSAL_DEADLINE",
        amountMinor: j.budgetMaxMinor,
        // A brief is not a payment: there is no rail until a contract is
        // funded, so the schedule says so instead of picking one.
        rail: null,
        status: j.status === "OPEN" ? "SCHEDULED" : "COMPLETED",
        counterparty: j.category.replaceAll("_", " "),
      };
    });
    return [...milestoneEvents, ...jobEvents];
  }, [effectiveMilestones, effectiveJobs]);

  // Derived KPI metrics
  const escrowSecuredMinor = useMemo(
    () =>
      effectiveMilestones
        .filter(
          (m) =>
            FUNDED_ESCROW_STATES.has(m.escrowState) &&
            m.escrowState !== "RELEASED" &&
            m.escrowState !== "REFUNDED" &&
            m.escrowState !== "PARTIAL_REFUND",
        )
        .reduce((sum, m) => sum + m.amountMinor, 0),
    [effectiveMilestones],
  );

  const releasedMinor = useMemo(
    () =>
      effectiveMilestones
        .filter((m) => m.escrowState === "RELEASED")
        .reduce((sum, m) => sum + m.amountMinor, 0),
    [effectiveMilestones],
  );

  // Deliverables still in flight: not yet released, refunded or partially
  // refunded. A milestone awaiting funding counts — it is a deliverable the
  // account is committed to.
  const activeMilestoneCount = useMemo(
    () =>
      effectiveMilestones.filter(
        (m) =>
          m.escrowState !== "RELEASED" &&
          m.escrowState !== "REFUNDED" &&
          m.escrowState !== "PARTIAL_REFUND",
      ).length,
    [effectiveMilestones],
  );

  const openJobsCount = useMemo(
    () => effectiveJobs.filter((j) => j.status === "OPEN").length,
    [effectiveJobs],
  );

  /**
   * Real trend figures for the KPI cards.
   *
   * Every one of these used to be a constant ("+18.4%", "+24.2%", "98.2%
   * on-time", "+5 this week"). They are now derived from the account's own
   * records, and they are null — not zero, not a guess — when the account has
   * no history to compare against.
   */
  const walletTrend = useMemo(() => {
    const { current, prior } = topUpTotals(effectiveTopUps, THIRTY_DAYS_MS);
    return {
      current,
      prior,
      change: periodChange(current, prior),
      topUpCount: effectiveTopUps.filter((t) => t.status === "APPROVED").length,
    };
  }, [effectiveTopUps]);

  const escrowTrend = useMemo(() => {
    const { current, prior } = escrowFundedTotals(
      effectiveMilestones,
      THIRTY_DAYS_MS,
    );
    return { current, prior, change: periodChange(current, prior) };
  }, [effectiveMilestones]);

  const deliveryStats = useMemo(
    () => onTimeStats(effectiveMilestones),
    [effectiveMilestones],
  );

  const briefsThisWeek = useMemo(
    () => briefsCreatedSince(effectiveJobs, SEVEN_DAYS_MS),
    [effectiveJobs],
  );

  const contractCount = useMemo(
    () => new Set(effectiveMilestones.map((m) => m.contractId)).size,
    [effectiveMilestones],
  );

  const formatTrend = (change: number | null, suffix = "%") => {
    if (change === null) return null;
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}${suffix}`;
  };

  return (
    <section className="sh-dashboard-wrap">
      {/* Top Sub-Header: Dashboard Mode Switcher + Primary Actions */}
      <div className="sh-subnav-bar">
        <div className="sh-subnav-left">
          <div
            className="sh-segmented"
            role="tablist"
            aria-label={copy.modeAria}
            data-tour="dashboard-mode-switcher"
          >
            <button
              type="button"
              role="tab"
              aria-selected={dashboardVariant === "dashboard-1"}
              className={`sh-seg-btn ${dashboardVariant === "dashboard-1" ? "active" : ""}`}
              onClick={() => setDashboardVariant("dashboard-1")}
            >
              <BarChart3 size={14} />
              <span>{d.tabAnalytics}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={dashboardVariant === "dashboard-2"}
              className={`sh-seg-btn ${dashboardVariant === "dashboard-2" ? "active" : ""}`}
              onClick={() => setDashboardVariant("dashboard-2")}
            >
              <Table2 size={14} />
              <span>{d.tabPipeline}</span>
            </button>
          </div>

          {dashboardVariant === "dashboard-2" && (
            <div className="sh-subtabs-wrap" style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%" }}>
              <div
                className="sh-segmented"
                role="tablist"
                aria-label={copy.opsModeAria}
              >
                <button
                  type="button"
                  className={`sh-seg-btn ${opsSubTab === "table" ? "active" : ""}`}
                  onClick={() => setOpsSubTab("table")}
                >
                  <Table2 size={13} /> {d.subTabTable}
                  {ledgerRecords.length > 0 ? ` (${ledgerRecords.length})` : ""}
                </button>
                <button
                  type="button"
                  className={`sh-seg-btn ${opsSubTab === "kanban" ? "active" : ""}`}
                  onClick={() => setOpsSubTab("kanban")}
                >
                  <Kanban size={13} /> {d.subTabKanban}
                  {kanbanTasks.length > 0 ? ` (${kanbanTasks.length})` : ""}
                </button>
                <button
                  type="button"
                  className={`sh-seg-btn ${opsSubTab === "calendar" ? "active" : ""}`}
                  onClick={() => setOpsSubTab("calendar")}
                >
                  <Calendar size={13} /> {d.subTabCalendar}
                  {scheduleEvents.length > 0 ? ` (${scheduleEvents.length})` : ""}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="sh-subnav-right">
          <button
            type="button"
            className="sh-btn sh-btn-secondary"
            onClick={() => setCommandPaletteOpen(true)}
            title={copy.quickJumpTitle}
            data-tour="dashboard-quick-jump"
          >
            <Search size={14} />
            <span>{d.quickJump}</span>
            <kbd className="sh-kbd">{shortcutLabel}</kbd>
          </button>

          <button
            type="button"
            className="sh-icon-only-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            title={
              lastUpdatedAt
                ? `${extra.updatedAtPrefix} ${lastUpdatedAt.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Africa/Addis_Ababa",
                  })}`
                : copy.refreshTitle
            }
            aria-label={copy.refreshAria}
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "refresh-spin" : undefined}
            />
          </button>
          {lastUpdatedAt && (
            <span className="sh-cell-meta sh-tabular">
              {extra.updatedAtPrefix}{" "}
              {lastUpdatedAt.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Africa/Addis_Ababa",
              })}
            </span>
          )}

          {canHire && !isFirstRunClient && (
            <button
              type="button"
              className="sh-text-action"
              onClick={() => onNavigateView("gigs")}
            >
              {extra.browseGigsBtn}
            </button>
          )}
          {canHire && kycVerified && (
            <button
              type="button"
              className="sh-btn sh-btn-primary"
              onClick={() => onNavigateView("jobs")}
            >
              <Plus size={14} /> {d.postJobBrief}
            </button>
          )}
          {canHire && !kycVerified && (
            <button
              type="button"
              className="sh-btn sh-btn-primary"
              onClick={() => onNavigateView("verification")}
            >
              <ShieldCheck size={14} /> {extra.verifyFirstBtn}
            </button>
          )}
          {!canHire && canWork && (
            <button
              type="button"
              className="sh-btn sh-btn-primary"
              onClick={() => onNavigateView("jobs")}
            >
              <Briefcase size={14} /> {d.browseOpenBriefs}
            </button>
          )}
        </div>
      </div>

      {/* Error Retry Banner */}
      {workspaceError && (
        <div className="sh-pending-banner" role="alert">
          <span style={{ flex: 1, color: "var(--color-error)" }}>
            {workspaceError}
          </span>
          <button
            type="button"
            className="sh-btn sh-btn-secondary sh-btn-compact"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {extra.retryBtn}
          </button>
        </div>
      )}

      {/* Pending Top-Up Verification Notice (shown once here when checklist is not active) */}
      {pendingTopUpTotalMinor > 0 && !isZeroStateClientHome && (
        <div className="sh-pending-banner" role="status" aria-live="polite">
          <Clock size={16} aria-hidden="true" />
          <span style={{ flex: 1 }}>
            <strong>
              {extra.pendingTopUpBanner(
                Math.round(pendingTopUpTotalMinor / 100).toLocaleString(),
                pendingTopUps.length,
              )}
            </strong>
          </span>
          <button
            type="button"
            className="sh-row-action-btn"
            onClick={() => onNavigateView("wallet")}
          >
            {extra.openWalletBtn} <ArrowRight size={12} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* =====================================================================
          DASHBOARD 1: ZERO-STATE CLIENT HOME vs ACTIVE CLIENT / FREELANCER HOME
         ===================================================================== */}
      {dashboardVariant === "dashboard-1" && viewerRole === "CLIENT" && isZeroStateClientHome && (
        <div style={{ display: "grid", gap: 16 }}>
          {showGettingStarted ? (
            <FirstRunChecklist
              kycVerified={kycVerified}
              kycStatus={kycStatus}
              hasBriefs={(myJobs?.length ?? 0) > 0 || proposalsCount > 0 || effectiveMilestones.length > 0}
              hasFundsOrPending={
                effectiveWallet.balanceMinor > 0 ||
                hasApprovedTopUp ||
                escrowSecuredMinor > 0 ||
                releasedMinor > 0
              }
              hasPendingTopUpOnly={
                effectiveWallet.balanceMinor === 0 &&
                !hasApprovedTopUp &&
                pendingTopUpTotalMinor > 0
              }
              pendingTopUpEtb={Math.round(pendingTopUpTotalMinor / 100)}
              hasProposals={proposalsCount > 0 || effectiveMilestones.length > 0}
              hasFundedMilestone={hasFundedMilestone}
              onNavigateView={onNavigateView}
              onOpenEscrow={() =>
                onOpenEscrow ? onOpenEscrow() : onNavigateView("escrow")
              }
              onHideChecklist={() => {
                setShowGettingStarted(false);
                setShowGettingStartedGuide(userId, false);
              }}
            />
          ) : (
            <div className="sh-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span className="sh-cell-meta">{extra.firstRun.subtitle}</span>
              <button
                type="button"
                className="sh-btn sh-btn-secondary"
                onClick={() => {
                  setShowGettingStarted(true);
                  setShowGettingStartedGuide(userId, true);
                }}
              >
                {extra.firstRun.showGuideBtn}
              </button>
            </div>
          )}
          {onSelectProfile && (
            <FeaturedCarousel
              compact
              hideWhenEmpty
              onProfileClick={onSelectProfile}
              onOpenChat={onOpenChat}
              onBrowseGigs={() => onNavigateView("gigs")}
            />
          )}
        </div>
      )}

      {dashboardVariant === "dashboard-1" && viewerRole === "CLIENT" && !isZeroStateClientHome && (
        <>
          {/* 1. Needs your attention (sorted by urgency, 1 button per item) */}
          {attentionItems.length > 0 && (
            <section className="sh-card sh-attention-strip" aria-label={extra.attentionTitle} aria-live="polite">
              <div className="sh-card-header" style={{ marginBottom: 8 }}>
                <div>
                  <h3 className="sh-card-title">{extra.attentionTitle}</h3>
                  <p className="sh-card-desc">{extra.attentionDesc}</p>
                </div>
              </div>
              <div className="sh-compact-list">
                {attentionItems.map((item) => (
                  <div key={item.id} className="sh-compact-row">
                    <div className="sh-compact-row-main">
                      <div className="sh-cell-primary">{item.title}</div>
                      <div className="sh-cell-meta">
                        <span>{item.subtitle}</span>
                        <span aria-hidden="true">·</span>
                        <span className={`sh-status-inline ${item.tone}`}>
                          {item.kind === "SIGN" ? (
                            <FileSignature size={12} aria-hidden="true" />
                          ) : item.kind === "MESSAGE" ? (
                            <MessageCircle size={12} aria-hidden="true" />
                          ) : item.kind === "OVERDUE" ? (
                            <AlertCircle size={12} aria-hidden="true" />
                          ) : (
                            <Clock size={12} aria-hidden="true" />
                          )}{" "}
                          {item.reason}
                        </span>
                        {item.countdown && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="sh-tabular">{item.countdown}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="sh-compact-row-right">
                      {typeof item.amountMinor === "number" && (
                        <strong className="sh-tabular">
                          ETB {(item.amountMinor / 100).toLocaleString()}
                        </strong>
                      )}
                      {item.kind === "FUND" && onFundMilestone ? (
                        <button
                          type="button"
                          className="sh-btn sh-btn-primary sh-btn-compact"
                          onClick={() =>
                            setFundTarget({
                              id: item.id,
                              title: item.title,
                              counterparty: item.subtitle,
                              amountMinor: item.amountMinor ?? 0,
                              clientFeeMinor: item.clientFeeMinor ?? 0,
                              clientTotalChargeMinor:
                                item.clientTotalChargeMinor ?? item.amountMinor ?? 0,
                            })
                          }
                        >
                          {item.actionLabel}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="sh-row-action-btn"
                          onClick={() => {
                            if (item.kind === "PROPOSALS") {
                              onNavigateView("proposals");
                            } else if (item.kind === "SIGN") {
                              if (onOpenContract && item.contractId) {
                                onOpenContract(item.contractId);
                              } else {
                                onNavigateView("contracts");
                              }
                            } else if (item.kind === "MESSAGE") {
                              onNavigateView("chat");
                            } else if (onOpenEscrow) {
                              onOpenEscrow(item.id);
                            } else {
                              onNavigateView("escrow");
                            }
                          }}
                        >
                          {item.actionLabel} <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. Active contracts + 3. Your open jobs */}
          <div className="sh-charts-split">
            {contracts.filter((c) => c.status !== "CANCELLED").length > 0 && (
              <div className="sh-card">
                <div className="sh-card-header">
                  <div>
                    <h3 className="sh-card-title">{extra.activeContractsTitle}</h3>
                    <p className="sh-card-desc">{extra.activeContractsDesc}</p>
                  </div>
                  <button
                    type="button"
                    className="sh-btn sh-btn-secondary"
                    onClick={() => onNavigateView("contracts")}
                  >
                    {extra.viewContractsBtn} <ArrowRight size={13} />
                  </button>
                </div>
                <div className="sh-compact-list">
                  {contracts
                    .filter((c) => c.status !== "CANCELLED")
                    .slice(0, 4)
                    .map((c) => {
                      const totalMs = c.milestones?.length ?? 0;
                      const doneMs = (c.milestones ?? []).filter(
                        (m) => m.escrowState === "RELEASED",
                      ).length;
                      const nextMilestone = (c.milestones ?? []).find(
                        (m) =>
                          m.escrowState !== "RELEASED" &&
                          m.escrowState !== "REFUNDED",
                      );
                      const freelancerName =
                        c.freelancer?.displayName?.trim() ||
                        `${c.freelancer?.firstName ?? ""} ${c.freelancer?.lastName ?? ""}`.trim() ||
                        c.freelancer?.email ||
                        "Freelancer";
                      return (
                        <div key={c.id} className="sh-compact-row">
                          <div className="sh-compact-row-main">
                            <div className="sh-cell-primary">
                              {c.job?.title || `Contract #${c.id.slice(0, 8)}`}
                            </div>
                            <div className="sh-cell-meta">
                              <span>{freelancerName}</span>
                              <span aria-hidden="true">·</span>
                              <span className="sh-tabular">
                                {extra.progressMilestones(doneMs, totalMs)}
                              </span>
                              {nextMilestone?.dueDate && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="sh-tabular">
                                    {extra.dueDateLabel(nextMilestone.dueDate.slice(0, 10))}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="sh-cell-meta" style={{ marginTop: 2 }}>
                              <span>
                                {extra.nextStepPrefix}: {deriveContractNextStep(c, extra)}
                              </span>
                            </div>
                          </div>
                          <div className="sh-compact-row-right">
                            <button
                              type="button"
                              className="sh-row-action-btn"
                              onClick={() =>
                                onOpenContract
                                  ? onOpenContract(c.id)
                                  : onNavigateView("contracts")
                              }
                            >
                              {d.contractBtn} <ArrowRight size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {effectiveJobs.length > 0 && (
              <div className="sh-card">
                <div className="sh-card-header">
                  <div>
                    <h3 className="sh-card-title">{extra.openJobsTitle}</h3>
                    <p className="sh-card-desc">{extra.openJobsDesc}</p>
                  </div>
                  <button
                    type="button"
                    className="sh-btn sh-btn-secondary"
                    onClick={() => onNavigateView("jobs")}
                  >
                    {`${d.viewAll} (${effectiveJobs.length})`} <ArrowRight size={13} />
                  </button>
                </div>
                <div className="sh-compact-list">
                  {effectiveJobs.slice(0, 4).map((job) => (
                    <div key={job.id} className="sh-compact-row">
                      <div className="sh-compact-row-main">
                        <div className="sh-cell-primary">{job.title}</div>
                        <div className="sh-cell-meta">
                          <span className="sh-tabular">
                            {extra.proposalsCountLabel(job.proposalsCount ?? 0)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="sh-tabular">
                            {copy.deadlinePrefix(job.deadline.slice(0, 10))}
                          </span>
                        </div>
                      </div>
                      <div className="sh-compact-row-right">
                        <strong className="sh-tabular" style={{ color: "var(--color-primary-text-link, var(--color-primary))" }}>
                          ETB {(job.budgetMaxMinor / 100).toLocaleString()}
                        </strong>
                        <button
                          type="button"
                          className="sh-row-action-btn"
                          onClick={() =>
                            onNavigateView((job.proposalsCount ?? 0) > 0 ? "proposals" : "jobs")
                          }
                        >
                          {(job.proposalsCount ?? 0) > 0
                            ? extra.attentionReviewProposalsAction
                            : d.manageBtn}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Compact KPIs: Wallet balance & Held in escrow */}
          <div className="sh-kpi-grid is-compact" data-tour="dashboard-kpis">
            <article
              className={`sh-kpi-card ${expandedKpi === "wallet" ? "expanded" : ""}`}
              onClick={() => setExpandedKpi(expandedKpi === "wallet" ? null : "wallet")}
              role="button"
              tabIndex={0}
              aria-expanded={expandedKpi === "wallet"}
            >
              <div className="sh-kpi-top">
                <span className="sh-kpi-label">{d.kpiWallet}</span>
                <Wallet size={15} className="sh-text-muted" />
              </div>
              <div className="sh-kpi-value sh-tabular">
                ETB {(effectiveWallet.balanceMinor / 100).toLocaleString()}
              </div>
              <div className="sh-kpi-foot">
                <span className="sh-cell-meta">
                  {walletTrend.topUpCount > 0
                    ? `${walletTrend.topUpCount} approved top-ups`
                    : d.kpiNoTopUpsYet}
                </span>
                <ChevronDown size={14} className="sh-kpi-chev" />
              </div>
              {expandedKpi === "wallet" && (
                <div className="sh-kpi-drawer" onClick={(e) => e.stopPropagation()}>
                  <div className="sh-kv-row">
                    <span>{copy.approvedTopUps}</span>
                    <strong className="sh-tabular">
                      ETB{" "}
                      {(
                        effectiveTopUps
                          .filter((t) => t.status === "APPROVED")
                          .reduce((s, t) => s + t.amountMinor, 0) / 100
                      ).toLocaleString()}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="sh-row-action-btn"
                    style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
                    onClick={() => onNavigateView("wallet")}
                  >
                    {copy.openWalletDeskBtn} <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </article>

            <article
              className={`sh-kpi-card ${expandedKpi === "escrow" ? "expanded" : ""}`}
              onClick={() => setExpandedKpi(expandedKpi === "escrow" ? null : "escrow")}
              role="button"
              tabIndex={0}
              aria-expanded={expandedKpi === "escrow"}
            >
              <div className="sh-kpi-top">
                <span className="sh-kpi-label">{d.kpiEscrow}</span>
                <ShieldCheck size={15} className="sh-text-muted" />
              </div>
              <div className="sh-kpi-value sh-tabular">
                ETB {(escrowSecuredMinor / 100).toLocaleString()}
              </div>
              <div className="sh-kpi-foot">
                <span className="sh-cell-meta sh-tabular">
                  {activeMilestoneCount > 0
                    ? `${activeMilestoneCount} active · ${d.kpiEscrowMilestoneBacked}`
                    : d.kpiNoEscrowYet}
                </span>
                <ChevronDown size={14} className="sh-kpi-chev" />
              </div>
              {expandedKpi === "escrow" && (
                <div className="sh-kpi-drawer" onClick={(e) => e.stopPropagation()}>
                  <div className="sh-kv-row">
                    <span>{copy.releasedYtd}</span>
                    <strong className="sh-tabular">
                      ETB {(releasedMinor / 100).toLocaleString()}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="sh-row-action-btn"
                    style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
                    onClick={() => onNavigateView("escrow")}
                  >
                    {extra.viewPaymentsBtn} <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </article>
          </div>

          {/* 5. Verified freelancers */}
          {onSelectProfile && (
            <div style={{ marginTop: 4 }}>
              <FeaturedCarousel
                onProfileClick={onSelectProfile}
                onOpenChat={onOpenChat}
                onBrowseGigs={() => onNavigateView("gigs")}
              />
            </div>
          )}

          {/* 6. Collapsible Insights — rendered and code-split loaded ONLY when settled milestone or approved top-up exists */}
          {hasSettledOrApprovedActivity && (
            <details
              className="sh-card sh-insights-details"
              open={insightsOpen}
              onToggle={(e) => setInsightsOpen(e.currentTarget.open)}
            >
              <summary className="sh-insights-summary">
                <span className="sh-insights-summary-text">
                  <BarChart3 size={16} aria-hidden="true" />
                  <strong>{extra.insightsTitle}</strong>
                  <span className="sh-cell-meta">{extra.insightsDesc}</span>
                </span>
                <ChevronDown size={16} className="sh-insights-chev" aria-hidden="true" />
              </summary>
              {insightsOpen && (
                <div className="sh-charts-split" style={{ marginTop: 14 }}>
                  <Suspense fallback={<div className="sh-cell-meta">Loading charts...</div>}>
                    <LazyCashflowAreaChart
                      range={timeRange}
                      onRangeChange={setTimeRange}
                      milestones={effectiveMilestones}
                      topUps={effectiveTopUps}
                    />
                    <LazyRailVelocityBarChart
                      range={timeRange}
                      milestones={effectiveMilestones}
                      topUps={effectiveTopUps}
                    />
                  </Suspense>
                </div>
              )}
            </details>
          )}
        </>
      )}

      {/* =====================================================================
          FREELANCER / ADMIN OVERVIEW (or Pipeline below)
         ===================================================================== */}
      {dashboardVariant === "dashboard-1" && viewerRole !== "CLIENT" && (
        <>
          <div className="sh-kpi-grid" data-tour="dashboard-kpis">
            <article
              className={`sh-kpi-card ${expandedKpi === "wallet" ? "expanded" : ""}`}
              onClick={() => setExpandedKpi(expandedKpi === "wallet" ? null : "wallet")}
              role="button"
              tabIndex={0}
              aria-expanded={expandedKpi === "wallet"}
            >
              <div className="sh-kpi-top">
                <span className="sh-kpi-label">{d.kpiWallet}</span>
                <Wallet size={15} className="sh-text-muted" />
              </div>
              <div className="sh-kpi-value sh-tabular">
                ETB {(effectiveWallet.balanceMinor / 100).toLocaleString()}
              </div>
              <div className="sh-kpi-foot">
                {walletTrend.change !== null ? (
                  <span className={`sh-trend-delta sh-tabular ${walletTrend.change >= 0 ? "positive" : "negative"}`}>
                    {walletTrend.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {formatTrend(walletTrend.change)}
                  </span>
                ) : (
                  <span className="sh-trend-delta neutral sh-tabular">
                    {walletTrend.topUpCount > 0 ? d.kpiNoPriorTopUps : d.kpiNoTopUpsYet}
                  </span>
                )}
                <span className="sh-cell-meta">
                  {walletTrend.topUpCount > 0
                    ? `${walletTrend.topUpCount} approved top-ups · ETB ${Math.round(walletTrend.current).toLocaleString()} in 30d`
                    : d.kpiWalletNoActivity}
                </span>
                <ChevronDown size={14} className="sh-kpi-chev" />
              </div>
              {expandedKpi === "wallet" && (
                <div className="sh-kpi-drawer" onClick={(e) => e.stopPropagation()}>
                  <div className="sh-kv-row">
                    <span>{copy.approvedTopUps}</span>
                    <strong className="sh-tabular">
                      ETB {(effectiveTopUps.filter((t) => t.status === "APPROVED").reduce((s, t) => s + t.amountMinor, 0) / 100).toLocaleString()}
                    </strong>
                  </div>
                  <div className="sh-kv-row">
                    <span>{copy.pendingReceiptVerif}</span>
                    <strong className="sh-tabular">
                      ETB {(effectiveTopUps.filter((t) => t.status !== "APPROVED").reduce((s, t) => s + t.amountMinor, 0) / 100).toLocaleString()}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="sh-row-action-btn"
                    style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
                    onClick={() => onNavigateView("wallet")}
                  >
                    {copy.openWalletDeskBtn} <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </article>

            <article
              className={`sh-kpi-card ${expandedKpi === "escrow" ? "expanded" : ""}`}
              onClick={() => setExpandedKpi(expandedKpi === "escrow" ? null : "escrow")}
              role="button"
              tabIndex={0}
              aria-expanded={expandedKpi === "escrow"}
            >
              <div className="sh-kpi-top">
                <span className="sh-kpi-label">{d.kpiEscrow}</span>
                <ShieldCheck size={15} className="sh-text-muted" />
              </div>
              <div className="sh-kpi-value sh-tabular">
                ETB {(escrowSecuredMinor / 100).toLocaleString()}
              </div>
              <div className="sh-kpi-foot">
                {escrowTrend.change !== null ? (
                  <span className={`sh-trend-delta sh-tabular ${escrowTrend.change >= 0 ? "positive" : "negative"}`}>
                    {escrowTrend.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {formatTrend(escrowTrend.change)}
                  </span>
                ) : (
                  <span className="sh-trend-delta neutral sh-tabular">
                    {escrowTrend.current > 0 ? d.kpiNoPriorEscrow : d.kpiNoEscrowYet}
                  </span>
                )}
                <span className="sh-cell-meta">
                  {escrowTrend.current > 0
                    ? `ETB ${Math.round(escrowTrend.current).toLocaleString()} funded in 30d · ${activeMilestoneCount} active`
                    : activeMilestoneCount > 0
                      ? `${activeMilestoneCount} active · ${d.kpiEscrowMilestoneBacked}`
                      : d.kpiEscrowMilestoneBacked}
                </span>
                <ChevronDown size={14} className="sh-kpi-chev" />
              </div>
              {expandedKpi === "escrow" && (
                <div className="sh-kpi-drawer" onClick={(e) => e.stopPropagation()}>
                  <div className="sh-kv-row">
                    <span>{copy.releasedYtd}</span>
                    <strong className="sh-tabular">ETB {(releasedMinor / 100).toLocaleString()}</strong>
                  </div>
                  <div className="sh-kv-row">
                    <span>{copy.submittedQa}</span>
                    <strong className="sh-tabular">
                      ETB {(effectiveMilestones.filter((m) => m.escrowState === "SUBMITTED_FOR_REVIEW").reduce((s, m) => s + m.amountMinor, 0) / 100).toLocaleString()}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="sh-row-action-btn"
                    style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
                    onClick={() => onNavigateView("contracts")}
                  >
                    {copy.inspectContractsBtn} <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </article>

            <article
              className={`sh-kpi-card ${expandedKpi === "milestones" ? "expanded" : ""}`}
              onClick={() => setExpandedKpi(expandedKpi === "milestones" ? null : "milestones")}
              role="button"
              tabIndex={0}
              aria-expanded={expandedKpi === "milestones"}
            >
              <div className="sh-kpi-top">
                <span className="sh-kpi-label">{d.kpiMilestones}</span>
                <CheckCircle2 size={15} className="sh-text-muted" />
              </div>
              <div className="sh-kpi-value sh-tabular">{activeMilestoneCount}</div>
              <div className="sh-kpi-foot">
                {deliveryStats.rate !== null ? (
                  <span className="sh-trend-delta positive sh-tabular">
                    <ArrowUpRight size={12} /> {deliveryStats.rate.toFixed(1)}% on-time
                  </span>
                ) : (
                  <span className="sh-trend-delta neutral sh-tabular">{d.kpiNoSettledMilestones}</span>
                )}
                <span className="sh-cell-meta">
                  {deliveryStats.released > 0
                    ? `${deliveryStats.onTime}/${deliveryStats.released} · ${copy.acrossContracts(contractCount)}`
                    : copy.acrossContracts(contractCount)}
                  {attentionItems.length > 0 ? ` · ${extra.needActionCount(attentionItems.length)}` : ""}
                </span>
                <ChevronDown size={14} className="sh-kpi-chev" />
              </div>
              {expandedKpi === "milestones" && (
                <div className="sh-kpi-drawer" onClick={(e) => e.stopPropagation()}>
                  <div className="sh-kv-row">
                    <span>{copy.inActiveDelivery}</span>
                    <strong className="sh-tabular">
                      {copy.milestonesCount(effectiveMilestones.filter((m) => m.escrowState === "WORK_IN_PROGRESS").length)}
                    </strong>
                  </div>
                  <div className="sh-kv-row">
                    <span>{copy.escrowFundedReady}</span>
                    <strong className="sh-tabular">
                      {copy.milestonesCount(effectiveMilestones.filter((m) => m.escrowState === "ESCROW_HELD").length)}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="sh-row-action-btn"
                    style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
                    onClick={() => {
                      setDashboardVariant("dashboard-2");
                      setOpsSubTab("kanban");
                    }}
                  >
                    {copy.openKanbanBtn} <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </article>

            <article
              className={`sh-kpi-card ${expandedKpi === "jobs" ? "expanded" : ""}`}
              onClick={() => setExpandedKpi(expandedKpi === "jobs" ? null : "jobs")}
              role="button"
              tabIndex={0}
              aria-expanded={expandedKpi === "jobs"}
            >
              <div className="sh-kpi-top">
                <span className="sh-kpi-label">{briefScope === "own" ? d.kpiYourBriefs : d.kpiOpenBriefs}</span>
                <Briefcase size={15} className="sh-text-muted" />
              </div>
              <div className="sh-kpi-value sh-tabular">{openJobsCount}</div>
              <div className="sh-kpi-foot">
                <span className="sh-trend-delta neutral sh-tabular">
                  {briefsThisWeek > 0 ? `${briefsThisWeek} new this week` : d.kpiNoNewBriefs}
                </span>
                <span className="sh-cell-meta">{briefScope === "own" ? d.kpiYourBriefsSub : d.kpiMarketplaceBriefsSub}</span>
                <ChevronDown size={14} className="sh-kpi-chev" />
              </div>
              {expandedKpi === "jobs" && (
                <div className="sh-kpi-drawer" onClick={(e) => e.stopPropagation()}>
                  <div className="sh-kv-row">
                    <span>{copy.combinedBudgetPool}</span>
                    <strong className="sh-tabular">
                      ETB {(effectiveJobs.reduce((s, j) => s + j.budgetMaxMinor, 0) / 100).toLocaleString()}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="sh-row-action-btn"
                    style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
                    onClick={() => onNavigateView("jobs")}
                  >
                    {copy.exploreBriefsBtn} <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </article>
          </div>

          {attentionItems.length > 0 && (
            <section className="sh-card sh-attention-strip" aria-label={extra.attentionTitle} aria-live="polite">
              <div className="sh-card-header" style={{ marginBottom: 8 }}>
                <div>
                  <h3 className="sh-card-title">{extra.attentionTitle}</h3>
                  <p className="sh-card-desc">{extra.attentionDesc}</p>
                </div>
              </div>
              <div className="sh-compact-list">
                {attentionItems.map((item) => (
                  <div key={item.id} className="sh-compact-row">
                    <div className="sh-compact-row-main">
                      <div className="sh-cell-primary">{item.title}</div>
                      <div className="sh-cell-meta">
                        <span>{item.subtitle}</span>
                        <span aria-hidden="true">·</span>
                        <span className={`sh-status-inline ${item.tone}`}>
                          {item.reason}
                        </span>
                      </div>
                    </div>
                    <div className="sh-compact-row-right">
                      {typeof item.amountMinor === "number" && (
                        <strong className="sh-tabular">ETB {(item.amountMinor / 100).toLocaleString()}</strong>
                      )}
                      <button
                        type="button"
                        className="sh-row-action-btn"
                        onClick={() =>
                          onOpenEscrow ? onOpenEscrow(item.id) : onNavigateView("escrow")
                        }
                      >
                        {item.actionLabel} <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {hasSettledOrApprovedActivity && (
            <details
              className="sh-card sh-insights-details"
              open={insightsOpen}
              onToggle={(e) => setInsightsOpen(e.currentTarget.open)}
            >
              <summary className="sh-insights-summary">
                <span className="sh-insights-summary-text">
                  <BarChart3 size={16} aria-hidden="true" />
                  <strong>{extra.insightsTitle}</strong>
                  <span className="sh-cell-meta">{extra.insightsDesc}</span>
                </span>
                <ChevronDown size={16} className="sh-insights-chev" aria-hidden="true" />
              </summary>
              {insightsOpen && (
                <div className="sh-charts-split" style={{ marginTop: 14 }}>
                  <Suspense fallback={<div className="sh-cell-meta">Loading charts...</div>}>
                    <LazyCashflowAreaChart
                      range={timeRange}
                      onRangeChange={setTimeRange}
                      milestones={effectiveMilestones}
                      topUps={effectiveTopUps}
                    />
                    <LazyRailVelocityBarChart
                      range={timeRange}
                      milestones={effectiveMilestones}
                      topUps={effectiveTopUps}
                    />
                  </Suspense>
                </div>
              )}
            </details>
          )}

          <div className="sh-charts-split">
            <div className="sh-card">
              <div className="sh-card-header">
                <div>
                  <h3 className="sh-card-title">{d.recentActivityTitle}</h3>
                  <p className="sh-card-desc">{d.recentActivityDesc}</p>
                </div>
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={() => {
                    setDashboardVariant("dashboard-2");
                    setOpsSubTab("table");
                  }}
                >
                  {d.openFullTable} <ArrowRight size={13} />
                </button>
              </div>
              <div className="sh-compact-list">
                {effectiveMilestones.length === 0 ? (
                  <div className="sh-compact-row">
                    <div className="sh-compact-row-main">
                      <div className="sh-cell-primary">{d.noMilestonesTitle}</div>
                      <div className="sh-cell-meta">{d.noMilestonesDesc}</div>
                    </div>
                  </div>
                ) : (
                  effectiveMilestones.slice(0, 5).map((ms) => (
                    <div key={ms.id} className="sh-compact-row">
                      <div className="sh-compact-row-main">
                        <div className="sh-cell-primary">{ms.title}</div>
                        <div className="sh-cell-meta">
                          <span className="sh-tabular">#{ms.id.slice(0, 8)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatStatusLabel(ms.escrowState, t.workspace.statuses)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="sh-tabular">{copy.duePrefix(ms.dueDate.slice(0, 10))}</span>
                        </div>
                      </div>
                      <div className="sh-compact-row-right">
                        <strong className="sh-tabular">ETB {(ms.amountMinor / 100).toLocaleString()}</strong>
                        <button
                          type="button"
                          className="sh-row-action-btn"
                          onClick={() => onNavigateView("contracts")}
                        >
                          {d.contractBtn} <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="sh-card">
              <div className="sh-card-header">
                <div>
                  <h3 className="sh-card-title">
                    {canWork ? d.recommendedBriefsTitle : d.activeHiringBriefsTitle}
                  </h3>
                  <p className="sh-card-desc">
                    {canWork ? d.recommendedBriefsDesc : d.activeHiringBriefsDesc}
                  </p>
                </div>
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={() => onNavigateView("jobs")}
                >
                  {effectiveJobs.length > 0 ? `${d.viewAll} (${effectiveJobs.length})` : d.viewAll}{" "}
                  <ArrowRight size={13} />
                </button>
              </div>
              <div className="sh-compact-list">
                {effectiveJobs.length === 0 ? (
                  <div className="sh-compact-row">
                    <div className="sh-compact-row-main">
                      <div className="sh-cell-primary">
                        {canWork ? d.noOpenBriefsTitle : d.noOwnBriefsTitle}
                      </div>
                      <div className="sh-cell-meta">
                        {canWork ? d.noOpenBriefsDesc : d.noOwnBriefsDesc}
                      </div>
                    </div>
                  </div>
                ) : (
                  effectiveJobs.slice(0, 4).map((job) => (
                    <div key={job.id} className="sh-compact-row">
                      <div className="sh-compact-row-main">
                        <div className="sh-cell-primary">{job.title}</div>
                        <div className="sh-cell-meta">
                          <span>{job.category.replaceAll("_", " ")}</span>
                          <span aria-hidden="true">·</span>
                          <span className="sh-tabular">{copy.deadlinePrefix(job.deadline.slice(0, 10))}</span>
                        </div>
                      </div>
                      <div className="sh-compact-row-right">
                        <strong className="sh-tabular" style={{ color: "var(--color-primary-text-link, var(--color-primary))" }}>
                          ETB {(job.budgetMaxMinor / 100).toLocaleString()}
                        </strong>
                        <button
                          type="button"
                          className="sh-row-action-btn"
                          onClick={() => onNavigateView("jobs")}
                        >
                          {canWork ? d.submitProposalBtn : d.manageBtn}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          DASHBOARD 2: OPERATIONS, LIST, BOARD & CALENDAR SUITE (CODE-SPLIT)
         ===================================================================== */}
      {dashboardVariant === "dashboard-2" && (
        <Suspense fallback={<div className="sh-card" style={{ padding: 24 }}>Loading...</div>}>
          <div>
            {opsSubTab === "table" && (
              <LazyAdvancedDataTable
                records={ledgerRecords}
                viewerRole={viewerRole}
                feeConfig={feeConfig}
                onNavigateView={onNavigateView}
                onOpenContracts={(contractId) =>
                  onOpenContract ? onOpenContract(contractId) : onNavigateView("contracts")
                }
                onOpenEscrow={(milestoneId) =>
                  onOpenEscrow ? onOpenEscrow(milestoneId) : onNavigateView("escrow")
                }
                onRequestFundMilestone={
                  onFundMilestone
                    ? (rec) =>
                        setFundTarget({
                          id: rec.id,
                          title: rec.title,
                          counterparty: rec.counterparty,
                          amountMinor: rec.amountMinor,
                          clientFeeMinor: rec.clientFeeMinor,
                          clientTotalChargeMinor: rec.clientTotalChargeMinor,
                        })
                    : undefined
                }
              />
            )}

            {opsSubTab === "kanban" && (
              <LazyKanbanBoardView
                tasks={kanbanTasks}
                viewerRole={viewerRole}
                feeConfig={feeConfig}
                onNavigateView={onNavigateView}
                onOpenContracts={(contractId) =>
                  onOpenContract ? onOpenContract(contractId) : onNavigateView("contracts")
                }
                onOpenEscrow={(milestoneId) =>
                  onOpenEscrow ? onOpenEscrow(milestoneId) : onNavigateView("escrow")
                }
                onRequestFundMilestone={
                  onFundMilestone
                    ? (task) =>
                        setFundTarget({
                          id: task.id,
                          title: task.title,
                          counterparty: task.freelancer || task.counterparty,
                          amountMinor: task.amountMinor,
                          clientFeeMinor: task.clientFeeMinor,
                          clientTotalChargeMinor: task.clientTotalChargeMinor,
                        })
                    : undefined
                }
              />
            )}

            {opsSubTab === "calendar" && (
              <LazyCalendarScheduleView
                events={scheduleEvents}
                onOpenEscrow={(milestoneId) =>
                  onOpenEscrow ? onOpenEscrow(milestoneId) : onNavigateView("escrow")
                }
              />
            )}
          </div>
        </Suspense>
      )}

      <ConfirmActionModal
        open={fundTarget !== null}
        title="Fund Milestone into Escrow"
        description={
          fundTarget
            ? `Funding moves ETB ${(fundTarget.clientTotalChargeMinor / 100).toLocaleString()} from your available wallet balance into protected escrow for "${fundTarget.title}". Funds stay locked until you approve the deliverable.`
            : undefined
        }
        amountEtb={
          fundTarget
            ? `ETB ${(fundTarget.clientTotalChargeMinor / 100).toLocaleString()}`
            : undefined
        }
        summaryRows={
          fundTarget
            ? [
                { label: "Milestone", value: fundTarget.title },
                { label: "Counterparty", value: fundTarget.counterparty },
                {
                  label: "Gross Escrow Amount",
                  value: `ETB ${(fundTarget.amountMinor / 100).toLocaleString()}`,
                },
                {
                  label: "Client Fee",
                  value: `ETB ${(fundTarget.clientFeeMinor / 100).toLocaleString()}`,
                },
                {
                  label: "Total Wallet Debit",
                  value: `ETB ${(fundTarget.clientTotalChargeMinor / 100).toLocaleString()}`,
                },
              ]
            : undefined
        }
        confirmLabel="Confirm & Fund Escrow"
        cancelLabel="Cancel"
        tone="primary"
        loading={fundLoading}
        onCancel={() => {
          if (!fundLoading) setFundTarget(null);
        }}
        onConfirm={async () => {
          if (!fundTarget || !onFundMilestone) return;
          setFundLoading(true);
          try {
            await onFundMilestone(fundTarget.id);
            setFundTarget(null);
          } finally {
            setFundLoading(false);
          }
        }}
      />
    </section>
  );
}
