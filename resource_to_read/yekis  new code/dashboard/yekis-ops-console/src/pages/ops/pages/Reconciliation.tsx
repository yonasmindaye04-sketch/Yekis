/* ────────────────────────────────────────────────────────────────────────
   Reconciliation.tsx — rail vs ledger verification. GET /admin/reconciliation
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { fmt, opsApi, useApi } from "../opsApi";
import type { ReconRow } from "../opsTypes";
import { Banner, Empty, ErrorBox, LoadingBox, OpsTable, PageHead, Pager, Pill, Rail } from "../components/ui";

export default function Reconciliation() {
  const { data, error, loading, reload } = useApi<ReconRow[]>(opsApi.reconciliation);
  const [status, setStatus] = useState("ALL");
  const [prov, setProv] = useState("ALL");

  if (loading && !data) return <LoadingBox />;
  if (error || !data) return <ErrorBox error={error ?? "No data"} reload={reload} />;

  const rows = data.filter((r) => (status === "ALL" || r.rec === status) && (prov === "ALL" || r.provider === prov));
  const mism = data.filter((r) => r.rec === "MISMATCH").length;

  return (
    <div className="fade">
      <PageHead title="Reconciliation" sub="Verify provider transactions against internal escrow records" />
      {mism ? (
        <Banner tone="b-red" icon={TriangleAlert} strong={`${mism} mismatch(es) detected.`} rest="Amounts differ between provider rail and internal ledger — investigate before next settlement run." />
      ) : null}
      <div className="card filters">
        <select className="sel" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["ALL", "MATCHED", "MISMATCH", "PENDING", "FAILED"].map((s) => (
            <option key={s} value={s}>{s === "ALL" ? "All reconciliation status" : s}</option>
          ))}
        </select>
        <select className="sel" value={prov} onChange={(e) => setProv(e.target.value)}>
          {["ALL", "TELEBIRR", "CBE_BIRR"].map((s) => (
            <option key={s} value={s}>{s === "ALL" ? "Any rail" : s}</option>
          ))}
        </select>
        <button className="btn btn-ghost" onClick={reload}><RefreshCw size={14} /> Refresh</button>
      </div>
      <OpsTable heads={["Provider TX ID", "Provider", "Internal Amount", "Escrow State", "Rec Status", "Difference"]} foot={<Pager n={rows.length} />}>
        {rows.length === 0 ? (
          <tr><td colSpan={6}><Empty icon={TriangleAlert}>No provider transactions to reconcile.</Empty></td></tr>
        ) : (
          rows.map((r) => (
            <tr key={r.id}>
              <td className="mono" style={{ fontSize: 12, color: "var(--ops-text-2)" }}>{r.txId}</td>
              <td><Rail p={r.provider} /></td>
              <td className="amount">{fmt(r.amt)}</td>
              <td><Pill s={r.esc} /></td>
              <td><Pill s={r.rec} /></td>
              <td>{r.diff == null ? <span style={{ color: "var(--ops-text-3)" }}>—</span> : <b style={{ color: "var(--ops-red)" }}>{fmt(r.diff)}</b>}</td>
            </tr>
          ))
        )}
      </OpsTable>
    </div>
  );
}
