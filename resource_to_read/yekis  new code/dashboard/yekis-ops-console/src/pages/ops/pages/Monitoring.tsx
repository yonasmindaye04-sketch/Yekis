/* ────────────────────────────────────────────────────────────────────────
   Monitoring.tsx — infrastructure checks + ledger integrity.
   GET /admin/health
   ──────────────────────────────────────────────────────────────────────── */

import { Activity, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { dts, fmt, opsApi, useApi } from "../opsApi";
import type { HealthState } from "../opsTypes";
import { Banner, ErrorBox, LoadingBox, PageHead } from "../components/ui";

export default function Monitoring() {
  const { data, error, loading, reload } = useApi<HealthState>(opsApi.health);

  if (loading && !data) return <LoadingBox />;
  if (error || !data) return <ErrorBox error={error ?? "No data"} reload={reload} />;

  return (
    <div className="fade">
      <PageHead
        title="System Health"
        sub="Infrastructure checks and ledger integrity monitor"
        right={<button className="btn btn-ghost" onClick={reload}><RefreshCw size={14} /> Check Again</button>}
      />
      <div className="grid g5" style={{ marginBottom: 16 }}>
        {Object.entries(data.checks).map(([n, c]) => (
          <div className={`card health-card ${c.ok ? "h-ok" : "h-bad"}`} key={n}>
            <div className="h-name">{n.replace(/_/g, " ")}</div>
            <div className="h-state">
              {c.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {c.ok ? "Healthy" : "Degraded"}
            </div>
            <div className="h-detail">{c.d || ""}</div>
          </div>
        ))}
      </div>
      {data.ledger.bal ? (
        <Banner tone="b-green" icon={CheckCircle2} strong="Ledger: Balanced" rest={`— debits ${fmt(data.ledger.dr)} · credits ${fmt(data.ledger.cr)}`} />
      ) : (
        <Banner tone="b-red" icon={XCircle} strong="Ledger: MISMATCH" rest={`— debits ${fmt(data.ledger.dr)} · credits ${fmt(data.ledger.cr)}`} />
      )}
      <div style={{ fontSize: 12, color: "var(--ops-text-3)", marginTop: 4, fontWeight: 600 }}>
        <Activity size={12} style={{ display: "inline", verticalAlign: -2 }} /> Last checked {dts(data.checkedAt)}
      </div>
    </div>
  );
}
