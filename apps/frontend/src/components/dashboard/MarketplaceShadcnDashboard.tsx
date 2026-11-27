import { useMemo, useState } from "react";
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
} from "lucide-react";
import type {
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
import { FUNDED_ESCROW_STATES } from "./dashboardData";
import {
  briefsCreatedSince,
  escrowFundedTotals,
  onTimeStats,
  periodChange,
  topUpTotals,
} from "./dashboardAnalytics";
import { useShadcnLayout } from "./ShadcnLayoutContext";
import {
  InteractiveCashflowAreaChart,
  InteractiveRailVelocityBarChart,
} from "./ShadcnCharts";
import { AdvancedDataTable } from "./AdvancedDataTable";
import { KanbanBoardView } from "./KanbanBoardView";
import { CalendarScheduleView } from "./CalendarScheduleView";
import { FeaturedCarousel } from "../../FeaturedCarousel";
import { useI18n } from "../../i18n";
import { DASHBOARD_COPY } from "./dashboardCopy";
import { ConfirmActionModal, formatStatusLabel } from "../../pages/ops/components/ui";
import { ContextualHelpTrigger } from "../guide/ContextualHelpTrigger";

interface MarketplaceShadcnDashboardProps {
  canHire: boolean;
  canWork: boolean;
  viewerRole?: "CLIENT" | "FREELANCER" | "ADMIN";
  wallet: WalletResponse;
  /** Open marketplace briefs — what a freelancer competes for. */
  jobs: Job[];
  /** The caller's own posted briefs — what a client is hiring for. */
  myJobs?: Job[];
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
  return "BACKLOG";
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
  canHire,
  canWork,
  viewerRole: explicitViewerRole,
  wallet,
  jobs,
  myJobs,
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
  const d = t.workspace.dashboard;
  const viewerRole = explicitViewerRole ?? (canWork ? "FREELANCER" : "CLIENT");

  const [timeRange, setTimeRange] = useState<TimeRangeKey>("30d");
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

  const effectiveWallet = wallet;
  const effectiveMilestones = milestones;
  const effectiveTopUps = topUps;

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
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
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
                  <Table2 size={13} /> {d.subTabTable} ({ledgerRecords.length})
                </button>
                <button
                  type="button"
                  className={`sh-seg-btn ${opsSubTab === "kanban" ? "active" : ""}`}
                  onClick={() => setOpsSubTab("kanban")}
                >
                  <Kanban size={13} /> {d.subTabKanban} ({kanbanTasks.length})
                </button>
                <button
                  type="button"
                  className={`sh-seg-btn ${opsSubTab === "calendar" ? "active" : ""}`}
                  onClick={() => setOpsSubTab("calendar")}
                >
                  <Calendar size={13} /> {d.subTabCalendar} ({scheduleEvents.length})
                </button>
              </div>
              <ContextualHelpTrigger helpId="dashboard-pipeline-stages" />
            </div>
          )}
        </div>

        <div className="sh-subnav-right">
          <ContextualHelpTrigger helpId="dashboard-kpis" />
          <button
            type="button"
            className="sh-btn sh-btn-secondary"
            onClick={() => setCommandPaletteOpen(true)}
            title={copy.quickJumpTitle}
            data-tour="dashboard-quick-jump"
          >
            <Search size={14} />
            <span>{d.quickJump}</span>
            <kbd className="sh-kbd">⌘K</kbd>
          </button>

          <button
            type="button"
            className="sh-icon-only-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            title={copy.refreshTitle}
            aria-label={copy.refreshAria}
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "refresh-spin" : undefined}
            />
          </button>

          {canHire && (
            <button
              type="button"
              className="sh-btn sh-btn-primary"
              onClick={() => onNavigateView("jobs")}
            >
              <Plus size={14} /> {d.postJobBrief}
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

      {/* 4-Column KPI Stat Strip (Visible in both dashboards, interactive drill-down) */}
      <div className="sh-kpi-grid" data-tour="dashboard-kpis">
        {/* KPI 1: Available Wallet Balance */}
        <article
          className={`sh-kpi-card ${expandedKpi === "wallet" ? "expanded" : ""}`}
          onClick={() =>
            setExpandedKpi(expandedKpi === "wallet" ? null : "wallet")
          }
          role="button"
          tabIndex={0}
          aria-expanded={expandedKpi === "wallet"}
        >
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">{d.kpiWallet}</span>
            <Wallet size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">
            ETB {(effectiveWallet.balanceMinor / 100).toLocaleString()}
          </div>
          <div className="sh-kpi-foot">
            {walletTrend.change !== null ? (
              <span
                className={`sh-trend-delta sh-mono ${
                  walletTrend.change >= 0 ? "positive" : "negative"
                }`}
              >
                {walletTrend.change >= 0 ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {formatTrend(walletTrend.change)}
              </span>
            ) : (
              <span className="sh-trend-delta neutral sh-mono">
                {walletTrend.topUpCount > 0
                  ? d.kpiNoPriorTopUps
                  : d.kpiNoTopUpsYet}
              </span>
            )}
            <span className="sh-cell-meta">
              {walletTrend.topUpCount > 0
                ? `${walletTrend.topUpCount} approved top-ups · ETB ${Math.round(
                    walletTrend.current,
                  ).toLocaleString()} in 30d`
                : d.kpiWalletNoActivity}
            </span>
            <ChevronDown size={14} className="sh-kpi-chev" />
          </div>

          {expandedKpi === "wallet" && (
            <div
              className="sh-kpi-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sh-kv-row">
                <span>{copy.approvedTopUps}</span>
                <strong className="sh-mono">
                  ETB{" "}
                  {(
                    effectiveTopUps
                      .filter((t) => t.status === "APPROVED")
                      .reduce((s, t) => s + t.amountMinor, 0) / 100
                  ).toLocaleString()}
                </strong>
              </div>
              <div className="sh-kv-row">
                <span>{copy.pendingReceiptVerif}</span>
                <strong className="sh-mono">
                  ETB{" "}
                  {(
                    effectiveTopUps
                      .filter((t) => t.status !== "APPROVED")
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

        {/* KPI 2: Protected in Escrow */}
        <article
          className={`sh-kpi-card ${expandedKpi === "escrow" ? "expanded" : ""}`}
          onClick={() =>
            setExpandedKpi(expandedKpi === "escrow" ? null : "escrow")
          }
          role="button"
          tabIndex={0}
          aria-expanded={expandedKpi === "escrow"}
        >
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">{d.kpiEscrow}</span>
            <ShieldCheck size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">
            ETB {(escrowSecuredMinor / 100).toLocaleString()}
          </div>
          <div className="sh-kpi-foot">
            {escrowTrend.change !== null ? (
              <span
                className={`sh-trend-delta sh-mono ${
                  escrowTrend.change >= 0 ? "positive" : "negative"
                }`}
              >
                {escrowTrend.change >= 0 ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {formatTrend(escrowTrend.change)}
              </span>
            ) : (
              <span className="sh-trend-delta neutral sh-mono">
                {escrowTrend.current > 0 ? d.kpiNoPriorEscrow : d.kpiNoEscrowYet}
              </span>
            )}
            <span className="sh-cell-meta">
              {escrowTrend.current > 0
                ? `ETB ${Math.round(escrowTrend.current).toLocaleString()} funded in 30d · ${activeMilestoneCount} active`
                : `${activeMilestoneCount} active · ${d.kpiEscrowMilestoneBacked}`}
            </span>
            <ChevronDown size={14} className="sh-kpi-chev" />
          </div>

          {expandedKpi === "escrow" && (
            <div
              className="sh-kpi-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sh-kv-row">
                <span>{copy.releasedYtd}</span>
                <strong className="sh-mono">
                  ETB {(releasedMinor / 100).toLocaleString()}
                </strong>
              </div>
              <div className="sh-kv-row">
                <span>{copy.submittedQa}</span>
                <strong className="sh-mono">
                  ETB{" "}
                  {(
                    effectiveMilestones
                      .filter((m) => m.escrowState === "SUBMITTED_FOR_REVIEW")
                      .reduce((s, m) => s + m.amountMinor, 0) / 100
                  ).toLocaleString()}
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

        {/* KPI 3: Active Milestone Velocity */}
        <article
          className={`sh-kpi-card ${expandedKpi === "milestones" ? "expanded" : ""}`}
          onClick={() =>
            setExpandedKpi(
              expandedKpi === "milestones" ? null : "milestones",
            )
          }
          role="button"
          tabIndex={0}
          aria-expanded={expandedKpi === "milestones"}
        >
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">{d.kpiMilestones}</span>
            <CheckCircle2 size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">{activeMilestoneCount}</div>
          <div className="sh-kpi-foot">
            {deliveryStats.rate !== null ? (
              <span className="sh-trend-delta positive sh-mono">
                <ArrowUpRight size={12} /> {deliveryStats.rate.toFixed(1)}% on-time
              </span>
            ) : (
              <span className="sh-trend-delta neutral sh-mono">
                {d.kpiNoSettledMilestones}
              </span>
            )}
            <span className="sh-cell-meta">
              {deliveryStats.released > 0
                ? `${deliveryStats.onTime}/${deliveryStats.released} · ${copy.acrossContracts(contractCount)}`
                : copy.acrossContracts(contractCount)}
            </span>
            <ChevronDown size={14} className="sh-kpi-chev" />
          </div>

          {expandedKpi === "milestones" && (
            <div
              className="sh-kpi-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sh-kv-row">
                <span>{copy.inActiveDelivery}</span>
                <strong className="sh-mono">
                  {copy.milestonesCount(
                    effectiveMilestones.filter(
                      (m) => m.escrowState === "WORK_IN_PROGRESS",
                    ).length,
                  )}
                </strong>
              </div>
              <div className="sh-kv-row">
                <span>{copy.escrowFundedReady}</span>
                <strong className="sh-mono">
                  {copy.milestonesCount(
                    effectiveMilestones.filter(
                      (m) => m.escrowState === "ESCROW_HELD",
                    ).length,
                  )}
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

        {/* KPI 4: Open Marketplace Briefs */}
        <article
          className={`sh-kpi-card ${expandedKpi === "jobs" ? "expanded" : ""}`}
          onClick={() => setExpandedKpi(expandedKpi === "jobs" ? null : "jobs")}
          role="button"
          tabIndex={0}
          aria-expanded={expandedKpi === "jobs"}
        >
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">
              {briefScope === "own" ? d.kpiYourBriefs : d.kpiOpenBriefs}
            </span>
            <Briefcase size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">{openJobsCount}</div>
          <div className="sh-kpi-foot">
            <span className="sh-trend-delta neutral sh-mono">
              {briefsThisWeek > 0
                ? `${briefsThisWeek} new this week`
                : d.kpiNoNewBriefs}
            </span>
            <span className="sh-cell-meta">
              {briefScope === "own"
                ? d.kpiYourBriefsSub
                : d.kpiMarketplaceBriefsSub}
            </span>
            <ChevronDown size={14} className="sh-kpi-chev" />
          </div>

          {expandedKpi === "jobs" && (
            <div
              className="sh-kpi-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sh-kv-row">
                <span>{copy.combinedBudgetPool}</span>
                <strong className="sh-mono">
                  ETB{" "}
                  {(
                    effectiveJobs.reduce((s, j) => s + j.budgetMaxMinor, 0) / 100
                  ).toLocaleString()}
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

      {/* =====================================================================
          DASHBOARD 1: EXECUTIVE ANALYTICS & FINANCIAL COMMAND
         ===================================================================== */}
      {dashboardVariant === "dashboard-1" && (
        <>
          {/* 2-Column Interactive Chart Row */}
          <div className="sh-charts-split">
            <InteractiveCashflowAreaChart
              range={timeRange}
              onRangeChange={setTimeRange}
              milestones={effectiveMilestones}
              topUps={effectiveTopUps}
            />
            <InteractiveRailVelocityBarChart
              range={timeRange}
              milestones={effectiveMilestones}
              topUps={effectiveTopUps}
            />
          </div>

          {/* 2-Column Operational Snapshot: Recent Escrow Ledger + Open Briefs */}
          <div className="sh-charts-split">
            {/* Left: Recent Milestone Escrow Activity */}
            <div className="sh-card">
              <div className="sh-card-header">
                <div>
                  <h3 className="sh-card-title">{d.recentActivityTitle}</h3>
                  <p className="sh-card-desc">
                    {d.recentActivityDesc}
                  </p>
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
                      <div className="sh-cell-meta">
                        {d.noMilestonesDesc}
                      </div>
                    </div>
                  </div>
                ) : (
                  effectiveMilestones.slice(0, 5).map((ms) => (
                    <div key={ms.id} className="sh-compact-row">
                      <div className="sh-compact-row-main">
                        <div className="sh-cell-primary">{ms.title}</div>
                        <div className="sh-cell-meta">
                          <span className="sh-mono">#{ms.id.slice(0, 8)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatStatusLabel(ms.escrowState, t.workspace.statuses)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="sh-mono">{copy.duePrefix(ms.dueDate.slice(0, 10))}</span>
                        </div>
                      </div>
                      <div className="sh-compact-row-right">
                        <strong className="sh-mono">
                          ETB {(ms.amountMinor / 100).toLocaleString()}
                        </strong>
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

            {/* Right: Matching Opportunities / Quick Pipeline */}
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
                  {d.viewAll} ({effectiveJobs.length}) <ArrowRight size={13} />
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
                          <span className="sh-mono">{copy.deadlinePrefix(job.deadline.slice(0, 10))}</span>
                        </div>
                      </div>
                      <div className="sh-compact-row-right">
                        <strong className="sh-mono" style={{ color: "var(--color-primary)" }}>
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

          {(canHire || !canWork) && onSelectProfile && (
            <div style={{ marginTop: 16 }}>
              <FeaturedCarousel
                onProfileClick={onSelectProfile}
                onOpenChat={onOpenChat}
                onBrowseGigs={() => onNavigateView("gigs")}
              />
            </div>
          )}
        </>
      )}

      {/* =====================================================================
          DASHBOARD 2: OPERATIONS, CRM, KANBAN & CALENDAR SUITE
         ===================================================================== */}
      {dashboardVariant === "dashboard-2" && (
        <div>
          {opsSubTab === "table" && (
            <AdvancedDataTable
              records={ledgerRecords}
              viewerRole={viewerRole}
              feeConfig={feeConfig}
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
            <KanbanBoardView
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
            <CalendarScheduleView
              events={scheduleEvents}
              onOpenEscrow={(milestoneId) =>
                onOpenEscrow ? onOpenEscrow(milestoneId) : onNavigateView("escrow")
              }
            />
          )}
        </div>
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
