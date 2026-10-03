/* ────────────────────────────────────────────────────────────────────────
   Escrow.tsx — milestone escrow oversight. GET /admin/escrows
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { DollarSign, RefreshCw, Search } from "lucide-react";
import { dt, fmt, opsApi, useApi } from "../opsApi";
import type { Escrow } from "../opsTypes";
import { Banner, Empty, ErrorBox, LoadingBox, OpsTable, PageHead, Pager, Pill } from "../components/ui";

const STATES = ["ALL", "PENDING", "ESCROW_HELD", "WORK_IN_PROGRESS", "SUBMITTED_FOR_REVIEW", "DISPUTED", "RELEASED", "REFUNDED", "PARTIAL_REFUND"];

export default function EscrowPage() {
  const { data, error, loading, reload } = useApi<Escrow[]>(opsApi.escrows);
  const [state, setState] = useState("ALL");

  if (loading && !data) return <LoadingBox />;
  if (error || !data) return <ErrorBox error={error ?? "No data"} reload={reload} />;

  const held = data.filter((e) => e.state === "ESCROW_HELD" || e.state === "WORK_IN_PROGRESS").reduce((s, e) => s + e.amt, 0);
  const rows = data.filter((e) => state === "ALL" || e.state === state);

  return (
    <div className="fade">
      <PageHead title="Escrow Oversight" sub="Milestone escrow holdings, releases and dispute states" />
      <Banner tone="b-green" icon={DollarSign} strong={`Currently held: ${fmt(held)}`} rest={`across ${data.length} milestone escrow rows.`} />
      <div className="card filters">
        <div className="f-search"><Search size={15} /><input placeholder="Search by contract or freelancer…" /></div>
        <select className="sel" value={state} onChange={(e) => setState(e.target.value)}>
          {STATES.map((s) => (
            <option key={s} value={s}>{s === "ALL" ? "All escrow states" : s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <button className="btn btn-ghost" onClick={reload}><RefreshCw size={14} /> Refresh</button>
      </div>
      <OpsTable heads={["Contract", "Milestone", "Freelancer", "Amount", "Held / Released", "State", "Created"]} foot={<Pager n={rows.length} />}>
        {rows.length === 0 ? (
          <tr><td colSpan={7}><Empty icon={DollarSign}>No milestone escrows match.</Empty></td></tr>
        ) : (
          rows.map((e) => (
            <tr key={e.id}>
              <td className="cell-main" style={{ fontWeight: 600 }}>{e.job}</td>
              <td>{e.title}</td>
              <td style={{ color: "var(--ops-text-2)" }}>{e.fl}</td>
              <td className="amount">{fmt(e.amt)}</td>
              <td style={{ fontSize: 12, color: "var(--ops-text-2)", fontWeight: 600 }}>{e.rail}</td>
              <td><Pill s={e.state} /></td>
              <td style={{ color: "var(--ops-text-2)" }}>{dt(e.created)}</td>
            </tr>
          ))
        )}
      </OpsTable>
    </div>
  );
}
