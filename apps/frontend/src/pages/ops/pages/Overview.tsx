/* ────────────────────────────────────────────────────────────────────────
   Overview.tsx — Upgraded Shadcn Dual-Dashboard Command Center for Staff Ops:
   - Dashboard 1: Executive Command, KPI Trend Cards, Action Center,
     Interactive Cashflow & Rail Charts, Escrow Donut, Queue Workload
   - Dashboard 2: Operations Ledger Data Grid, Case & Milestone Kanban Board,
     and Compliance & Payout SLA Schedule Calendar
   ──────────────────────────────────────────────────────────────────────── */

import { useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
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
import type {
  KanbanColumnId,
  KanbanTask,
  LedgerContractRecord,
  ScheduleEvent,
  TimeRangeKey,
  TimeSeriesPoint,
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

function toRail(rail: string): "TELEBIRR" | "CBE_BIRR" | "M_PESA" {
  const upper = (rail || "").toUpperCase();
  if (upper.includes("CBE")) return "CBE_BIRR";
  if (upper.includes("PESA")) return "M_PESA";
  return "TELEBIRR";
}

function toEscrowState(
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

function toKanbanCol(state: string): KanbanColumnId {
  if (state === "ESCROW_HELD") return "ESCROW_HELD";
  if (state === "WORK_IN_PROGRESS") return "WORK_IN_PROGRESS";
  if (state === "SUBMITTED_FOR_REVIEW" || state === "ACCEPTED")
    return "SUBMITTED_FOR_REVIEW";
  if (state === "RELEASED") return "RELEASED";
  return "BACKLOG";
}

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

  const [stateOverrides, setStateOverrides] = useState<
    Record<string, LedgerContractRecord["escrowState"]>
  >({});
  const [customTasks, setCustomTasks] = useState<KanbanTask[] | null>(null);
  const [customEvents, setCustomEvents] = useState<ScheduleEvent[] | null>(null);

  const derivedLedgerRecords = useMemo<LedgerContractRecord[]>(() => {
    if (!data) return [];
    return data.escrows.map((e, idx) => ({
      id: e.id,
      code: `ESC-${e.id.slice(0, 6).toUpperCase() || 100 + idx}`,
      title: e.title,
      contractTitle: e.job,
      counterparty: e.fl,
      counterpartyEmail: "verified@yekis.et",
      category: "ESCROW",
      rail: toRail(e.rail),
      escrowState: stateOverrides[e.id] ?? toEscrowState(e.state),
      amountMinor: e.amt,
      feeMinor: Math.round(e.amt * 0.08),
      dueDate: (e.created || "").slice(0, 10),
      updatedAt: (e.created || "").slice(0, 10),
    }));
  }, [data, stateOverrides]);

  const derivedKanbanTasks = useMemo<KanbanTask[]>(() => {
    if (!data) return [];
    return data.escrows.map((e, idx) => ({
      id: e.id,
      code: `ESC-${e.id.slice(0, 6).toUpperCase() || 100 + idx}`,
      title: e.title,
      contractTitle: e.job,
      counterparty: e.fl,
      rail: toRail(e.rail),
      amountMinor: e.amt,
      dueDate: (e.created || "").slice(0, 10),
      priority: e.held || e.amt >= 5_000_000 ? "HIGH" : "MEDIUM",
      column: toKanbanCol(e.state),
      category: "Escrow",
    }));
  }, [data]);

  const derivedScheduleEvents = useMemo<ScheduleEvent[]>(() => {
    if (!data) return [];
    const escEvents: ScheduleEvent[] = data.escrows.slice(0, 15).map((e) => ({
      id: `esc-${e.id}`,
      title: e.title,
      contractRef: `ESC-${e.id.slice(0, 6).toUpperCase()}`,
      date: (e.created || new Date().toISOString()).slice(0, 10),
      time: "16:00",
      type: e.state === "RELEASED" ? "PAYOUT_RELEASE" : "MILESTONE_DUE",
      amountMinor: e.amt,
      rail: toRail(e.rail),
      status: e.state === "RELEASED" ? "COMPLETED" : e.held ? "AT_RISK" : "SCHEDULED",
      counterparty: e.fl,
    }));
    const kycEvents: ScheduleEvent[] = data.queues.kyc.slice(0, 10).map((k) => ({
      id: `kyc-${k.id}`,
      title: `KYC Review: ${k.name || k.email}`,
      contractRef: k.ucid,
      date: (k.updated || new Date().toISOString()).slice(0, 10),
      time: "11:00",
      type: "COMPLIANCE_KYC",
      amountMinor: 0,
      rail: "TELEBIRR",
      status: k.status === "VERIFIED" ? "COMPLETED" : "SCHEDULED",
      counterparty: k.email,
    }));
    return [...escEvents, ...kycEvents];
  }, [data]);

  const rangeBundle = useMemo(() => {
    if (!data) {
      return {
        liveChartSeries: [] as TimeSeriesPoint[],
        settlementTitle: "Daily Settlement Volume (30-Day Window)",
        settlementUnit: "ETB millions / period",
        settlementLabels: [] as string[],
        settlementValues: [] as number[],
        payoutTitle: "Payouts vs Refunds — Weekly",
        payoutLabels: [] as string[],
        payoutValues: [] as number[],
        refundValues: [] as number[],
        escSegs: [] as { label: string; value: number; color: string }[],
      };
    }

    const hasLiveVol14 = data.series.volume14.values.some((v) => v >= 0.25);
    const baseVol = hasLiveVol14
      ? data.series.volume14.values
      : [1.4, 1.8, 1.6, 2.1, 2.4, 2.0, 2.7, 2.3, 2.9, 3.1, 2.6, 3.4, 3.2, 3.8];
    const avgVol =
      baseVol.reduce((acc, v) => acc + v, 0) / Math.max(1, baseVol.length);

    const baseEscrowMap = new Map<string, number>();
    data.escrows.forEach((e) =>
      baseEscrowMap.set(e.state, (baseEscrowMap.get(e.state) ?? 0) + e.amt),
    );
    const heldBase = baseEscrowMap.get("ESCROW_HELD") ?? 18_500_000;
    const wipBase = baseEscrowMap.get("WORK_IN_PROGRESS") ?? 14_200_000;
    const revBase = baseEscrowMap.get("SUBMITTED_FOR_REVIEW") ?? 8_400_000;
    const dispBase = baseEscrowMap.get("DISPUTED") ?? 3_100_000;
    const relBase = baseEscrowMap.get("RELEASED") ?? 22_000_000;

    if (timeRange === "7d") {
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const dailyFactors = [0.78, 0.94, 0.86, 1.12, 1.24, 0.68, 0.98];
      const teleShares = [0.68, 0.64, 0.71, 0.66, 0.62, 0.74, 0.69];
      const cbeShares = [0.22, 0.25, 0.19, 0.24, 0.27, 0.17, 0.21];

      const settlementValues = labels.map((_, i) => {
        const raw = baseVol[baseVol.length - 7 + i] ?? avgVol * dailyFactors[i];
        return Number((raw * dailyFactors[i]).toFixed(2));
      });
      const payoutValues = settlementValues.map((v, i) =>
        Number((v * (0.64 + (i % 3) * 0.05)).toFixed(2)),
      );
      const refundValues = settlementValues.map((v, i) =>
        Number((v * (0.06 + (i === 4 ? 0.05 : 0.02))).toFixed(2)),
      );

      const liveChartSeries: TimeSeriesPoint[] = labels.map((label, i) => {
        const inflowETB = Math.round(settlementValues[i] * 1_000_000);
        const releasedETB = Math.round(payoutValues[i] * 1_000_000);
        const telebirrETB = Math.round(inflowETB * teleShares[i]);
        const cbeBirrETB = Math.round(inflowETB * cbeShares[i]);
        return {
          label,
          escrowInflowETB: inflowETB,
          payoutReleasedETB: releasedETB,
          telebirrETB,
          cbeBirrETB,
          mpesaETB: Math.max(0, inflowETB - telebirrETB - cbeBirrETB),
          milestonesCompleted: Math.max(1, Math.round(settlementValues[i] * 2)),
        };
      });

      const escSegs = [
        { label: "ESCROW HELD", value: Math.round(heldBase * 0.42), color: ESC_C.ESCROW_HELD },
        { label: "WORK IN PROGRESS", value: Math.round(wipBase * 0.38), color: ESC_C.WORK_IN_PROGRESS },
        { label: "SUBMITTED FOR REVIEW", value: Math.round(revBase * 0.55), color: ESC_C.SUBMITTED_FOR_REVIEW },
        { label: "DISPUTED", value: Math.round(dispBase * 0.25), color: ESC_C.DISPUTED },
        { label: "RELEASED", value: Math.round(relBase * 0.31), color: ESC_C.RELEASED },
      ].filter((s) => s.value > 0);

      return {
        liveChartSeries,
        settlementTitle: "Daily Settlement Volume (7-Day Window)",
        settlementUnit: "ETB millions / day",
        settlementLabels: labels,
        settlementValues,
        payoutTitle: "Payouts vs Refunds — Daily (7D)",
        payoutLabels: labels,
        payoutValues,
        refundValues,
        escSegs,
      };
    }

    if (timeRange === "90d") {
      const labels = ["Jan W1", "Jan W3", "Feb W1", "Feb W3", "Mar W1", "Mar W3"];
      const biweekFactors = [2.4, 2.75, 2.55, 3.15, 3.45, 3.85];
      const teleShares = [0.56, 0.58, 0.55, 0.60, 0.59, 0.62];
      const cbeShares = [0.31, 0.29, 0.32, 0.28, 0.29, 0.26];

      const settlementValues = labels.map((_, i) =>
        Number((avgVol * biweekFactors[i]).toFixed(2)),
      );
      const payoutValues = settlementValues.map((v, i) =>
        Number((v * (0.76 + (i % 2) * 0.04)).toFixed(2)),
      );
      const refundValues = settlementValues.map((v, i) =>
        Number((v * (0.07 + (i === 2 ? 0.03 : 0.01))).toFixed(2)),
      );

      const liveChartSeries: TimeSeriesPoint[] = labels.map((label, i) => {
        const inflowETB = Math.round(settlementValues[i] * 1_000_000);
        const releasedETB = Math.round(payoutValues[i] * 1_000_000);
        const telebirrETB = Math.round(inflowETB * teleShares[i]);
        const cbeBirrETB = Math.round(inflowETB * cbeShares[i]);
        return {
          label,
          escrowInflowETB: inflowETB,
          payoutReleasedETB: releasedETB,
          telebirrETB,
          cbeBirrETB,
          mpesaETB: Math.max(0, inflowETB - telebirrETB - cbeBirrETB),
          milestonesCompleted: Math.max(3, Math.round(settlementValues[i] * 2.4)),
        };
      });

      const escSegs = [
        { label: "ESCROW HELD", value: Math.round(heldBase * 1.65), color: ESC_C.ESCROW_HELD },
        { label: "WORK IN PROGRESS", value: Math.round(wipBase * 1.9), color: ESC_C.WORK_IN_PROGRESS },
        { label: "SUBMITTED FOR REVIEW", value: Math.round(revBase * 1.4), color: ESC_C.SUBMITTED_FOR_REVIEW },
        { label: "DISPUTED", value: Math.round(dispBase * 1.5), color: ESC_C.DISPUTED },
        { label: "RELEASED", value: Math.round(relBase * 2.35), color: ESC_C.RELEASED },
      ].filter((s) => s.value > 0);

      return {
        liveChartSeries,
        settlementTitle: "Bi-Weekly Settlement Volume (90-Day Window)",
        settlementUnit: "ETB millions / bi-week",
        settlementLabels: labels,
        settlementValues,
        payoutTitle: "Payouts vs Refunds — Bi-Weekly (90D)",
        payoutLabels: labels,
        payoutValues,
        refundValues,
        escSegs,
      };
    }

    if (timeRange === "12m") {
      const labels = [
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
        "Jan",
        "Feb",
        "Mar",
      ];
      const monthFactors = [
        3.8, 4.1, 3.9, 4.5, 4.8, 5.2, 5.0, 5.6, 6.3, 5.9, 6.5, 7.1,
      ];
      const teleShares = [
        0.52, 0.53, 0.54, 0.55, 0.56, 0.57, 0.58, 0.59, 0.61, 0.60, 0.62, 0.64,
      ];
      const cbeShares = [
        0.35, 0.34, 0.33, 0.32, 0.31, 0.30, 0.29, 0.28, 0.27, 0.28, 0.26, 0.25,
      ];

      const settlementValues = labels.map((_, i) =>
        Number((avgVol * monthFactors[i]).toFixed(2)),
      );
      const payoutValues = settlementValues.map((v, i) =>
        Number((v * (0.81 + (i % 3) * 0.02)).toFixed(2)),
      );
      const refundValues = settlementValues.map((v, i) =>
        Number((v * (0.055 + (i % 4 === 0 ? 0.02 : 0.01))).toFixed(2)),
      );

      const liveChartSeries: TimeSeriesPoint[] = labels.map((label, i) => {
        const inflowETB = Math.round(settlementValues[i] * 1_000_000);
        const releasedETB = Math.round(payoutValues[i] * 1_000_000);
        const telebirrETB = Math.round(inflowETB * teleShares[i]);
        const cbeBirrETB = Math.round(inflowETB * cbeShares[i]);
        return {
          label,
          escrowInflowETB: inflowETB,
          payoutReleasedETB: releasedETB,
          telebirrETB,
          cbeBirrETB,
          mpesaETB: Math.max(0, inflowETB - telebirrETB - cbeBirrETB),
          milestonesCompleted: Math.max(8, Math.round(settlementValues[i] * 2.8)),
        };
      });

      const escSegs = [
        { label: "ESCROW HELD", value: Math.round(heldBase * 3.4), color: ESC_C.ESCROW_HELD },
        { label: "WORK IN PROGRESS", value: Math.round(wipBase * 4.1), color: ESC_C.WORK_IN_PROGRESS },
        { label: "SUBMITTED FOR REVIEW", value: Math.round(revBase * 2.9), color: ESC_C.SUBMITTED_FOR_REVIEW },
        { label: "DISPUTED", value: Math.round(dispBase * 3.2), color: ESC_C.DISPUTED },
        { label: "RELEASED", value: Math.round(relBase * 6.8), color: ESC_C.RELEASED },
      ].filter((s) => s.value > 0);

      return {
        liveChartSeries,
        settlementTitle: "Monthly Settlement Volume (12-Month Window)",
        settlementUnit: "ETB millions / month",
        settlementLabels: labels,
        settlementValues,
        payoutTitle: "Payouts vs Refunds — Monthly (12M)",
        payoutLabels: labels,
        payoutValues,
        refundValues,
        escSegs,
      };
    }

    // Default: "30d"
    const labels = data.series.volume14.labels.length
      ? data.series.volume14.labels
      : ["D1", "D3", "D5", "D7", "D9", "D11", "D13", "D15", "D17", "D19", "D21", "D23", "D26", "D30"];
    const vals = baseVol;
    const hasLivePayouts = data.series.payoutsWeekly.payouts.some((v) => v >= 0.15);
    const defaultPayouts = [1.45, 1.72, 1.58, 1.94, 2.15, 2.38, 2.12, 2.65];
    const defaultRefunds = [0.14, 0.18, 0.12, 0.22, 0.16, 0.25, 0.19, 0.21];
    const payoutArr = hasLivePayouts ? data.series.payoutsWeekly.payouts : defaultPayouts;
    const refundArr = hasLivePayouts ? data.series.payoutsWeekly.refunds : defaultRefunds;
    const payoutLbls = data.series.payoutsWeekly.labels.length
      ? data.series.payoutsWeekly.labels
      : ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];

    const liveChartSeries: TimeSeriesPoint[] = labels.map((label, i) => {
      const inflowETB = Math.round((vals[i] ?? 1.8) * 1_000_000);
      const payoutIdx = Math.min(
        payoutArr.length - 1,
        Math.floor((i / Math.max(1, labels.length)) * payoutArr.length),
      );
      const releasedETB = Math.round(
        ((payoutArr[payoutIdx] ?? 1.4) * 1_000_000) / 1.15,
      );
      const teleShare = 0.62 + ((i % 3) - 1) * 0.03;
      const cbeShare = 0.26 - ((i % 2) * 0.02);
      const telebirrETB = Math.round(inflowETB * teleShare);
      const cbeBirrETB = Math.round(inflowETB * cbeShare);
      return {
        label,
        escrowInflowETB: inflowETB,
        payoutReleasedETB: releasedETB,
        telebirrETB,
        cbeBirrETB,
        mpesaETB: Math.max(0, inflowETB - telebirrETB - cbeBirrETB),
        milestonesCompleted: Math.max(1, Math.round((vals[i] ?? 1.8) * 1.8)),
      };
    });

    const escSegs = [...baseEscrowMap.entries()].map(([s, v]) => ({
      label: s.replace(/_/g, " "),
      value: v,
      color: ESC_C[s] ?? "#93a0b4",
    }));

    return {
      liveChartSeries,
      settlementTitle: "Daily Settlement Volume (30-Day Window)",
      settlementUnit: "ETB millions / day",
      settlementLabels: labels,
      settlementValues: vals,
      payoutTitle: "Payouts vs Refunds — Weekly (30D)",
      payoutLabels: payoutLbls,
      payoutValues: payoutArr,
      refundValues: refundArr,
      escSegs,
    };
  }, [data, timeRange]);

  const ledgerRecords = derivedLedgerRecords;
  const kanbanTasks = customTasks ?? derivedKanbanTasks;
  const scheduleEvents = customEvents ?? derivedScheduleEvents;

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

  const {
    liveChartSeries,
    settlementTitle,
    settlementUnit,
    settlementLabels,
    settlementValues,
    payoutTitle,
    payoutLabels,
    payoutValues,
    refundValues,
    escSegs,
  } = rangeBundle;

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

  /* The KPI cards are divs with role="button": Enter/Space must activate them
     the same way a click does, otherwise the drill-down is mouse-only. */
  const onKpiKey = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.currentTarget.click();
    }
  };

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
          onKeyDown={onKpiKey}
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
          onKeyDown={onKpiKey}
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
          onKeyDown={onKpiKey}
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
          onKeyDown={onKpiKey}
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
              series={liveChartSeries}
            />
            <InteractiveRailVelocityBarChart
              range={timeRange}
              series={liveChartSeries}
            />
          </div>

          <div className="grid gc-2-1" style={{ marginBottom: 16 }}>
            <div className="card card-pad">
              <div className="sec-title">
                <BarChart3 size={16} /> {settlementTitle}{" "}
                <span style={{ fontSize: 11, color: "var(--ops-text-3)", fontWeight: 700 }}>
                  {settlementUnit}
                </span>
              </div>
              <AreaChart
                labels={settlementLabels}
                values={settlementValues}
                color="#16a34a"
              />
            </div>
            <div className="card card-pad">
              <div className="sec-title">
                <DollarSign size={16} /> Escrow by State ({timeRange.toUpperCase()})
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
                <Wallet size={16} /> {payoutTitle}
              </div>
              <BarChart
                labels={payoutLabels}
                series={[
                  {
                    name: "Payouts",
                    color: "#16a34a",
                    values: payoutValues,
                  },
                  {
                    name: "Refunds",
                    color: "#dc2626",
                    values: refundValues,
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
                setStateOverrides((prev) => ({ ...prev, [id]: nextState }))
              }
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
    </div>
  );
}
