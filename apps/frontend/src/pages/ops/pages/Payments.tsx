/* ────────────────────────────────────────────────────────────────────────
   Payments.tsx — inbound client funding across rails. GET /admin/payments
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { dts, fmt, opsApi, useApi } from "../opsApi";
import type { Payment } from "../opsTypes";
import { Empty, ErrorBox, LoadingBox, OpsTable, PageHead, Pager, Pill, Rail } from "../components/ui";

export default function Payments() {
  const { data, error, loading, reload } = useApi<Payment[]>(opsApi.payments);
  const [status, setStatus] = useState("ALL");
  const [prov, setProv] = useState("ALL");

  if (loading && !data) return <LoadingBox />;
  if (error || !data) return <ErrorBox error={error ?? "No data"} reload={reload} />;

  const rows = data.filter(
    (p) => (status === "ALL" || p.status === status) && (prov === "ALL" || p.provider === prov),
  );

  return (
    <div className="fade">
      <PageHead title="Payments" sub="Inbound client funding transactions across Telebirr & CBE Birr rails" />
      <div className="card filters">
        <div className="f-search"><Search size={15} /><input placeholder="Search batch ID or client email…" /></div>
        <select className="sel" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["ALL", "PENDING", "SUCCESS", "FAILED"].map((s) => (
            <option key={s} value={s}>{s === "ALL" ? "Any status" : s}</option>
          ))}
        </select>
        <select className="sel" value={prov} onChange={(e) => setProv(e.target.value)}>
          {["ALL", "TELEBIRR", "CBE_BIRR"].map((s) => (
            <option key={s} value={s}>{s === "ALL" ? "Any rail" : s}</option>
          ))}
        </select>
        <button className="btn btn-ghost" onClick={reload}><RefreshCw size={14} /> Refresh</button>
      </div>
      <OpsTable heads={["Provider TX ID", "Contract", "Client", "Provider", "Status", "Amount", "Created"]} foot={<Pager n={rows.length} />}>
        {rows.length === 0 ? (
          <tr><td colSpan={7}><Empty icon={Search}>No payments match this filter.</Empty></td></tr>
        ) : (
          rows.map((p) => (
            <tr key={p.id}>
              <td className="mono" style={{ fontSize: 12, color: "var(--ops-text-2)" }}>{p.txId}</td>
              <td className="cell-main" style={{ fontWeight: 600 }}>{p.job}</td>
              <td style={{ color: "var(--ops-text-2)" }}>{p.client}</td>
              <td><Rail p={p.provider} /></td>
              <td><Pill s={p.status} /></td>
              <td className="amount">{fmt(p.amount)}</td>
              <td style={{ color: "var(--ops-text-2)", fontSize: 12.5 }}>{dts(p.created)}</td>
            </tr>
          ))
        )}
      </OpsTable>
    </div>
  );
}
