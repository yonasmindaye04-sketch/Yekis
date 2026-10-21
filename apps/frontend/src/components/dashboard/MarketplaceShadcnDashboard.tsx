import { useMemo, useState } from "react";
import {
  TrendingUp,
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
  Job,
  Milestone,
  TopUpRequest,
  WalletResponse,
} from "../../api/client";
import type {
  KanbanColumnId,
  KanbanTask,
  LedgerContractRecord,
  ScheduleEvent,
  TimeRangeKey,
} from "./dashboardData";
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
import { formatStatusLabel } from "../../pages/ops/components/ui";

interface MarketplaceShadcnDashboardProps {
  canHire: boolean;
  canWork: boolean;
  wallet: WalletResponse;
  jobs: Job[];
  milestones: Milestone[];
  topUps: TopUpRequest[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onNavigateView: (view: string) => void;
  onSelectProfile?: (userId: string) => void;
}

function toKanbanCol(state: string): KanbanColumnId {
  if (state === "ESCROW_HELD") return "ESCROW_HELD";
  if (state === "WORK_IN_PROGRESS") return "WORK_IN_PROGRESS";
  if (state === "SUBMITTED_FOR_REVIEW" || state === "ACCEPTED")
    return "SUBMITTED_FOR_REVIEW";
  if (state === "RELEASED") return "RELEASED";
  return "BACKLOG";
}

function toLedgerState(
  state: string,
): LedgerContractRecord["escrowState"] {
  if (
    state === "ESCROW_HELD" ||
    state === "WORK_IN_PROGRESS" ||
    state === "SUBMITTED_FOR_REVIEW" ||
    state === "RELEASED" ||
    state === "PAYMENT_PENDING" ||
    state === "DISPUTED"
  ) {
    return state;
  }
  return "ESCROW_HELD";
}

export function MarketplaceShadcnDashboard({
  canHire,
  canWork,
  wallet,
  jobs,
  milestones,
  topUps,
  isRefreshing,
  onRefresh,
  onNavigateView,
  onSelectProfile,
}: MarketplaceShadcnDashboardProps) {
  const {
    dashboardVariant,
    setDashboardVariant,
    opsSubTab,
    setOpsSubTab,
    setCommandPaletteOpen,
  } = useShadcnLayout();
  const { t } = useI18n();
  const d = t.workspace.dashboard;

  const [timeRange, setTimeRange] = useState<TimeRangeKey>("30d");
  const [expandedKpi, setExpandedKpi] = useState<
    "wallet" | "escrow" | "milestones" | "jobs" | null
  >(null);

  const effectiveWallet = wallet;
  const effectiveJobs = jobs;
  const effectiveMilestones = milestones;
  const effectiveTopUps = topUps;

  // Track user-driven local overrides/additions on top of live API records
  const [stateOverrides, setStateOverrides] = useState<
    Record<string, LedgerContractRecord["escrowState"]>
  >({});
  const [customTasks, setCustomTasks] = useState<KanbanTask[] | null>(null);
  const [customEvents, setCustomEvents] = useState<ScheduleEvent[] | null>(null);

  const CONTRACT_META_MAP: Record<
    string,
    {
      contractTitle: string;
      counterparty: string;
      counterpartyEmail: string;
      category: string;
      rail: "TELEBIRR" | "CBE_BIRR" | "M_PESA";
    }
  > = {
    "ctr-301": {
      contractTitle: "Telebirr SuperApp Mini-Program",
      counterparty: "Hanna Tadesse",
      counterpartyEmail: "hanna.tadesse@addisdev.et",
      category: "Web app development",
      rail: "TELEBIRR",
    },
    "ctr-302": {
      contractTitle: "Addis Coffee Export ERP",
      counterparty: "Dawit Mekonnen",
      counterpartyEmail: "dawit.mekonnen@ethio-digital.et",
      category: "Web app development",
      rail: "CBE_BIRR",
    },
    "ctr-303": {
      contractTitle: "Amharic & Afaan Oromo FinTech Localization",
      counterparty: "Meron Alemu",
      counterpartyEmail: "meron.alemu@lexethiopia.et",
      category: "Translation",
      rail: "CBE_BIRR",
    },
    "ctr-304": {
      contractTitle: "Fayda National ID KYC Onboarding",
      counterparty: "Nahom Girma",
      counterpartyEmail: "nahom.girma@addisdesign.et",
      category: "Graphic design",
      rail: "CBE_BIRR",
    },
    "ctr-305": {
      contractTitle: "M-Pesa Till Reconciliation & Ledger",
      counterparty: "Robel Tesfaye",
      counterpartyEmail: "robel@ethiofintech.et",
      category: "Web app development",
      rail: "M_PESA",
    },
    "ctr-306": {
      contractTitle: "Legacy Inventory ERP API Connector",
      counterparty: "Bereket Haile",
      counterpartyEmail: "bereket@coders.et",
      category: "Data entry",
      rail: "M_PESA",
    },
  };

  const RAILS: Array<"TELEBIRR" | "CBE_BIRR" | "M_PESA"> = ["TELEBIRR", "CBE_BIRR", "M_PESA"];

  const ledgerRecords = useMemo<LedgerContractRecord[]>(
    () =>
      effectiveMilestones.map((m, idx) => {
        const meta = CONTRACT_META_MAP[m.contractId];
        return {
          id: m.id,
          code: `MS-${m.id.replace(/^ms-/, "") || 200 + idx}`,
          title: m.title,
          contractTitle: meta?.contractTitle ?? `Contract #${m.contractId.slice(0, 8)}`,
          counterparty: meta?.counterparty ?? "Hanna Tadesse",
          counterpartyEmail: meta?.counterpartyEmail ?? "hanna.tadesse@addisdev.et",
          category: meta?.category ?? "Web app development",
          rail: meta?.rail ?? RAILS[idx % RAILS.length],
          escrowState: stateOverrides[m.id] ?? toLedgerState(m.escrowState),
          amountMinor: m.amountMinor,
          feeMinor: Math.round(m.amountMinor * 0.1),
          dueDate: (m.dueDate || "").slice(0, 10),
          updatedAt: (m.releasedAt || m.submittedAt || m.dueDate || "").slice(0, 10),
        };
      }),
    [effectiveMilestones, stateOverrides],
  );

  const derivedKanbanTasks = useMemo<KanbanTask[]>(
    () =>
      effectiveMilestones.map((m, idx) => {
        const meta = CONTRACT_META_MAP[m.contractId];
        const state = stateOverrides[m.id] ?? m.escrowState;
        return {
          id: m.id,
          code: `MS-${m.id.replace(/^ms-/, "") || 200 + idx}`,
          title: m.title,
          contractTitle: meta?.contractTitle ?? `Contract #${m.contractId.slice(0, 8)}`,
          counterparty: meta?.counterparty ?? "Hanna Tadesse",
          rail: meta?.rail ?? RAILS[idx % RAILS.length],
          amountMinor: m.amountMinor,
          dueDate: (m.dueDate || "").slice(0, 10),
          priority: m.amountMinor >= 5_000_000 ? "HIGH" : m.amountMinor >= 3_500_000 ? "MEDIUM" : "LOW",
          column: toKanbanCol(state),
          category: meta?.category ?? "Web app development",
        };
      }),
    [effectiveMilestones, stateOverrides],
  );

  const derivedScheduleEvents = useMemo<ScheduleEvent[]>(() => {
    const milestoneEvents: ScheduleEvent[] = effectiveMilestones.map((m, idx) => {
      const meta = CONTRACT_META_MAP[m.contractId];
      return {
        id: `ms-${m.id}`,
        title: m.title,
        contractRef: `${meta?.contractTitle ?? m.contractId} · MS-0${m.sequenceNumber || 1}`,
        date: (m.dueDate || new Date().toISOString()).slice(0, 10),
        time: idx % 2 === 0 ? "14:00 EAT" : "17:00 EAT",
        type:
          m.escrowState === "RELEASED"
            ? "PAYOUT_RELEASE"
            : m.escrowState === "DISPUTED"
              ? "COMPLIANCE_KYC"
              : "MILESTONE_DUE",
        amountMinor: m.amountMinor,
        rail: meta?.rail ?? RAILS[idx % RAILS.length],
        status:
          m.escrowState === "RELEASED"
            ? "COMPLETED"
            : m.escrowState === "DISPUTED"
              ? "AT_RISK"
              : "SCHEDULED",
        counterparty: meta?.counterparty ?? "Hanna Tadesse",
      };
    });
    const jobEvents: ScheduleEvent[] = effectiveJobs.slice(0, 10).map((j, idx) => ({
      id: `job-${j.id}`,
      title: j.title,
      contractRef: `BRIEF-${j.id.replace(/^job-/, "")}`,
      date: (j.deadline || new Date().toISOString()).slice(0, 10),
      time: "18:00 EAT",
      type: "PROPOSAL_DEADLINE",
      amountMinor: j.budgetMaxMinor,
      rail: RAILS[idx % RAILS.length],
      status: j.status === "OPEN" ? "SCHEDULED" : "COMPLETED",
      counterparty: j.category.replaceAll("_", " "),
    }));
    return [...milestoneEvents, ...jobEvents];
  }, [effectiveMilestones, effectiveJobs]);

  const kanbanTasks = customTasks ?? derivedKanbanTasks;
  const scheduleEvents = customEvents ?? derivedScheduleEvents;

  // Derived KPI metrics
  const escrowSecuredMinor = useMemo(
    () =>
      effectiveMilestones
        .filter((m) =>
          [
            "ESCROW_HELD",
            "WORK_IN_PROGRESS",
            "SUBMITTED_FOR_REVIEW",
            "ACCEPTED",
          ].includes(m.escrowState),
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

  const activeMilestoneCount = useMemo(
    () =>
      effectiveMilestones.filter((m) => m.escrowState !== "RELEASED").length,
    [effectiveMilestones],
  );

  const openJobsCount = useMemo(
    () => effectiveJobs.filter((j) => j.status === "OPEN").length,
    [effectiveJobs],
  );

  const handleStatusUpdate = (
    id: string,
    nextState: LedgerContractRecord["escrowState"],
  ) => {
    setStateOverrides((prev) => ({ ...prev, [id]: nextState }));
  };

  return (
    <section className="sh-dashboard-wrap">
      {/* Top Sub-Header: Dashboard Mode Switcher + Primary Actions */}
      <div className="sh-subnav-bar">
        <div className="sh-subnav-left">
          <div
            className="sh-segmented"
            role="tablist"
            aria-label="Select Dashboard Template Mode"
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
            <div
              className="sh-segmented"
              role="tablist"
              aria-label="Operations view mode"
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
          )}
        </div>

        <div className="sh-subnav-right">
          <button
            type="button"
            className="sh-btn sh-btn-secondary"
            onClick={() => setCommandPaletteOpen(true)}
            title="Open Command Palette (Ctrl+K)"
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
            title="Refresh workspace data"
            aria-label="Refresh workspace data"
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
      <div className="sh-kpi-grid">
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
            <span className="sh-trend-delta positive sh-mono">
              <TrendingUp size={12} /> +18.4%
            </span>
            <span className="sh-cell-meta">
              vs prior 30d · {effectiveTopUps.length} top-ups
            </span>
            <ChevronDown size={14} className="sh-kpi-chev" />
          </div>

          {expandedKpi === "wallet" && (
            <div
              className="sh-kpi-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sh-kv-row">
                <span>Approved Telebirr / CBE Top-Ups</span>
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
                <span>Pending Receipt Verification</span>
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
                Open Wallet & Top-Up Desk <ArrowRight size={12} />
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
            <span className="sh-trend-delta positive sh-mono">
              <TrendingUp size={12} /> +24.2%
            </span>
            <span className="sh-cell-meta">
              100% milestone-backed · {activeMilestoneCount} active
            </span>
            <ChevronDown size={14} className="sh-kpi-chev" />
          </div>

          {expandedKpi === "escrow" && (
            <div
              className="sh-kpi-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sh-kv-row">
                <span>Released & Settled YTD</span>
                <strong className="sh-mono">
                  ETB {(releasedMinor / 100).toLocaleString()}
                </strong>
              </div>
              <div className="sh-kv-row">
                <span>Submitted Awaiting QA</span>
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
                Inspect Escrow Contracts <ArrowRight size={12} />
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
            <span className="sh-trend-delta positive sh-mono">
              <ArrowUpRight size={12} /> 98.2% on-time
            </span>
            <span className="sh-cell-meta">
              Across {new Set(effectiveMilestones.map((m) => m.contractId)).size}{" "}
              contracts
            </span>
            <ChevronDown size={14} className="sh-kpi-chev" />
          </div>

          {expandedKpi === "milestones" && (
            <div
              className="sh-kpi-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sh-kv-row">
                <span>In Active Delivery</span>
                <strong className="sh-mono">
                  {
                    effectiveMilestones.filter(
                      (m) => m.escrowState === "WORK_IN_PROGRESS",
                    ).length
                  }{" "}
                  milestones
                </strong>
              </div>
              <div className="sh-kv-row">
                <span>Escrow Funded & Ready</span>
                <strong className="sh-mono">
                  {
                    effectiveMilestones.filter(
                      (m) => m.escrowState === "ESCROW_HELD",
                    ).length
                  }{" "}
                  milestones
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
                Open Milestone Kanban Board <ArrowRight size={12} />
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
            <span className="sh-kpi-label">{d.kpiOpenBriefs}</span>
            <Briefcase size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">{openJobsCount}</div>
          <div className="sh-kpi-foot">
            <span className="sh-trend-delta positive sh-mono">
              <TrendingUp size={12} /> +5 this week
            </span>
            <span className="sh-cell-meta">Verified Ethiopian clients</span>
            <ChevronDown size={14} className="sh-kpi-chev" />
          </div>

          {expandedKpi === "jobs" && (
            <div
              className="sh-kpi-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sh-kv-row">
                <span>Combined Max Budget Pool</span>
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
                Explore All Briefs <ArrowRight size={12} />
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
                          <span className="sh-mono">Due {ms.dueDate.slice(0, 10)}</span>
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
                    {d.recommendedBriefsDesc}
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
                      <div className="sh-cell-primary">{d.noOpenBriefsTitle}</div>
                      <div className="sh-cell-meta">
                        {d.noOpenBriefsDesc}
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
                          <span className="sh-mono">Deadline {job.deadline.slice(0, 10)}</span>
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

          {!canWork && onSelectProfile && (
            <div style={{ marginTop: 16 }}>
              <FeaturedCarousel onProfileClick={onSelectProfile} />
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
              onOpenContracts={() => onNavigateView("contracts")}
              onStatusUpdate={handleStatusUpdate}
            />
          )}

          {opsSubTab === "kanban" && (
            <KanbanBoardView
              tasks={kanbanTasks}
              onTasksChange={setCustomTasks}
            />
          )}

          {opsSubTab === "calendar" && (
            <CalendarScheduleView
              events={scheduleEvents}
              onEventsChange={setCustomEvents}
            />
          )}
        </div>
      )}
    </section>
  );
}
