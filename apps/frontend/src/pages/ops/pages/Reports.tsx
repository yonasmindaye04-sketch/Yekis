/**
 * Reports.tsx — Honest, Live-Data Financial & Marketplace Analytics Workbench.
 * Powered exclusively by `opsApi.reports()` and `opsApi.overview()`:
 * - Real 12-month settled volume & rail breakdown (Telebirr vs CBE Birr)
 * - Real financial & marketplace summary KPIs + CSV export
 * - Actionable queue breakdown linking directly to authoritative workbenches
 *   (no synthetic time-range multipliers, fallback mock arrays, or hardcoded cohorts)
 */

import { useCallback, useMemo, useState } from "react";
import {
  BarChart3,
  Briefcase,
  CreditCard,
  Download,
  ExternalLink,
  RefreshCw,
  Users,
} from "lucide-react";
import { fmt, opsApi, useApi } from "../opsApi";
import type { OpsPageId } from "../opsPerms";
import type { OverviewBundle, ReportsBundle } from "../opsTypes";
import { AreaChart, BarChart, ChartLegend, Donut, HBars } from "../components/charts";
import {
  Button,
  Card,
  Empty,
  ErrorBox,
  Kv,
  LoadingBox,
  PageHead,
  Pill,
  SecTitle,
} from "../components/ui";
import { useOpsUi } from "../opsUiContext";
import { downloadCsv, etb, toCsv } from "../opsExport";

