/* ────────────────────────────────────────────────────────────────────────
   Reports.tsx — financial + marketplace analytics with charts.
   GET /admin/reports
   ──────────────────────────────────────────────────────────────────────── */

import { BarChart3, Briefcase, CreditCard, DollarSign, Download, RefreshCw, Users } from "lucide-react";
import { dts, fmt, opsApi, useApi } from "../opsApi";
import type { ReportsBundle } from "../opsTypes";
import { AreaChart, BarChart, ChartLegend, Donut, HBars } from "../components/charts";
import { ErrorBox, Kv, LoadingBox, PageHead, SecTitle } from "../components/ui";
import { toCsv, downloadCsv, etb } from "../opsExport";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";

const ST_C: Record<string, string> = {
  ACTIVE: "#059669",
  COMPLETED: "#2563eb",
  TERMINATED: "#dc2626",
  CANCELLED: "#93a0b4",
};

export default function Reports() {
  const { data, error, loading, reload } = useApi<ReportsBundle>(opsApi.reports);

  if (loading && !data) return <LoadingBox />;
  if (error || !data) return <ErrorBox error={error ?? "No data"} reload={reload} />;

  /* Exports the same figures shown on screen — there is no server-side
     export endpoint, so this is explicitly a snapshot of this report. */
  const download = () =>
    downloadCsv(
      "yekis-reports",
      toCsv(
        ["Section", "Metric", "Value (ETB or count)"],
        [
          ["Financial", "Transaction volume", etb(f.vol)],
          ["Financial", "Released funds", etb(f.released)],
          ["Financial", "Refunded funds", etb(f.refunded)],
          ["Financial", "Payouts", etb(f.payouts)],
          ["Financial", "Platform fees", etb(f.fees)],
          ["Financial", "Withholding tax accrued", etb(f.wh)],
          ["Financial", "Failed payments", f.failPay],
          ["Financial", "Failed payouts", f.failPo],
          ["Marketplace", "Clients", mk.clients],
          ["Marketplace", "Freelancers", mk.freelancers],
          ["Marketplace", "Total contracts", mk.totalContracts],
          ["Marketplace", "Open disputes", mk.disputes],
          ["Marketplace", "Open risk flags", mk.flags],
          ...Object.entries(mk.byStatus).map(([k, v]) => ["Marketplace", `Contracts · ${k}`, v]),
          ...data.series.volume12.labels.map((l, i) => [
            "Series · weekly volume (ETB M)",
            l,
            data.series.volume12.values[i] ?? 0,
          ]),
        ] as Array<Array<string | number>>,
      ),
    );

  const f = data.financial;
  const mk = data.marketplace;
  const statusSegs = Object.entries(mk.byStatus).map(([s, n]) => ({
    label: s.replace(/_/g, " "),
    value: n,
    color: ST_C[s] ?? "#93a0b4",
  }));

  return (
    <div className="fade">
      <PageHead
        title="Reports"
        sub={`Financial and marketplace analytics · generated ${dts(new Date().toISOString())}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline" onClick={reload}><RefreshCw size={14} /> Refresh</Button>
            <Button onClick={download}><Download size={14} /> Export CSV</Button>
          </div>
        }
      />
      <SecTitle icon={DollarSign}>Financial</SecTitle>
      <div className="grid g4" style={{ marginBottom: 24 }}>
        <Kv k="Transaction Volume" v={fmt(f.vol)} />
        <Kv k="Released Funds" v={fmt(f.released)} />
        <Kv k="Refunded Funds" v={fmt(f.refunded)} />
        <Kv k="Payouts" v={fmt(f.payouts)} />
        <Kv k="Platform Fees" v={fmt(f.fees)} />
        <Kv k="WH Tax Accrued" v={fmt(f.wh)} />
        <Kv k="Failed Payments" v={f.failPay} warn />
        <Kv k="Failed Payouts" v={f.failPo} warn />
      </div>
      <SecTitle icon={Users}>Marketplace</SecTitle>
      <div className="grid g5" style={{ marginBottom: 24 }}>
        <Kv k="Clients" v={mk.clients.toLocaleString()} />
        <Kv k="Freelancers" v={mk.freelancers.toLocaleString()} />
        <Kv k="Total Contracts" v={mk.totalContracts.toLocaleString()} />
        <Kv k="Open Disputes" v={mk.disputes} warn />
        <Kv k="Open Risk Flags" v={mk.flags} warn />
      </div>
      <div className="grid gc-2-1" style={{ marginBottom: 16 }}>
        <Card className="card card-pad">
          <SecTitle icon={BarChart3}>
            Transaction Volume — last 12 weeks{" "}
            <span style={{ fontSize: 11, color: "var(--ops-text-3)", fontWeight: 700 }}>ETB millions / week</span>
          </SecTitle>
          <AreaChart labels={data.series.volume12.labels} values={data.series.volume12.values} color="#059669" />
        </Card>
        <Card className="card card-pad">
          <SecTitle icon={Briefcase}>Contracts by Status</SecTitle>
          <Donut segs={statusSegs} centerSub="contracts" />
        </Card>
      </div>
      <div className="grid gc-1-1">
        <Card className="card card-pad">
          <SecTitle icon={CreditCard}>Rail Volume — monthly</SecTitle>
          <BarChart
            labels={data.series.railMonthly.labels}
            series={[
              { name: "Telebirr", color: "#22c55e", values: data.series.railMonthly.telebirr },
              { name: "CBE Birr", color: "#3b82f6", values: data.series.railMonthly.cbe },
            ]}
          />
          <ChartLegend series={[{ name: "Telebirr", color: "#22c55e" }, { name: "CBE Birr", color: "#3b82f6" }]} />
        </Card>
        <Card className="card card-pad">
          <SecTitle icon={Briefcase}>Completed Contracts by Category</SecTitle>
          <HBars rows={data.series.categoryDone.map((c) => ({ ...c, meta: "completed" }))} />
        </Card>
      </div>
    </div>
  );
}
