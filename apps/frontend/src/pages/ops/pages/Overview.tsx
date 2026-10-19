/* ────────────────────────────────────────────────────────────────────────
   Overview.tsx — Upgraded Shadcn Dual-Dashboard Command Center for Staff Ops:
   - Dashboard 1: Executive Command, KPI Trend Cards, Action Center,
     Interactive Cashflow & Rail Charts, Escrow Donut, Queue Workload
   - Dashboard 2: Operations Ledger Data Grid, Case & Milestone Kanban Board,
     and Compliance & Payout SLA Schedule Calendar
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import {
  Activity,
  BarChart3,
  CreditCard,
  DollarSign,
  RefreshCw,
  Scale,
  TriangleAlert,
  UserCheck,
  Users,
  Wallet,
  XCircle,
  ChevronRight,
  Table2,
  Kanban,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { dts, fmt, opsApi, useApi } from "../opsApi";
import type { OverviewBundle } from "../opsTypes";
import { AreaChart, BarChart, ChartLegend, Donut, HBars } from "./../components/charts";
import { Empty, ErrorBox, LoadingBox } from "../components/ui";
import { ActionCenter, buildActionItems } from "../components/actionCenter";
import type { ActionItem } from "../components/actionCenter";
import { useOpsUi } from "../opsUiContext";
import type { OpsPageId } from "../opsNav";
import {
  INITIAL_KANBAN_TASKS,
  INITIAL_LEDGER_RECORDS,
  INITIAL_SCHEDULE_EVENTS,
  type KanbanTask,
  type LedgerContractRecord,
  type ScheduleEvent,
  type TimeRangeKey,
} from "../../../components/dashboard/dashboardData";
import {
  InteractiveCashflowAreaChart,
  InteractiveRailVelocityBarChart,
} from "../../../components/dashboard/ShadcnCharts";
import { AdvancedDataTable } from "../../../components/dashboard/AdvancedDataTable";
import { KanbanBoardView } from "../../../components/dashboard/KanbanBoardView";
import { CalendarScheduleView } from "../../../components/dashboard/CalendarScheduleView";

const ESC_C: Record<string, string> = {
  ESCROW_HELD: "#0284c7",
  WORK_IN_PROGRESS: "#16a34a",
  SUBMITTED_FOR_REVIEW: "#d97706",
  DISPUTED: "#dc2626",
  RELEASED: "#059669",
};

const actTone = (a: string): [string, typeof Wallet] =>
  a.includes("PAYOUT") || a.includes("PAYMENT")
    ? ["#059669", CreditCard]
    : a.includes("DISPUTE") || a.includes("RISK")
      ? ["#dc2626", XCircle]
      : a.includes("ESCROW")
        ? ["#0284c7", DollarSign]
        : ["#16a34a", Activity];

export default function Overview() {
  const ui = useOpsUi();
  const { data, error, loading, reload } = useApi<OverviewBundle>(opsApi.overview);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [opsDashMode, setOpsDashMode] = useState<"dashboard-1" | "dashboard-2">(
    "dashboard-1",
  );
  const [opsSubTab, setOpsSubTab] = useState<"table" | "kanban" | "calendar">(
    "table",
  );
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("30d");

  const [ledgerRecords, setLedgerRecords] = useState<LedgerContractRecord[]>(
    INITIAL_LEDGER_RECORDS,
  );
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>(
    INITIAL_KANBAN_TASKS,
  );
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>(
    INITIAL_SCHEDULE_EVENTS,
  );

  if (loading && !data) return <LoadingBox />;
  if (error || !data) return <ErrorBox error={error ?? "No data"} reload={reload} />;

  const m = data.metrics;
  const items = buildActionItems({
    disputes: data.queues.disputes,
    riskFlags: data.riskFlags,
    health: data.health,
    recon: data.recon,
    payouts: data.queues.payouts,
    kyc: data.queues.kyc,
    reports: data.queues.reports,
  });

  const segMap = new Map<string, number>();
  data.escrows.forEach((e) => segMap.set(e.state, (segMap.get(e.state) ?? 0) + e.amt));
  const escSegs = [...segMap.entries()].map(([s, v]) => ({
    label: s.replace(/_/g, " "),
    value: v,
    color: ESC_C[s] ?? "#93a0b4",
  }));

  const wl = [
    {
      label: "KYC Reviews",
      value: data.queues.kyc.filter((k) => k.status === "UNDER_REVIEW").length,
      color: "#16a34a",
      meta: "under review",
    },
    {
      label: "Dispute Mediation",
      value: data.queues.disputes.filter((d) => d.stage === "STAGE_3_MEDIATION").length,
      color: "#dc2626",
      meta: "stage 3",
    },
    {
      label: "Profile Reports",
      value: data.queues.reports.filter((r) => r.status === "OPEN").length,
      color: "#d97706",
      meta: "open",
    },
    {
      label: "Payouts to Settle",
      value: data.queues.payouts.filter(
        (p) => p.status === "PENDING" || p.status === "PROCESSING",
      ).length,
      color: "#059669",
      meta: "pending",
    },
    {
      label: "Recon Mismatches",
      value: data.recon.filter((r) => r.rec === "MISMATCH").length,
      color: "#0284c7",
      meta: "to clear",
    },
  ];

  const qa: [string, string, number, typeof Wallet, string][] = [
    [
      "kyc",
      "KYC Reviews",
      data.queues.kyc.filter((k) => k.status === "UNDER_REVIEW").length,
      UserCheck,
      "#16a34a",
    ],
    [
      "dispute-queue",
      "Dispute Mediation",
      data.queues.disputes.filter((d) => d.stage === "STAGE_3_MEDIATION").length,
      Scale,
      "#dc2626",
    ],
    [
      "reports-queue",
      "Profile Reports",
      data.queues.reports.filter((r) => r.status === "OPEN").length,
      TriangleAlert,
      "#d97706",
    ],
    ["payouts", "Review Payouts", m.pendingPayouts, Wallet, "#d97706"],
    [
      "monitoring",
      "System Health Checks",
      Object.values(data.health.checks).filter((c) => !c.ok).length,
      Activity,
      "#059669",
    ],
  ];

  const onOpen = (it: ActionItem) => ui.navigate(it.page, it.refId);

  return (
    <div className="fade">
      {/* Sub-navigation bar with Dual-Dashboard Mode Switcher */}
      <div className="sh-subnav-bar" style={{ marginBottom: 18 }}>
        <div className="sh-subnav-left">
          <div className="sh-segmented" role="tablist" aria-label="Ops Dashboard Mode">
            <button
              type="button"
              role="tab"
              aria-selected={opsDashMode === "dashboard-1"}
              className={`sh-seg-btn ${opsDashMode === "dashboard-1" ? "active" : ""}`}
              onClick={() => setOpsDashMode("dashboard-1")}
            >
              <BarChart3 size={14} />
              <span>Dashboard 1: Command & Analytics</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={opsDashMode === "dashboard-2"}
              className={`sh-seg-btn ${opsDashMode === "dashboard-2" ? "active" : ""}`}
              onClick={() => setOpsDashMode("dashboard-2")}
            >
              <Table2 size={14} />
              <span>Dashboard 2: Ledger Grid, Kanban & SLA Calendar</span>
            </button>
          </div>

          {opsDashMode === "dashboard-2" && (
            <div className="sh-segmented" role="tablist" aria-label="Operations tool">
              <button
                type="button"
                className={`sh-seg-btn ${opsSubTab === "table" ? "active" : ""}`}
                onClick={() => setOpsSubTab("table")}
              >
                <Table2 size={13} /> Escrow Grid ({ledgerRecords.length})
              </button>
              <button
                type="button"
                className={`sh-seg-btn ${opsSubTab === "kanban" ? "active" : ""}`}
                onClick={() => setOpsSubTab("kanban")}
              >
                <Kanban size={13} /> Case & Milestone Kanban ({kanbanTasks.length})
              </button>
              <button
                type="button"
                className={`sh-seg-btn ${opsSubTab === "calendar" ? "active" : ""}`}
                onClick={() => setOpsSubTab("calendar")}
              >
                <Calendar size={13} /> SLA Schedule ({scheduleEvents.length})
              </button>
            </div>
          )}
        </div>

        <div className="sh-subnav-right">
          <span className="sh-cell-meta sh-mono">
            Synced {dts(data.health.checkedAt)}
          </span>
          <button type="button" className="sh-btn sh-btn-secondary" onClick={reload}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* 4-Column Primary KPI Stat Cards */}
      <div className="sh-kpi-grid" style={{ marginBottom: 16 }}>
        <article
          className="sh-kpi-card"
          onClick={() => ui.navigate("users")}
          role="button"
          tabIndex={0}
        >
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">Registered Platform Users</span>
            <Users size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">{m.totalUsers.toLocaleString()}</div>
          <div className="sh-kpi-foot">
            <span className="sh-trend-delta positive sh-mono">
              <TrendingUp size={12} /> +14.2%
            </span>
            <span className="sh-cell-meta">
              {m.pendingIdentity} pending Fayda KYC
            </span>
          </div>
        </article>

        <article
          className="sh-kpi-card"
          onClick={() => ui.navigate("escrow")}
          role="button"
          tabIndex={0}
        >
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">Custodial Funds in Escrow</span>
            <DollarSign size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">{fmt(m.fundsInEscrowMinor)}</div>
          <div className="sh-kpi-foot">
            <span className="sh-trend-delta positive sh-mono">
              <TrendingUp size={12} /> +21.8%
            </span>
            <span className="sh-cell-meta">
              Across {m.activeContracts} active contracts
            </span>
          </div>
        </article>

        <article
          className="sh-kpi-card"
          onClick={() => ui.navigate("payouts")}
          role="button"
          tabIndex={0}
        >
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">Pending Disbursement Queue</span>
            <Wallet size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">{m.pendingPayouts}</div>
          <div className="sh-kpi-foot">
            <span className="sh-cell-meta">
              {m.pendingPayments} pending payments · {m.pendingTopUps} top-ups
            </span>
          </div>
        </article>

        <article
          className="sh-kpi-card"
          onClick={() => ui.navigate("dispute-queue")}
          role="button"
          tabIndex={0}
        >
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">Open Mediation & KYC Triage</span>
            <Scale size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">
            {m.openDisputes + m.pendingIdentity}
          </div>
          <div className="sh-kpi-foot">
            <span className="sh-cell-meta">
              {m.openDisputes} disputes · {m.pendingIdentity} KYC ·{" "}
              {m.openSupportTickets} tickets
            </span>
          </div>
        </article>
      </div>

      {opsDashMode === "dashboard-1" ? (
        <>
          <ActionCenter
            items={items}
            done={done}
            onToggle={(i) => setDone((d) => ({ ...d, [i]: !d[i] }))}
            onOpen={onOpen}
          />

          {/* Interactive Shadcn Cashflow & Rail Velocity Charts */}
          <div className="sh-charts-split" style={{ marginBottom: 16 }}>
            <InteractiveCashflowAreaChart
              range={timeRange}
              onRangeChange={setTimeRange}
            />
            <InteractiveRailVelocityBarChart range={timeRange} />
          </div>

          <div className="grid gc-2-1" style={{ marginBottom: 16 }}>
            <div className="card card-pad">
              <div className="sec-title">
                <BarChart3 size={16} /> Daily Settlement Volume (14-Day Window){" "}
                <span style={{ fontSize: 11, color: "var(--ops-text-3)", fontWeight: 700 }}>
                  ETB millions / day
                </span>
              </div>
              <AreaChart
                labels={data.series.volume14.labels}
                values={data.series.volume14.values}
                color="#16a34a"
              />
            </div>
            <div className="card card-pad">
              <div className="sec-title">
                <DollarSign size={16} /> Escrow by State
              </div>
              {escSegs.length ? (
                <Donut segs={escSegs} centerSub="in escrow" />
              ) : (
                <Empty icon={DollarSign}>No escrow rows.</Empty>
              )}
            </div>
          </div>

          <div className="grid gc-1-1" style={{ marginBottom: 16 }}>
            <div className="card card-pad">
              <div className="sec-title">
                <Wallet size={16} /> Payouts vs Refunds — Weekly
              </div>
              <BarChart
                labels={data.series.payoutsWeekly.labels}
                series={[
                  {
                    name: "Payouts",
                    color: "#16a34a",
                    values: data.series.payoutsWeekly.payouts,
                  },
                  {
                    name: "Refunds",
                    color: "#dc2626",
                    values: data.series.payoutsWeekly.refunds,
                  },
                ]}
              />
              <ChartLegend
                series={[
                  { name: "Payouts", color: "#16a34a" },
                  { name: "Refunds", color: "#dc2626" },
                ]}
              />
            </div>
            <div className="card card-pad">
              <div className="sec-title">
                <Activity size={16} /> Review Workload — Open Items per Queue
              </div>
              <HBars rows={wl} />
            </div>
          </div>

          <div className="grid gc-2-1">
            <div className="card card-pad">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <div className="sec-title" style={{ marginBottom: 0 }}>
                  Recent Platform Audit Stream
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => ui.navigate("audit")}
                >
                  View all
                </button>
              </div>
              {data.activity.map((a, i) => {
                const [fg, Icon] = actTone(a.a);
                return (
                  <div className="act-row" key={`${a.a}-${i}`}>
                    <div className="act-ic" style={{ color: fg }}>
                      <Icon size={17} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="act-t">{a.a.replace(/_/g, " ")}</div>
                      <div className="act-s">
                        {a.e} · {dts(a.t)}
                      </div>
                    </div>
                    <span style={{ color: "var(--ops-text-3)" }}>
                      <ChevronRight size={15} />
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="card card-pad">
              <div className="sec-title">Priority Staff Queues</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {qa.map(([pg, l, n, Icon, c]) => (
                  <button
                    className="qa-btn"
                    key={pg}
                    onClick={() => ui.navigate(pg as OpsPageId)}
                  >
                    <span className="qa-l">
                      <span className="qa-ic" style={{ color: c }}>
                        <Icon size={16} />
                      </span>
                      {l}
                    </span>
                    <span className="qa-n sh-mono" style={{ color: c }}>
                      {n}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div>
          {opsSubTab === "table" && (
            <AdvancedDataTable
              records={ledgerRecords}
              onOpenContracts={() => ui.navigate("contracts")}
              onStatusUpdate={(id, nextState) =>
                setLedgerRecords((prev) =>
                  prev.map((r) =>
                    r.id === id ? { ...r, escrowState: nextState } : r,
                  ),
                )
              }
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
    </div>
  );
}