interface LiveQueueCohort {
  id: string;
  title: string;
  sub: string;
  targetTab: OpsPageId;
  count: number;
  exposureMinor: number;
  status: string;
  items: Array<{
    id: string;
    party: string;
    detail: string;
    amountMinor: number | null;
    status: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#059669",
  COMPLETED: "#2563eb",
  DISPUTED: "#dc2626",
  PAUSED: "#d97706",
  CANCELLED: "#64748b",
  DRAFT: "#94a3b8",
  PENDING_SIGNATURE: "#0284c7",
};

export default function Reports() {
  const ui = useOpsUi();
  const reportsLoader = useCallback(async () => {
    const [rep, ov] = await Promise.all([opsApi.reports(), opsApi.overview()]);
    return { rep, ov };
  }, []);
  const { data, error, loading, reload } = useApi<{ rep: ReportsBundle; ov: OverviewBundle }>(
    reportsLoader,
  );
  const [selectedQueueId, setSelectedQueueId] = useState<string>("payouts");

  const cohorts = useMemo<LiveQueueCohort[]>(() => {
    if (!data) return [];
    const { ov } = data;
    const pendingPayouts = ov.queues.payouts.filter(
      (p) => p.status === "PENDING" || p.status === "PROCESSING" || p.status === "FAILED",
    );
    const openDisputes = ov.queues.disputes.filter((d) => d.stage !== "RESOLVED");
    const reconExceptions = ov.recon.filter(
      (r) => r.rec !== "MATCHED" || (r.diff !== null && r.diff !== 0),
    );
    const heldEscrows = ov.escrows.filter((e) => e.held || e.state === "DISPUTED");
    const openRisks = ov.riskFlags.filter(
      (f) => f.status === "OPEN" || f.status === "REVIEWING",
    );

    return [
      {
        id: "payouts",
        title: "Payouts Awaiting Settlement / Retry",
        sub: "Pending, processing, or failed freelancer rail disbursements",
        targetTab: "payouts",
        count: pendingPayouts.length,
        exposureMinor: pendingPayouts.reduce((s, p) => s + p.net, 0),
        status: pendingPayouts.some((p) => p.status === "FAILED")
          ? "FAILED"
          : pendingPayouts.length > 0
            ? "PENDING"
            : "CONFIRMED",
        items: pendingPayouts.slice(0, 8).map((p) => ({
          id: p.id,
          party: p.user.displayName,
          detail: `${p.provider} · ${p.acct}`,
          amountMinor: p.net,
          status: p.status,
        })),
      },
      {
        id: "recon",
        title: "Reconciliation Exceptions & Pending Matches",
        sub: "Gateway settlement variances or T+1 matches not yet closed",
        targetTab: "reconciliation",
        count: reconExceptions.length,
        exposureMinor: reconExceptions.reduce((s, r) => s + Math.abs(r.diff ?? r.amt), 0),
        status: reconExceptions.some((r) => r.rec === "MISMATCH")
          ? "MISMATCH"
          : reconExceptions.length > 0
            ? "PENDING"
            : "MATCHED",
        items: reconExceptions.slice(0, 8).map((r) => ({
          id: r.txId,
          party: r.provider,
          detail: r.diff ? `Diff: ${fmt(r.diff)}` : `State: ${r.esc}`,
          amountMinor: r.amt,
          status: r.rec,
        })),
      },
      {
        id: "disputes",
        title: "Open Escrow Disputes",
        sub: "Milestones requiring mediation or arbitration ruling",
        targetTab: "dispute-queue",
        count: openDisputes.length,
        exposureMinor: openDisputes.reduce((s, d) => s + d.amt, 0),
        status: openDisputes.some((d) => d.slaH < 0)
          ? "SLA_BREACHED"
          : openDisputes.length > 0
            ? "STAGE_3_MEDIATION"
            : "RESOLVED",
        items: openDisputes.slice(0, 8).map((d) => ({
          id: d.id,
          party: d.job,
          detail: d.slaH < 0 ? `${Math.abs(d.slaH)}h SLA overdue` : `${d.slaH}h SLA remaining`,
          amountMinor: d.amt,
          status: d.stage,
        })),
      },
      {
        id: "escrows",
        title: "Flagged / Admin-Held Escrows",
        sub: "Custody milestones paused by Admin Hold or active dispute",
        targetTab: "escrow",
        count: heldEscrows.length,
        exposureMinor: heldEscrows.reduce((s, e) => s + e.amt, 0),
        status: heldEscrows.length > 0 ? "ADMIN_HOLD" : "RELEASED",
        items: heldEscrows.slice(0, 8).map((e) => ({
          id: e.id,
          party: e.fl,
          detail: e.holdReason ?? e.job,
          amountMinor: e.amt,
          status: e.held ? "ADMIN_HOLD" : e.state,
        })),
      },
      {
        id: "risk",
        title: "Open AML / TMS Compliance Flags",
        sub: "Transaction monitoring alerts requiring STR filing or dismissal",
        targetTab: "risk",
        count: openRisks.length,
        exposureMinor: openRisks.reduce((s, f) => s + (f.user.walletMinor ?? 0), 0),
        status: openRisks.length > 0 ? "OPEN" : "DISMISSED",
        items: openRisks.slice(0, 8).map((f) => ({
          id: f.id,
          party: f.user.email,
          detail: f.type.replace(/_/g, " "),
          amountMinor: f.user.walletMinor,
          status: f.status,
        })),
      },
    ];
  }, [data]);

  const selCohort = useMemo(
    () => cohorts.find((c) => c.id === selectedQueueId) ?? cohorts[0] ?? null,
    [cohorts, selectedQueueId],
  );

  if (loading && !data) return <LoadingBox />;
  if (error) return <ErrorBox error={error} reload={reload} />;
  if (!data) return null;

  const { rep } = data;
  const fin = rep.financial;
  const mk = rep.marketplace;
  const hasMonthlyVolume = rep.series.volume12.values.some((v) => v > 0);
  const hasRailMonthly =
    rep.series.railMonthly.telebirr.some((v) => v > 0) ||
    rep.series.railMonthly.cbe.some((v) => v > 0);

  const statusSegs = Object.entries(mk.byStatus).map(([k, v]) => ({
    label: k.charAt(0) + k.slice(1).toLowerCase().replace(/_/g, " "),
    value: v,
    color: STATUS_COLORS[k] ?? "#64748b",
  }));

  return (
    <div className="fade">
      <PageHead
        title="Financial & Marketplace Reports"
        sub="Authoritative 12-month platform GMV, rail throughput, ERCA withholding totals & live operational queues"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Button variant="outline" size="sm" onClick={reload}>
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv(
                  "yekis-financial-report",
                  toCsv(
                    ["Metric", "Value", "Notes"],
                    [
                      ["Total Payment Volume", etb(fin.vol), `${rep.series.volume12.labels.length} monthly buckets`],
                      ["Escrow Released", etb(fin.released), "Completed milestones settled to freelancers"],
                      ["Escrow Refunded", etb(fin.refunded), "Disputes & cancellations returned to clients"],
                      ["Confirmed Payouts", etb(fin.payouts), "Telebirr / CBE / M-Pesa disbursements"],
                      ["Platform Fee Revenue", etb(fin.fees), "Service fees earned across settlements"],
                      ["Withholding Remitted (3%)", etb(fin.wh), "ERCA withholding liability accrued"],
                      ["Failed Payments", String(fin.failPay), "Inbound rail failures"],
                      ["Failed Payouts", String(fin.failPo), "Outbound rail failures"],
                      ["Clients", String(mk.clients), "Registered client accounts"],
                      ["Freelancers", String(mk.freelancers), "Registered freelancer accounts"],
                      ["Total Contracts", String(mk.totalContracts), `${mk.disputes} active disputes`],
                    ],
                  ),
                )
              }
            >
              <Download size={14} /> Export CSV
            </Button>
          </div>
        }
      />

