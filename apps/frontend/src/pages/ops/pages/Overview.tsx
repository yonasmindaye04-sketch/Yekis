/* ────────────────────────────────────────────────────────────────────────
   Overview.tsx — Command Center: stat cards with sparklines, the Action
   Center directive list, four analytics charts, recent activity and the
   work-queue shortcuts. Single GET /admin/overview feeds everything.
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import {
  Activity,
  BarChart3,
  Briefcase,
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
} from "lucide-react";
import { dts, fmt, opsApi, useApi } from "../opsApi";
import type { OverviewBundle } from "../opsTypes";
import { AreaChart, BarChart, ChartLegend, Donut, HBars } from "./../components/charts";
import { Empty, ErrorBox, LoadingBox, PageHead, StatCard } from "../components/ui";
import { ActionCenter, buildActionItems } from "../components/actionCenter";
import type { ActionItem } from "../components/actionCenter";
import { useOpsUi } from "../opsUiContext";
import type { OpsPageId } from "../opsNav";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";

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
    { label: "KYC Reviews", value: data.queues.kyc.filter((k) => k.status === "UNDER_REVIEW").length, color: "#7c3aed", meta: "under review" },
    { label: "Dispute Mediation", value: data.queues.disputes.filter((d) => d.stage === "STAGE_3_MEDIATION").length, color: "#dc2626", meta: "stage 3" },
    { label: "Profile Reports", value: data.queues.reports.filter((r) => r.status === "OPEN").length, color: "#d97706", meta: "open" },
    { label: "Payouts to Settle", value: data.queues.payouts.filter((p) => p.status === "PENDING" || p.status === "PROCESSING").length, color: "#059669", meta: "pending" },
    { label: "Recon Mismatches", value: data.recon.filter((r) => r.rec === "MISMATCH").length, color: "#2563eb", meta: "to clear" },
  ];

  const qa: [string, string, number, typeof Wallet, string][] = [
    ["kyc", "KYC Reviews", data.queues.kyc.filter((k) => k.status === "UNDER_REVIEW").length, UserCheck, "#7c3aed"],
    ["dispute-queue", "Dispute Mediation", data.queues.disputes.filter((d) => d.stage === "STAGE_3_MEDIATION").length, Scale, "#dc2626"],
    ["reports-queue", "Profile Reports", data.queues.reports.filter((r) => r.status === "OPEN").length, TriangleAlert, "#d97706"],
    ["payouts", "Review Payouts", m.pendingPayouts, Wallet, "#d97706"],
    ["monitoring", "Fix Queue Lag", Object.values(data.health.checks).filter((c) => !c.ok).length, Activity, "#dc2626"],
  ];

  const onOpen = (it: ActionItem) => ui.navigate(it.page, it.refId);

  return (
    <div className="fade">
      <PageHead
        title="Command Center"
        sub={`Platform health, financial controls and staff review queues · updated ${dts(data.health.checkedAt)}`}
        right={
          <Button variant="outline" onClick={reload}>
            <RefreshCw size={14} /> Refresh
          </Button>
        }
      />

      {/* Stat cards carry no trend or sparkline: the backend exposes aggregate
          totals only, with no time-series endpoint to derive a real trend from. */}
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <StatCard label="Total Users" value={m.totalUsers.toLocaleString()} icon={Users} color="#16a34a" />
        <StatCard label="Active Contracts" value={String(m.activeContracts)} icon={Briefcase} color="#2563eb" />
        <StatCard label="Funds in Escrow" value={fmt(m.fundsInEscrowMinor)} icon={DollarSign} color="#059669" />
        <StatCard label="Pending Payouts" value={String(m.pendingPayouts)} icon={Wallet} color="#d97706" />
      </div>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <StatCard label="Open Disputes" value={String(m.openDisputes)} icon={TriangleAlert} color="#dc2626" />
        <StatCard label="Pending KYC" value={String(m.pendingIdentity)} icon={UserCheck} color="#7c3aed" />
        <StatCard label="Support Tickets" value={String(m.openSupportTickets)} icon={Activity} color="#0284c7" />
        <StatCard label="Pending Payments" value={String(m.pendingPayments)} icon={CreditCard} color="#d97706" />
      </div>

      <ActionCenter
        items={items}
        done={done}
        onToggle={(i) => setDone((d) => ({ ...d, [i]: !d[i] }))}
        onOpen={onOpen}
      />

      <div className="grid gc-2-1" style={{ marginBottom: 16 }}>
        <Card className="card card-pad">
          <div className="sec-title">
            <BarChart3 size={16} /> Transaction Volume — last 14 days{" "}
            <span style={{ fontSize: 11, color: "var(--ops-text-3)", fontWeight: 700 }}>
              ETB millions / day
            </span>
          </div>
          <AreaChart labels={data.series.volume14.labels} values={data.series.volume14.values} color="#16a34a" />
          <div className="kbd-hint" style={{ marginTop: 6 }}>
            Derived from the most recent 100 payment records — earlier days fall away as volume grows.
          </div>
        </Card>
        <Card className="card card-pad">
          <div className="sec-title">
            <DollarSign size={16} /> Escrow by State
          </div>
          {escSegs.length ? <Donut segs={escSegs} centerSub="in escrow" /> : <Empty icon={DollarSign}>No escrow rows.</Empty>}
        </Card>
      </div>

      <div className="grid gc-1-1" style={{ marginBottom: 16 }}>
        <Card className="card card-pad">
          <div className="sec-title">
            <Wallet size={16} /> Payouts vs Refunds — weekly
          </div>
          <BarChart
            labels={data.series.payoutsWeekly.labels}
            series={[
              { name: "Payouts", color: "#059669", values: data.series.payoutsWeekly.payouts },
              { name: "Refunds", color: "#dc2626", values: data.series.payoutsWeekly.refunds },
            ]}
          />
          <ChartLegend series={[{ name: "Payouts", color: "#059669" }, { name: "Refunds", color: "#dc2626" }]} />
          <div className="kbd-hint" style={{ marginTop: 6 }}>
            Weekly buckets from the most recent 100 payouts and escrow records.
          </div>
        </Card>
        <Card className="card card-pad">
          <div className="sec-title">
            <Activity size={16} /> Review Workload — open items per queue
          </div>
          <HBars rows={wl} />
          <div className="kbd-hint" style={{ marginTop: 6 }}>
            Bars are relative to the busiest queue — rebalance staff where the bar is longest.
          </div>
        </Card>
      </div>

      <div className="grid gc-2-1">
        <Card className="card card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div className="sec-title" style={{ marginBottom: 0 }}>Recent Activity</div>
            <Button variant="ghost" size="sm" onClick={() => ui.navigate("audit")}>
              View all
            </Button>
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
                  <div className="act-s">{a.e} · {dts(a.t)}</div>
                </div>
                <span style={{ color: "var(--ops-text-3)" }}>
                  <ChevronRight size={15} />
                </span>
              </div>
            );
          })}
        </Card>
        <Card className="card card-pad">
          <div className="sec-title">Work Queues</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {qa.map(([pg, l, n, Icon, c]) => (
              <button className="qa-btn" key={pg} onClick={() => ui.navigate(pg as OpsPageId)}>
                <span className="qa-l">
                  <span className="qa-ic" style={{ color: c }}>
                    <Icon size={16} />
                  </span>
                  {l}
                </span>
                <span className="qa-n" style={{ color: c }}>{n}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
