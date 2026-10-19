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
import {
  FALLBACK_JOBS,
  FALLBACK_MILESTONES,
  FALLBACK_TOPUPS,
  FALLBACK_WALLET,
  INITIAL_KANBAN_TASKS,
  INITIAL_LEDGER_RECORDS,
  INITIAL_SCHEDULE_EVENTS,
  type KanbanTask,
  type LedgerContractRecord,
  type ScheduleEvent,
  type TimeRangeKey,
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

  const [timeRange, setTimeRange] = useState<TimeRangeKey>("30d");
  const [expandedKpi, setExpandedKpi] = useState<
    "wallet" | "escrow" | "milestones" | "jobs" | null
  >(null);

  // Stateful interactive CRM collections
  const [ledgerRecords, setLedgerRecords] = useState<LedgerContractRecord[]>(
    INITIAL_LEDGER_RECORDS,
  );
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>(
    INITIAL_KANBAN_TASKS,
  );
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>(
    INITIAL_SCHEDULE_EVENTS,
  );

  // Merge live API data with rich fallback when backend arrays are empty
  const effectiveWallet =
    wallet.balanceMinor > 0 ? wallet : FALLBACK_WALLET;
  const effectiveJobs = jobs.length > 0 ? jobs : FALLBACK_JOBS;
  const effectiveMilestones =
    milestones.length > 0 ? milestones : FALLBACK_MILESTONES;
  const effectiveTopUps = topUps.length > 0 ? topUps : FALLBACK_TOPUPS;

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
    setLedgerRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, escrowState: nextState } : r)),
    );
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
              <span>Dashboard 1: Analytics & KPIs</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={dashboardVariant === "dashboard-2"}
              className={`sh-seg-btn ${dashboardVariant === "dashboard-2" ? "active" : ""}`}
              onClick={() => setDashboardVariant("dashboard-2")}
            >
              <Table2 size={14} />
              <span>Dashboard 2: Pipeline, Kanban & Schedule</span>
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
                <Table2 size={13} /> Data Table ({ledgerRecords.length})
              </button>
              <button
                type="button"
                className={`sh-seg-btn ${opsSubTab === "kanban" ? "active" : ""}`}
                onClick={() => setOpsSubTab("kanban")}
              >
                <Kanban size={13} /> Kanban ({kanbanTasks.length})
              </button>
              <button
                type="button"
                className={`sh-seg-btn ${opsSubTab === "calendar" ? "active" : ""}`}
                onClick={() => setOpsSubTab("calendar")}
              >
                <Calendar size={13} /> Calendar ({scheduleEvents.length})
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
            <span>Quick Jump</span>
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
              <Plus size={14} /> Post Job Brief
            </button>
          )}
          {!canHire && canWork && (
            <button
              type="button"
              className="sh-btn sh-btn-primary"
              onClick={() => onNavigateView("jobs")}
            >
              <Briefcase size={14} /> Browse Open Briefs
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
            <span className="sh-kpi-label">Available Wallet Balance</span>
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
            <span className="sh-kpi-label">Protected in Escrow Vault</span>
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
            <span className="sh-kpi-label">Active Milestones & Deliverables</span>
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
            <span className="sh-kpi-label">Open Marketplace Briefs</span>
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
            />
            <InteractiveRailVelocityBarChart range={timeRange} />
          </div>

          {/* 2-Column Operational Snapshot: Recent Escrow Ledger + Open Briefs */}
          <div className="sh-charts-split">
            {/* Left: Recent Milestone Escrow Activity */}
            <div className="sh-card">
              <div className="sh-card-header">
                <div>
                  <h3 className="sh-card-title">Recent Escrow & Milestone Activity</h3>
                  <p className="sh-card-desc">
                    Live contract deliverables and automated payout release timers
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
                  Open Full Data Table <ArrowRight size={13} />
                </button>
              </div>

              <div className="sh-compact-list">
                {effectiveMilestones.slice(0, 5).map((ms) => (
                  <div key={ms.id} className="sh-compact-row">
                    <div className="sh-compact-row-main">
                      <div className="sh-cell-primary">{ms.title}</div>
                      <div className="sh-cell-meta">
                        <span className="sh-mono">#{ms.id.slice(0, 8)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ms.escrowState.replaceAll("_", " ")}</span>
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
                        Contract <ArrowRight size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Matching Opportunities / Quick Pipeline */}
            <div className="sh-card">
              <div className="sh-card-header">
                <div>
                  <h3 className="sh-card-title">
                    {canWork ? "Recommended Marketplace Briefs" : "Active Hiring Briefs"}
                  </h3>
                  <p className="sh-card-desc">
                    Escrow-backed opportunities with verified Ethiopian counterparties
                  </p>
                </div>
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={() => onNavigateView("jobs")}
                >
                  View All ({effectiveJobs.length}) <ArrowRight size={13} />
                </button>
              </div>

              <div className="sh-compact-list">
                {effectiveJobs.slice(0, 4).map((job) => (
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
                        {canWork ? "Submit Proposal" : "Manage"}
                      </button>
                    </div>
                  </div>
                ))}
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
              onTasksChange={setKanbanTasks}
            />
          )}

          {opsSubTab === "calendar" && (
            <CalendarScheduleView
              events={scheduleEvents}
              onEventsChange={setScheduleEvents}
            />
          )}
        </div>
      )}
    </section>
  );
}