      <SecTitle icon={CreditCard}>Financial Totals (All-Time Verified)</SecTitle>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Kv k="Settled Payment Volume" v={fmt(fin.vol)} title="Inspect inbound payments" onClick={() => ui.navigate("payments")} />
        <Kv k="Escrow Released" v={fmt(fin.released)} title="Open escrow oversight" onClick={() => ui.navigate("escrow")} />
        <Kv k="Confirmed Payouts" v={fmt(fin.payouts)} title="Open payouts workbench" onClick={() => ui.navigate("payouts")} />
        <Kv k="Platform Commission Fees" v={fmt(fin.fees)} title="Inspect double-entry ledger" onClick={() => ui.navigate("ledger")} />
        <Kv k="Escrow Refunded" v={fmt(fin.refunded)} />
        <Kv k="ERCA Withholding (3%)" v={fmt(fin.wh)} title="Open withholding filings" onClick={() => ui.navigate("withholding")} />
        <Kv k="Failed Inbound Payments" v={String(fin.failPay)} warn={fin.failPay > 0} onClick={() => ui.navigate("payments")} />
        <Kv k="Failed Outbound Payouts" v={String(fin.failPo)} warn={fin.failPo > 0} onClick={() => ui.navigate("payouts")} />
      </div>

      <div className="grid g2" style={{ marginBottom: 22 }}>
        <Card className="card-pad">
          <div className="ch-head">
            <div>
              <div className="ch-title">Monthly Payment Volume</div>
              <div className="ch-sub">Settled inbound payments across the trailing 12 months</div>
            </div>
          </div>
          {hasMonthlyVolume ? (
            <AreaChart
              labels={rep.series.volume12.labels}
              values={rep.series.volume12.values}
              color="#2563eb"
              unit="ETB"
            />
          ) : (
            <div className="sh-chart-empty">
              <strong>No monthly payment volume returned</strong>
              <span>Completed payment records will populate this chart automatically.</span>
            </div>
          )}
        </Card>

        <Card className="card-pad">
          <div className="ch-head">
            <div>
              <div className="ch-title">Monthly Throughput by Rail</div>
              <div className="ch-sub">Telebirr vs CBE Birr (trailing 12 months)</div>
            </div>
            <ChartLegend
              series={[
                { name: "Telebirr", color: "#0284c7" },
                { name: "CBE Birr", color: "#7c3aed" },
              ]}
            />
          </div>
          {hasRailMonthly ? (
            <BarChart
              labels={rep.series.railMonthly.labels}
              series={[
                { name: "Telebirr", values: rep.series.railMonthly.telebirr, color: "#0284c7" },
                { name: "CBE Birr", values: rep.series.railMonthly.cbe, color: "#7c3aed" },
              ]}
            />
          ) : (
            <div className="sh-chart-empty">
              <strong>No rail breakdown available yet</strong>
              <span>Telebirr and CBE Birr monthly totals appear once settled.</span>
            </div>
          )}
        </Card>
      </div>

