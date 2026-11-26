/**
 * Overview.tsx — Unified Dual-Dashboard Operations Command Center.
 * - Executive Command (dashboard-1): Interactive expandable KPI cards (with drill-down
 *   drawers), prioritized Action Center, real date-bucketed payment & payout charts
 *   (zero synthetic fallbacks or hardcoded percentage deltas), escrow breakdown,
 *   queue workload, system health, and recent audit activity.
 * - Operations Console (dashboard-2): Multi-mode workbench synced with
 *   ShadcnLayoutContext (`opsSubTab`: table | kanban | calendar) backed exclusively
 *   by live API records.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  ChevronDown,
  Command,
  Kanban,
  RefreshCw,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  Table2,
  Wallet,
} from "lucide-react";
import { useOpsUi } from "../opsUiContext";
import { dt, dts, fmt, opsApi, useApi } from "../opsApi";
import type {
  DisputeItem,
  Escrow,
  KycItem,
  OverviewBundle,
  Payment,
  Payout,
  ReconRow,
  RiskFlag,
} from "../opsTypes";
import { ActionCenter, buildActionItems } from "../components/actionCenter";
import type { ActionItem } from "../components/actionCenter";
import { AreaChart, BarChart, ChartLegend, Donut, HBars } from "../components/charts";
import { Card, ErrorBox, LoadingBox, Pill } from "../components/ui";
import { useShadcnLayout } from "../../../components/dashboard/ShadcnLayoutContext";

type TimeRange = "7d" | "30d" | "90d" | "12m";
type KpiId = "escrow" | "disputes" | "payouts" | "compliance";

interface BucketSpec {
  label: string;
  startMs: number;
  endMs: number;
}

function buildBuckets(range: TimeRange, nowMs: number): BucketSpec[] {
  const dayMs = 86_400_000;
  if (range === "7d") {
    const out: BucketSpec[] = [];
    for (let i = 6; i >= 0; i--) {
      const end = nowMs - i * dayMs;
      const start = end - dayMs;
      const d = new Date(end);
      out.push({
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        startMs: start,
        endMs: end,
      });
    }
    return out;
  }
  if (range === "30d") {
    const out: BucketSpec[] = [];
    const span = 3 * dayMs;
    for (let i = 9; i >= 0; i--) {
      const end = nowMs - i * span;
      const start = end - span;
      const d = new Date(end);
      out.push({
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        startMs: start,
        endMs: end,
      });
    }
    return out;
  }
  if (range === "90d") {
    const out: BucketSpec[] = [];
    const week = 7 * dayMs;
    for (let i = 11; i >= 0; i--) {
      const end = nowMs - i * week;
      const start = end - week;
      const d = new Date(end);
      out.push({
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        startMs: start,
        endMs: end,
      });
    }
    return out;
  }
  // 12m
  const out: BucketSpec[] = [];
  const base = new Date(nowMs);
  for (let i = 11; i >= 0; i--) {
    const mStart = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const mEnd = new Date(base.getFullYear(), base.getMonth() - i + 1, 1);
    out.push({
      label: mStart.toLocaleDateString(undefined, { month: "short" }),
      startMs: mStart.getTime(),
      endMs: mEnd.getTime(),
    });
  }
  return out;
}

function parseTs(iso?: string): number {
  if (!iso) return Number.NaN;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : Number.NaN;
}

export default function Overview() {
  const ui = useOpsUi();
  const {
    dashboardVariant,
    setDashboardVariant,
    opsSubTab,
    setOpsSubTab,
    setCommandPaletteOpen,
  } = useShadcnLayout();

  const { data, error, loading, reload } = useApi<OverviewBundle>(opsApi.overview);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [expandedKpi, setExpandedKpi] = useState<KpiId | null>(null);
  const [tableFilter, setTableFilter] = useState<"ALL" | "ESCROW" | "PAYOUT" | "DISPUTE" | "RISK">(
    "ALL",
  );
  const [tableSearch, setTableSearch] = useState("");

  const actionItems = useMemo(() => {
    if (!data) return [];
    return buildActionItems({
      disputes: data.queues.disputes,
      riskFlags: data.riskFlags,
      health: data.health,
      recon: data.recon,
      payouts: data.queues.payouts,
      kyc: data.queues.kyc,
      reports: data.queues.reports,
    });
  }, [data]);

  const seriesData = useMemo(() => {
    if (!data) return null;
    const nowMs = Date.now();
    const buckets = buildBuckets(timeRange, nowMs);
    const windowStart = buckets[0]?.startMs ?? 0;

    const paymentBuckets = buckets.map(() => 0);
    let successCount = 0;
    let totalSuccessMinor = 0;

    (data.payments as Payment[]).forEach((p) => {
      if (p.status !== "SUCCESS") return;
      const ts = parseTs(p.created);
      if (!Number.isFinite(ts) || ts < windowStart) return;
      const idx = buckets.findIndex((b) => ts >= b.startMs && ts <= b.endMs);
      if (idx >= 0) {
        paymentBuckets[idx] += p.amount;
        successCount += 1;
        totalSuccessMinor += p.amount;
      }
    });

    const payoutSettledBuckets = buckets.map(() => 0);
    const payoutFailedBuckets = buckets.map(() => 0);
    let payoutSettledMinor = 0;
    let payoutPendingMinor = 0;

    (data.queues.payouts as Payout[]).forEach((po) => {
      const ts = parseTs(po.created);
      if (po.status === "PENDING" || po.status === "PROCESSING") {
        payoutPendingMinor += po.net;
      }
      if (!Number.isFinite(ts) || ts < windowStart) return;
      const idx = buckets.findIndex((b) => ts >= b.startMs && ts <= b.endMs);
      if (idx < 0) return;
      if (po.status === "CONFIRMED") {
        payoutSettledBuckets[idx] += po.net;
        payoutSettledMinor += po.net;
      } else if (po.status === "FAILED" || po.status === "REVERSED") {
        payoutFailedBuckets[idx] += po.net;
      }
    });

    const hasVolume = paymentBuckets.some((v) => v > 0);
    const hasPayoutSeries =
      payoutSettledBuckets.some((v) => v > 0) || payoutFailedBuckets.some((v) => v > 0);

    return {
      labels: buckets.map((b) => b.label),
      paymentValues: paymentBuckets,
      hasVolume,
      successCount,
      totalSuccessMinor,
      estimatedFeeMinor: Math.round(totalSuccessMinor * 0.1),
      payoutSettledBuckets,
      payoutFailedBuckets,
      hasPayoutSeries,
      payoutSettledMinor,
      payoutPendingMinor,
    };
  }, [data, timeRange]);

  const escrowSegments = useMemo(() => {
    if (!data) return [];
    const groups = {
      held: 0,
      submitted: 0,
      disputed: 0,
      adminHold: 0,
      released: 0,
    };
    (data.escrows as Escrow[]).forEach((e) => {
      if (e.held) {
        groups.adminHold += e.amt;
      } else if (e.state === "DISPUTED") {
        groups.disputed += e.amt;
      } else if (e.state === "SUBMITTED_FOR_REVIEW") {
        groups.submitted += e.amt;
      } else if (e.state === "RELEASED" || e.state === "ACCEPTED") {
        groups.released += e.amt;
      } else {
        groups.held += e.amt;
      }
    });
    return [
      { label: "Active Custody", value: groups.held, color: "#059669" },
      { label: "In Review", value: groups.submitted, color: "#2563eb" },
      { label: "Disputed", value: groups.disputed, color: "#dc2626" },
      { label: "Admin Hold", value: groups.adminHold, color: "#d97706" },
      { label: "Released", value: groups.released, color: "#64748b" },
    ].filter((s) => s.value > 0);
  }, [data]);

  const unifiedRows = useMemo(() => {
    if (!data) return [];
    const rows: Array<{
      id: string;
      kind: "ESCROW" | "PAYOUT" | "DISPUTE" | "RISK";
      title: string;
      party: string;
      status: string;
      amountMinor: number | null;
      when: string;
      page: "escrow" | "payouts" | "dispute-queue" | "risk";
    }> = [];

    (data.escrows as Escrow[]).forEach((e) => {
      rows.push({
        id: e.id,
        kind: "ESCROW",
        title: e.title,
        party: `${e.job} · ${e.fl}`,
        status: e.held ? "ADMIN_HOLD" : e.state,
        amountMinor: e.amt,
        when: e.created,
        page: "escrow",
      });
    });
    (data.queues.payouts as Payout[]).forEach((p) => {
      rows.push({
        id: p.id,
        kind: "PAYOUT",
        title: `${p.provider} · ${p.acct}`,
        party: p.user.displayName,
        status: p.status,
        amountMinor: p.net,
        when: p.created ?? "",
        page: "payouts",
      });
    });
    (data.queues.disputes as DisputeItem[]).forEach((d) => {
      rows.push({
        id: d.id,
        kind: "DISPUTE",
        title: d.job,
        party: d.ms,
        status: d.stage,
        amountMinor: d.amt,
        when: d.sla?.resolution.dueAt ?? "",
        page: "dispute-queue",
      });
    });
    (data.riskFlags as RiskFlag[]).forEach((f) => {
      rows.push({
        id: f.id,
        kind: "RISK",
        title: f.type.replace(/_/g, " "),
        party: f.user.email,
        status: f.status,
        amountMinor: f.user.walletMinor,
        when: f.created,
        page: "risk",
      });
    });

    const q = tableSearch.trim().toLowerCase();
    return rows.filter((r) => {
      if (tableFilter !== "ALL" && r.kind !== tableFilter) return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.party.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
      );
    });
  }, [data, tableFilter, tableSearch]);

  const kanbanCols = useMemo(() => {
    if (!data) return [];
    const triage: Array<{ id: string; tag: string; title: string; meta: string; status: string; page: Parameters<typeof ui.navigate>[0] }> = [];
    const active: typeof triage = [];
    const escalated: typeof triage = [];
    const cleared: typeof triage = [];

    (data.queues.kyc as KycItem[]).forEach((k) => {
      const card = {
        id: k.id,
        tag: "KYC",
        title: k.name || k.email,
        meta: `${k.tier} · ${k.doc}`,
        status: k.status,
        page: "kyc" as const,
      };
      if (k.status === "VERIFIED") cleared.push(card);
      else if (k.flag || k.dup || k.pep) escalated.push(card);
      else triage.push(card);
    });

    (data.queues.disputes as DisputeItem[]).forEach((d) => {
      const card = {
        id: d.id,
        tag: "Dispute",
        title: d.job,
        meta: `${fmt(d.amt)} · ${d.slaH < 0 ? `${Math.abs(d.slaH)}h overdue` : `${d.slaH}h SLA`}`,
        status: d.stage,
        page: "dispute-queue" as const,
      };
      if (d.stage === "RESOLVED") cleared.push(card);
      else if (d.slaH < 0 || d.stage === "STAGE_4_ARBITRATION") escalated.push(card);
      else active.push(card);
    });

    (data.queues.payouts as Payout[]).forEach((p) => {
      const card = {
        id: p.id,
        tag: "Payout",
        title: p.user.displayName,
        meta: `${p.provider} · ${fmt(p.net)}`,
        status: p.status,
        page: "payouts" as const,
      };
      if (p.status === "CONFIRMED") cleared.push(card);
      else if (p.status === "FAILED" || p.status === "REVERSED") escalated.push(card);
      else if (p.status === "PROCESSING") active.push(card);
      else triage.push(card);
    });

    return [
      { id: "triage", label: "Needs Review", items: triage },
      { id: "active", label: "In Progress", items: active },
      { id: "escalated", label: "Escalated / Exception", items: escalated },
      { id: "cleared", label: "Cleared / Settled", items: cleared },
    ];
  }, [data, ui]);

  const scheduleItems = useMemo(() => {
    if (!data) return [];
    const events: Array<{
      id: string;
      when: string;
      sortMs: number;
      kind: string;
      title: string;
      detail: string;
      status: string;
      page: Parameters<typeof ui.navigate>[0];
    }> = [];

    (data.queues.disputes as DisputeItem[]).forEach((d) => {
      const dueIso = d.sla?.resolution.dueAt;
      const ms = dueIso ? parseTs(dueIso) : Date.now() + d.slaH * 3_600_000;
      events.push({
        id: d.id,
        when: dueIso ? dt(dueIso) : d.slaH < 0 ? `${Math.abs(d.slaH)}h overdue` : `In ${d.slaH}h`,
        sortMs: Number.isFinite(ms) ? ms : 0,
        kind: "Dispute SLA",
        title: d.job,
        detail: `${d.ms} · ${fmt(d.amt)}`,
        status: d.slaH < 0 ? "SLA_BREACHED" : d.stage,
        page: "dispute-queue",
      });
    });

    (data.queues.payouts as Payout[])
      .filter((p) => p.status === "PENDING" || p.status === "PROCESSING")
      .forEach((p) => {
        const ms = parseTs(p.created);
        events.push({
          id: p.id,
          when: p.created ? dt(p.created) : "Queued",
          sortMs: Number.isFinite(ms) ? ms : 0,
          kind: "Payout Window",
          title: `${p.user.displayName} (${p.provider})`,
          detail: `${fmt(p.net)} · ${p.acct}`,
          status: p.status,
          page: "payouts",
        });
      });

    (data.riskFlags as RiskFlag[])
      .filter((f) => f.status === "OPEN" || f.status === "REVIEWING")
      .forEach((f) => {
        const ms = parseTs(f.created);
        events.push({
          id: f.id,
          when: dt(f.created),
          sortMs: Number.isFinite(ms) ? ms : 0,
          kind: "Compliance Review",
          title: f.type.replace(/_/g, " "),
          detail: f.user.email,
          status: f.status,
          page: "risk",
        });
      });

    return events.sort((a, b) => a.sortMs - b.sortMs);
  }, [data, ui]);

  if (loading && !data) return <LoadingBox />;
  if (error) return <ErrorBox error={error} reload={reload} />;
  if (!data || !seriesData) return null;

  const m = data.metrics;
  const openRiskCount = data.riskFlags.filter(
    (f) => f.status === "OPEN" || f.status === "REVIEWING",
  ).length;
  const heldEscrowsCount = data.escrows.filter((e) => e.state !== "RELEASED" && e.state !== "REFUNDED").length;
  const adminHoldCount = data.escrows.filter((e) => e.held).length;
  const breachedDisputesCount = data.queues.disputes.filter((d) => d.slaH < 0).length;
  const failedPayoutsCount = data.queues.payouts.filter((p) => p.status === "FAILED").length;
  const complianceTotal = m.pendingIdentity + m.openSupportTickets + openRiskCount + m.pendingTopUps;
  const reconExceptions = (data.recon as ReconRow[]).filter(
    (r) => r.rec !== "MATCHED" || (r.diff !== null && r.diff !== 0),
  ).length;

  const handleActionOpen = (item: ActionItem) => {
    ui.navigate(item.page, item.refId);
  };

  const healthEntries = Object.entries(data.health.checks);

  const toggleKpi = (id: KpiId) => {
    setExpandedKpi((cur) => (cur === id ? null : id));
  };

  return (
    <div className="fade">
      {/* Unified Sub-navigation Toolbar matching Client & Freelancer Workspace */}
      <div className="sh-subnav-bar" style={{ marginBottom: 16 }}>
        <div className="sh-subnav-left">
          <div className="sh-segmented" role="tablist" aria-label="Operations dashboard view">
            <button
              type="button"
              role="tab"
              aria-selected={dashboardVariant === "dashboard-1"}
              className={`sh-seg-btn ${dashboardVariant === "dashboard-1" ? "active" : ""}`}
              onClick={() => setDashboardVariant("dashboard-1")}
            >
              Executive Command
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={dashboardVariant === "dashboard-2"}
              className={`sh-seg-btn ${dashboardVariant === "dashboard-2" ? "active" : ""}`}
              onClick={() => setDashboardVariant("dashboard-2")}
            >
              Operations Console
            </button>
          </div>

          {dashboardVariant === "dashboard-2" && (
            <div className="sh-segmented" role="tablist" aria-label="Console view mode">
              <button
                type="button"
                role="tab"
                aria-selected={opsSubTab === "table"}
                className={`sh-seg-btn ${opsSubTab === "table" ? "active" : ""}`}
                onClick={() => setOpsSubTab("table")}
              >
                <Table2 size={13} /> Ledger
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={opsSubTab === "kanban"}
                className={`sh-seg-btn ${opsSubTab === "kanban" ? "active" : ""}`}
                onClick={() => setOpsSubTab("kanban")}
              >
                <Kanban size={13} /> Workboard
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={opsSubTab === "calendar"}
                className={`sh-seg-btn ${opsSubTab === "calendar" ? "active" : ""}`}
                onClick={() => setOpsSubTab("calendar")}
              >
                <Calendar size={13} /> SLA Schedule
              </button>
            </div>
          )}
        </div>

        <div className="sh-subnav-right">
          {dashboardVariant === "dashboard-1" && (
            <div className="sh-segmented" role="group" aria-label="Chart date range">
              {(["7d", "30d", "90d", "12m"] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`sh-seg-btn ${timeRange === r ? "active" : ""}`}
                  onClick={() => setTimeRange(r)}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="sh-btn sh-btn-outline"
            onClick={() => setCommandPaletteOpen(true)}
            title="Open Command Palette (Ctrl/⌘K)"
          >
            <Command size={13} /> Jump <kbd className="kbd">⌘K</kbd>
          </button>
          <button
            type="button"
            className="sh-btn sh-btn-outline"
            onClick={reload}
            title="Refresh overview metrics"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {dashboardVariant === "dashboard-1" ? (
        <>
          {/* Expandable KPI Trend Cards (flat hairline + bare Lucide icons + drill-down drawers) */}
          <div className="sh-kpi-grid" style={{ marginBottom: 16 }}>
            <div
              role="button"
              tabIndex={0}
              aria-expanded={expandedKpi === "escrow"}
              className={`sh-kpi-card ${expandedKpi === "escrow" ? "expanded" : ""}`}
              onClick={() => toggleKpi("escrow")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleKpi("escrow");
                }
              }}
            >
              <div className="sh-kpi-top">
                <span className="sh-kpi-label">Funds in Escrow</span>
                <Shield size={15} />
              </div>
              <div className="sh-kpi-value mono">{fmt(m.fundsInEscrowMinor)}</div>
              <div className="sh-kpi-foot">
                <span className="sh-trend-delta neutral">
                  {heldEscrowsCount} active · {adminHoldCount} admin hold
                </span>
                <ChevronDown size={14} className="sh-kpi-chev" />
              </div>
              {expandedKpi === "escrow" && (
                <div className="sh-kpi-drawer" onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--ops-text-2)" }}>Active contracts</span>
                    <span className="mono">{m.activeContracts}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--ops-text-2)" }}>Recon exceptions</span>
                    <span className="mono">{reconExceptions}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    style={{ marginTop: 4 }}
                    onClick={() => ui.navigate("escrow")}
                  >
                    Open Escrow Oversight <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>

            <div
              role="button"
              tabIndex={0}
              aria-expanded={expandedKpi === "disputes"}
              className={`sh-kpi-card ${expandedKpi === "disputes" ? "expanded" : ""}`}
              onClick={() => toggleKpi("disputes")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleKpi("disputes");
                }
              }}
            >
              <div className="sh-kpi-top">
                <span className="sh-kpi-label">Open Disputes</span>
                <Scale size={15} />
              </div>
              <div className="sh-kpi-value mono">{m.openDisputes}</div>
              <div className="sh-kpi-foot">
                <span
                  className={`sh-trend-delta ${
                    breachedDisputesCount > 0 ? "negative" : "neutral"
                  }`}
                >
                  {breachedDisputesCount > 0
                    ? `${breachedDisputesCount} SLA breached`
                    : m.openDisputes > 0
                      ? "Within SLA window"
                      : "Queue clear"}
                </span>
                <ChevronDown size={14} className="sh-kpi-chev" />
              </div>
              {expandedKpi === "disputes" && (
                <div className="sh-kpi-drawer" onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--ops-text-2)" }}>In arbitration</span>
                    <span className="mono">
                      {
                        data.queues.disputes.filter(
                          (d) => d.stage === "STAGE_4_ARBITRATION",
                        ).length
                      }
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--ops-text-2)" }}>Due within 24h</span>
                    <span className="mono">
                      {
                        data.queues.disputes.filter(
                          (d) => d.slaH >= 0 && d.slaH < 24,
                        ).length
                      }
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    style={{ marginTop: 4 }}
                    onClick={() => ui.navigate("dispute-queue")}
                  >
                    Open Dispute Mediation <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>

            <div
              role="button"
              tabIndex={0}
              aria-expanded={expandedKpi === "payouts"}
              className={`sh-kpi-card ${expandedKpi === "payouts" ? "expanded" : ""}`}
              onClick={() => toggleKpi("payouts")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleKpi("payouts");
                }
              }}
            >
              <div className="sh-kpi-top">
                <span className="sh-kpi-label">Pending Payouts</span>
                <Wallet size={15} />
              </div>
              <div className="sh-kpi-value mono">{m.pendingPayouts}</div>
              <div className="sh-kpi-foot">
                <span
                  className={`sh-trend-delta ${
                    failedPayoutsCount > 0 ? "negative" : "neutral"
                  }`}
                >
                  {failedPayoutsCount > 0
                    ? `${failedPayoutsCount} failed rail`
                    : fmt(seriesData.payoutPendingMinor)}
                </span>
                <ChevronDown size={14} className="sh-kpi-chev" />
              </div>
              {expandedKpi === "payouts" && (
                <div className="sh-kpi-drawer" onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--ops-text-2)" }}>Queued net volume</span>
                    <span className="mono">{fmt(seriesData.payoutPendingMinor)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--ops-text-2)" }}>Pending wallet topups</span>
                    <span className="mono">{m.pendingTopUps}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    style={{ marginTop: 4 }}
                    onClick={() => ui.navigate("payouts")}
                  >
                    Open Payouts Workbench <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>

            <div
              role="button"
              tabIndex={0}
              aria-expanded={expandedKpi === "compliance"}
              className={`sh-kpi-card ${expandedKpi === "compliance" ? "expanded" : ""}`}
              onClick={() => toggleKpi("compliance")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleKpi("compliance");
                }
              }}
            >
              <div className="sh-kpi-top">
                <span className="sh-kpi-label">Compliance Queues</span>
                <ShieldAlert size={15} />
              </div>
              <div className="sh-kpi-value mono">{complianceTotal}</div>
              <div className="sh-kpi-foot">
                <span
                  className={`sh-trend-delta ${
                    openRiskCount > 0 ? "negative" : "neutral"
                  }`}
                >
                  {m.pendingIdentity} KYC · {openRiskCount} AML · {m.openSupportTickets} Help
                </span>
                <ChevronDown size={14} className="sh-kpi-chev" />
              </div>
              {expandedKpi === "compliance" && (
                <div className="sh-kpi-drawer" onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--ops-text-2)" }}>KYC review queue</span>
                    <span className="mono">{m.pendingIdentity}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--ops-text-2)" }}>Profile reports</span>
                    <span className="mono">{data.queues.reports.length}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    style={{ marginTop: 4 }}
                    onClick={() => ui.navigate("kyc")}
                  >
                    Open KYC Verification <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Prioritized Action Center */}
          <ActionCenter
            items={actionItems}
            done={done}
            onToggle={(idx) => setDone((d) => ({ ...d, [idx]: !d[idx] }))}
            onOpen={handleActionOpen}
          />

          {/* Real Date-Bucketed Cashflow & Payout Charts */}
          <div className="sh-charts-split" style={{ marginBottom: 16 }}>
            <section className="sh-card">
              <div className="sh-card-header">
                <div>
                  <h2 className="sh-card-title">
                    Inbound Escrow Funding ({timeRange.toUpperCase()})
                  </h2>
                  <p className="sh-card-desc">
                    Settled payment transactions grouped across real calendar buckets
                  </p>
                </div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>
                  {fmt(seriesData.totalSuccessMinor)}
                </div>
              </div>
              {seriesData.hasVolume ? (
                <>
                  <AreaChart
                    labels={seriesData.labels}
                    values={seriesData.paymentValues}
                    color="#059669"
                    unit="ETB"
                  />
                  <div className="sh-chart-summary-bar">
                    <span>
                      <strong>{seriesData.successCount}</strong> successful transactions
                    </span>
                    <span>
                      Est. platform fee (10%):{" "}
                      <strong className="mono">{fmt(seriesData.estimatedFeeMinor)}</strong>
                    </span>
                  </div>
                </>
              ) : (
                <div className="sh-chart-empty">
                  <strong>No settled payments in this {timeRange.toUpperCase()} window</strong>
                  <span>Try extending the horizon or inspect Payments &amp; Receipts.</span>
                </div>
              )}
            </section>

            <section className="sh-card">
              <div className="sh-card-header">
                <div>
                  <h2 className="sh-card-title">
                    Payout Disbursements ({timeRange.toUpperCase()})
                  </h2>
                  <p className="sh-card-desc">Settled vs failed/reversed disbursements</p>
                </div>
                <ChartLegend
                  series={[
                    { name: "Confirmed", color: "#2563eb" },
                    { name: "Failed", color: "#dc2626" },
                  ]}
                />
              </div>
              {seriesData.hasPayoutSeries ? (
                <BarChart
                  labels={seriesData.labels}
                  series={[
                    { name: "Confirmed", values: seriesData.payoutSettledBuckets, color: "#2563eb" },
                    { name: "Failed", values: seriesData.payoutFailedBuckets, color: "#dc2626" },
                  ]}
                />
              ) : (
                <div className="sh-chart-empty">
                  <strong>No payout executions in this window</strong>
                  <span>{m.pendingPayouts} payouts currently awaiting processing.</span>
                </div>
              )}
            </section>
          </div>

          {/* Escrow Breakdown & Live Queue Workload */}
          <div className="grid g2" style={{ marginBottom: 16 }}>
            <Card className="card-pad">
              <div className="ch-head">
                <div>
                  <div className="ch-title">Escrow Custody Allocation</div>
                  <div className="ch-sub">Milestone funds across active lifecycle states</div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => ui.navigate("escrow")}
                >
                  Inspect <ArrowRight size={12} />
                </button>
              </div>
              {escrowSegments.length > 0 ? (
                <Donut centerSub="Milestones" segs={escrowSegments} />
              ) : (
                <div className="sh-chart-empty">
                  <strong>No milestone escrows loaded</strong>
                  <span>Open Escrow Oversight to inspect historical milestones.</span>
                </div>
              )}
            </Card>

            <Card className="card-pad">
              <div className="ch-head">
                <div>
                  <div className="ch-title">Live Queue Workload</div>
                  <div className="ch-sub">Open cases &amp; reconciliation variances by desk</div>
                </div>
                <span className="mono" style={{ fontSize: 12, color: "var(--ops-text-3)" }}>
                  {m.totalUsers.toLocaleString()} users
                </span>
              </div>
              <HBars
                rows={[
                  { label: "Pending KYC", value: m.pendingIdentity, color: "#2563eb" },
                  { label: "Open Disputes", value: m.openDisputes, color: "#dc2626" },
                  { label: "Pending Payouts", value: m.pendingPayouts, color: "#059669" },
                  { label: "Open AML Flags", value: openRiskCount, color: "#d97706" },
                  { label: "Recon Exceptions", value: reconExceptions, color: "#7c3aed" },
                  { label: "Support Tickets", value: m.openSupportTickets, color: "#0284c7" },
                ]}
              />
            </Card>
          </div>

          {/* System Health & Recent Audit Feed */}
          <div className="grid g2">
            <Card className="card-pad">
              <div className="ch-head">
                <div>
                  <div className="ch-title">Infrastructure &amp; Ledger Integrity</div>
                  <div className="ch-sub">Checked {dts(data.health.checkedAt)}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => ui.navigate("monitoring")}
                >
                  Monitoring <ArrowRight size={12} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {healthEntries.map(([name, chk]) => (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 10px",
                      border: "1px solid var(--ops-border-soft)",
                      borderRadius: "var(--sh-radius)",
                      fontSize: 12.5,
                    }}
                  >
                    <div>
                      <strong style={{ textTransform: "capitalize" }}>
                        {name.replace(/_/g, " ")}
                      </strong>
                      <div style={{ fontSize: 11.5, color: "var(--ops-text-3)" }}>{chk.d}</div>
                    </div>
                    <Pill s={chk.ok ? "CONFIRMED" : "FAILED"} />
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    border: "1px solid var(--ops-border-soft)",
                    borderRadius: "var(--sh-radius)",
                    fontSize: 12.5,
                  }}
                >
                  <div>
                    <strong>Double-Entry Trial Balance</strong>
                    <div className="mono" style={{ fontSize: 11.5, color: "var(--ops-text-3)" }}>
                      DR {fmt(data.health.ledger.dr)} / CR {fmt(data.health.ledger.cr)}
                    </div>
                  </div>
                  <Pill s={data.health.ledger.bal ? "MATCHED" : "DISCREPANCY"} />
                </div>
              </div>
            </Card>

            <Card className="card-pad">
              <div className="ch-head">
                <div>
                  <div className="ch-title">Recent Audit Activity</div>
                  <div className="ch-sub">Latest administrative &amp; automated ledger events</div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => ui.navigate("audit")}
                >
                  Audit Log <ArrowRight size={12} />
                </button>
              </div>
              {data.activity.length === 0 ? (
                <div className="sh-chart-empty">
                  <strong>No recent audit activity returned</strong>
                  <span>Inspect the full audit trail in Audit Logs.</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.activity.slice(0, 6).map((ev, idx) => (
                    <div
                      key={`${ev.t}-${idx}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "8px 10px",
                        border: "1px solid var(--ops-border-soft)",
                        borderRadius: "var(--sh-radius)",
                        fontSize: 12.5,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{ev.a}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ops-text-2)" }}>{ev.e}</div>
                      </div>
                      <span className="mono" style={{ fontSize: 11.5, color: "var(--ops-text-3)", whiteSpace: "nowrap" }}>
                        {dts(ev.t)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      ) : opsSubTab === "table" ? (
        <section className="sh-card">
          <div className="sh-card-header">
            <div>
              <h2 className="sh-card-title">Cross-Queue Operations Ledger</h2>
              <p className="sh-card-desc">
                Click any row to open its dedicated workbench focused on that record
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <div className="f-search" style={{ minWidth: 220 }}>
                <Search size={14} />
                <input
                  placeholder="Filter ID, party, title or status…"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                />
              </div>
              <div className="sh-segmented" role="group" aria-label="Filter record type">
                {(["ALL", "ESCROW", "PAYOUT", "DISPUTE", "RISK"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`sh-seg-btn ${tableFilter === k ? "active" : ""}`}
                    onClick={() => setTableFilter(k)}
                  >
                    {k === "ALL" ? "All" : k.charAt(0) + k.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="tbl-wrap" tabIndex={0}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Queue</th>
                  <th>ID</th>
                  <th>Record / Subject</th>
                  <th>Counterparty</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Recorded</th>
                </tr>
              </thead>
              <tbody>
                {unifiedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--ops-text-3)" }}>
                      No matching operational records in the current overview snapshot.
                    </td>
                  </tr>
                ) : (
                  unifiedRows.slice(0, 40).map((r) => (
                    <tr
                      key={`${r.kind}-${r.id}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => ui.navigate(r.page, r.id)}
                    >
                      <td style={{ fontWeight: 700 }}>{r.kind}</td>
                      <td className="mono">{r.id}</td>
                      <td className="cell-main">{r.title}</td>
                      <td>{r.party}</td>
                      <td className="amount">
                        {r.amountMinor !== null ? fmt(r.amountMinor) : "—"}
                      </td>
                      <td>
                        <Pill s={r.status} />
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {r.when ? dts(r.when) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : opsSubTab === "kanban" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          {kanbanCols.map((col) => (
            <section key={col.id} className="sh-card" style={{ padding: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: 8,
                  borderBottom: "1px solid var(--ops-border-soft)",
                }}
              >
                <strong style={{ fontSize: 13 }}>{col.label}</strong>
                <span className="mono" style={{ fontSize: 12, color: "var(--ops-text-3)" }}>
                  {col.items.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {col.items.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--ops-text-3)", padding: "12px 0" }}>
                    No items in this column.
                  </div>
                ) : (
                  col.items.slice(0, 12).map((item) => (
                    <button
                      key={`${item.tag}-${item.id}`}
                      type="button"
                      onClick={() => ui.navigate(item.page, item.id)}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        border: "1px solid var(--ops-border-soft)",
                        borderRadius: "var(--sh-radius)",
                        background: "var(--ops-surface-subtle, var(--color-bg-subtle))",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          className="mono"
                          style={{ fontSize: 11, fontWeight: 700, color: "var(--ops-text-3)" }}
                        >
                          {item.tag} · {item.id}
                        </span>
                        <Pill s={item.status} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ops-text)" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ops-text-2)" }}>{item.meta}</div>
                    </button>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="sh-card">
          <div className="sh-card-header">
            <div>
              <h2 className="sh-card-title">Compliance &amp; Dispute SLA Schedule</h2>
              <p className="sh-card-desc">
                Ordered chronologically from live Dispute SLA deadlines, Payout queues, and AML flags
              </p>
            </div>
            <AlertTriangle size={16} />
          </div>
          {scheduleItems.length === 0 ? (
            <div className="sh-chart-empty">
              <strong>No pending SLA deadlines</strong>
              <span>All live dispute, payout, and compliance queues are up to date.</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {scheduleItems.map((ev) => (
                <button
                  key={`${ev.kind}-${ev.id}`}
                  type="button"
                  onClick={() => ui.navigate(ev.page, ev.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 14px",
                    border: "1px solid var(--ops-border-soft)",
                    borderRadius: "var(--sh-radius)",
                    background: "var(--ops-surface)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span className="mono" style={{ fontSize: 11.5, color: "var(--ops-text-3)" }}>
                      {ev.kind} · {ev.when}
                    </span>
                    <strong style={{ fontSize: 13.5, color: "var(--ops-text)" }}>{ev.title}</strong>
                    <span style={{ fontSize: 12, color: "var(--ops-text-2)" }}>{ev.detail}</span>
                  </div>
                  <Pill s={ev.status} />
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
