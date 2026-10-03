/* ────────────────────────────────────────────────────────────────────────
   Ledger.tsx — double-entry ledger: account cards, integrity banner,
   journal table. GET /admin/ledger
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { BookOpen, CheckCircle2, RefreshCw, Search } from "lucide-react";
import { dts, fmt, opsApi, useApi } from "../opsApi";
import type { LedgerBundle } from "../opsTypes";
import { Banner, ErrorBox, LoadingBox, OpsTable, PageHead, Pager, Pill } from "../components/ui";

export default function Ledger() {
  const { data, error, loading, reload } = useApi<LedgerBundle>(opsApi.ledger);
  const [ref, setRef] = useState("ALL");

  if (loading && !data) return <LoadingBox />;
  if (error || !data) return <ErrorBox error={error ?? "No data"} reload={reload} />;

  const rows = data.journal.filter((j) => ref === "ALL" || j.ref === ref);

  return (
    <div className="fade">
      <PageHead title="Double-Entry Ledger" sub="Account balances, journal entries and integrity verification" />
      <div className="grid g6" style={{ marginBottom: 16 }}>
        {data.accounts.map((a) => (
          <div className="card acct-card" key={a.code}>
            <div className="acct-type" style={{ color: a.c }}>{a.type}</div>
            <div className="acct-name">{a.name}</div>
            <div className="acct-bal">{fmt(a.bal)}</div>
            <div className="acct-code mono">{a.code}</div>
          </div>
        ))}
      </div>
      {data.integrity.bal ? (
        <Banner tone="b-green" icon={CheckCircle2} strong="Integrity: Balanced" rest={`— debits ${fmt(data.integrity.dr)} · credits ${fmt(data.integrity.cr)} · ${data.integrity.entries.toLocaleString()} entries across ${data.integrity.journals} journals.`} />
      ) : (
        <Banner tone="b-red" icon={BookOpen} strong="Integrity: MISMATCH" rest={`— debits ${fmt(data.integrity.dr)} · credits ${fmt(data.integrity.cr)}`} />
      )}
      <div className="card filters">
        <div className="f-search"><Search size={15} /><input placeholder="Search description / reference / idempotency key…" /></div>
        <select className="sel" value={ref} onChange={(e) => setRef(e.target.value)}>
          {["ALL", "WALLET_TOPUP", "ESCROW_FUND", "MILESTONE_RELEASE", "DISPUTE_REFUND", "WITHDRAWAL_PAYOUT"].map((s) => (
            <option key={s} value={s}>{s === "ALL" ? "All journal types" : s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <button className="btn btn-ghost" onClick={reload}><RefreshCw size={14} /> Refresh</button>
      </div>
      <OpsTable heads={["Description", "Reference", "Debited", "Credited", "Posted"]} foot={<Pager n={rows.length} />}>
        {rows.map((j) => (
          <tr key={j.id}>
            <td className="cell-main" style={{ fontWeight: 600 }}>{j.desc}</td>
            <td><Pill s={j.ref} /></td>
            <td className="amount">{fmt(j.dr)}</td>
            <td className="amount">{fmt(j.cr)}</td>
            <td style={{ color: "var(--ops-text-2)", fontSize: 12.5 }}>{dts(j.posted)}</td>
          </tr>
        ))}
      </OpsTable>
    </div>
  );
}