      <SecTitle icon={BarChart3}>Live Operational Queues &amp; Workbench Routing</SecTitle>
      {selCohort ? (
        <div className="queue-wrap" style={{ marginBottom: 24 }}>
          <div className="queue-list">
            {cohorts.map((c) => {
              const active = selCohort.id === c.id;
              return (
                <div
                  key={c.id}
                  className={`queue-item ${active ? "active" : ""}`}
                  onClick={() => setSelectedQueueId(c.id)}
                >
                  <div className="qi-top">
                    <div>
                      <div className="qi-name">{c.title}</div>
                      <div className="qi-sub">{c.sub}</div>
                    </div>
                    <Pill s={c.status} />
                  </div>
                  <div className="qi-foot">
                    <span className="mono" style={{ fontWeight: 700 }}>
                      {fmt(c.exposureMinor)}
                    </span>
                    <span>·</span>
                    <span>{c.count} item(s)</span>
                  </div>
                </div>
              );
            })}
          </div>

          <Card className="queue-detail">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Pill s={selCohort.status} />
                  <span className="mono" style={{ fontSize: 12, color: "var(--ops-text-3)" }}>
                    {selCohort.count} live records
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    margin: "8px 0 2px",
                    letterSpacing: "-.02em",
                  }}
                >
                  {selCohort.title}
                </h3>
                <div style={{ fontSize: 12.5, color: "var(--ops-text-2)" }}>{selCohort.sub}</div>
              </div>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => ui.navigate(selCohort.targetTab)}
              >
                <ExternalLink size={13} /> Open Authoritative Workbench
              </button>
            </div>

            <div className="info-grid">
              <div className="info-cell">
                <div className="k">Queue Exposure</div>
                <div className="v mono">{fmt(selCohort.exposureMinor)}</div>
              </div>
              <div className="info-cell">
                <div className="k">Live Record Count</div>
                <div className="v mono">{selCohort.count}</div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="sec-title" style={{ marginBottom: 8 }}>
                Live Queue Records ({selCohort.items.length})
              </div>
              {selCohort.items.length === 0 ? (
                <Empty icon={BarChart3}>No pending items in this operational queue.</Empty>
              ) : (
                <div className="tbl-wrap" tabIndex={0}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Party / Subject</th>
                        <th>Details</th>
                        <th>Amount</th>
                        <th>State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selCohort.items.map((item) => (
                        <tr
                          key={item.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => ui.navigate(selCohort.targetTab, item.id)}
                        >
                          <td className="mono" style={{ fontWeight: 700 }}>
                            {item.id}
                          </td>
                          <td className="cell-main">{item.party}</td>
                          <td>{item.detail}</td>
                          <td className="amount">
                            {item.amountMinor !== null ? fmt(item.amountMinor) : "—"}
                          </td>
                          <td>
                            <Pill s={item.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : null}

      <SecTitle icon={Briefcase}>Marketplace Breakdown</SecTitle>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <Card className="card-pad">
          <div className="ch-head">
            <div>
              <div className="ch-title">Users by Role</div>
              <div className="ch-sub">Registered accounts</div>
            </div>
            <Users size={15} style={{ color: "var(--ops-text-3)" }} />
          </div>
          <Donut
            centerSub="Total"
            segs={[
              { label: "Clients", value: mk.clients, color: "#2563eb" },
              { label: "Freelancers", value: mk.freelancers, color: "#059669" },
            ]}
          />
        </Card>
        <Card className="card-pad">
          <div className="ch-head">
            <div>
              <div className="ch-title">Contracts by Status</div>
              <div className="ch-sub">{mk.totalContracts} total contracts</div>
            </div>
            <Briefcase size={15} style={{ color: "var(--ops-text-3)" }} />
          </div>
          <Donut centerSub="Contracts" segs={statusSegs} />
        </Card>
        <Card className="card-pad">
          <div className="ch-head">
            <div>
              <div className="ch-title">Completed by Category</div>
              <div className="ch-sub">Top marketplace categories</div>
            </div>
            <CreditCard size={15} style={{ color: "var(--ops-text-3)" }} />
          </div>
          {rep.series.categoryDone.length ? (
            <HBars rows={rep.series.categoryDone} />
          ) : (
            <div className="empty">No completed contracts categorized yet.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
