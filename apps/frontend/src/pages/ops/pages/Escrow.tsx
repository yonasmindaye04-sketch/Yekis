/* ────────────────────────────────────────────────────────────────────────
   Escrow.tsx — milestone escrow oversight. GET /admin/escrows
   Search and escrow-state filters run server-side. Note the backend rejects
   "PENDING" as an escrowState, so the option list comes from opsConst.
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { DollarSign, RefreshCw, Search } from "lucide-react";
import { dt, fmt, opsApi, opsListApi } from "../opsApi";
import { useToast } from "../components/ui";
import { useListPage } from "../opsList";
import { ESCROW_STATES, HELD_STATES } from "../opsConst";
import type { Escrow } from "../opsTypes";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import {
  Banner,
  Empty,
  ErrorBox,
  FilterSelect,
  Kv,
  LoadingBox,
  OpsTable,
  PageHead,
  Pager,
  Pill,
} from "../components/ui";

export default function EscrowPage() {
  const toast = useToast();
  const [state, setState] = useState("");

  const list = useListPage<Escrow>(
    (p) => opsListApi.escrows({ ...p, escrowState: state }),
    25,
    [state],
  );
  const { rows, total, page, pages, loading, error, search, setSearch, setPage, reload } = list;
  const release = async (id: string) => {
    const reason = window.prompt("Reason for administrative escrow release (minimum 10 characters):") ?? "";
    if (reason.trim().length < 10) { toast("A reason of at least 10 characters is required."); return; }
    try { await opsApi.releaseEscrow(id, reason.trim()); toast("Escrow released and audited."); reload(); }
    catch (e) { toast(e instanceof Error ? e.message : "Could not release escrow"); }
  };
  const toggleHold = async (e: Escrow) => {
    const reason = window.prompt(`${e.held ? "Reason for removing" : "Reason for placing"} this escrow hold (minimum 10 characters):`) ?? "";
    if (reason.trim().length < 10) { toast("A reason of at least 10 characters is required."); return; }
    try { if (e.held) await opsApi.unholdEscrow(e.id, reason.trim()); else await opsApi.holdEscrow(e.id, reason.trim()); toast(e.held ? "Escrow hold removed." : "Escrow placed on hold."); reload(); }
    catch (err) { toast(err instanceof Error ? err.message : "Could not update escrow hold"); }
  };

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;

  const held = rows
    .filter((e) => HELD_STATES.includes(e.state as (typeof HELD_STATES)[number]))
    .reduce((s, e) => s + e.amt, 0);

  return (
    <div className="fade">
      <PageHead title="Escrow Oversight" sub="Milestone escrow holdings, releases and dispute states" />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kv k="Held on this page" v={fmt(held)} />
        <Kv k="Rows on this page" v={String(rows.length)} />
        <Kv k="Total matching" v={total.toLocaleString()} />
        <Kv k="Disputed" v={String(rows.filter((e) => e.state === "DISPUTED").length)} warn />
      </div>
      {held > 0 ? (
        <Banner
          tone="b-green"
          icon={DollarSign}
          strong={`Currently held: ${fmt(held)}`}
          rest="Sum of milestones in ESCROW_HELD, WORK_IN_PROGRESS or SUBMITTED_FOR_REVIEW on this page."
        />
      ) : null}
      <Card className="card filters" style={{ marginTop: 16 }}>
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search milestone, contract or freelancer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect value={state} onChange={setState} options={ESCROW_STATES} allLabel="All escrow states" label="Escrow state" />
        <Button variant="outline" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </Card>
      <OpsTable
        heads={["Contract", "Milestone", "Freelancer", "Amount", "Held / Released", "State", "Created", ""]}
        foot={<Pager page={page} pages={pages} total={total} onPage={setPage} unit="milestones" />}
      >
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
              <td><Pill s={e.held ? "ADMIN_HOLD" : e.state} /></td>
              <td style={{ color: "var(--ops-text-2)" }}>{dt(e.created)}</td>
              <td><div style={{ display: "flex", gap: 5 }}>{e.state !== "RELEASED" ? <Button variant="ghost" size="sm" onClick={() => void toggleHold(e)}>{e.held ? "Unhold" : "Hold"}</Button> : null}{!e.held && (e.state === "SUBMITTED_FOR_REVIEW" || e.state === "DISPUTED") ? <Button variant="outline" size="sm" onClick={() => void release(e.id)}>Release</Button> : null}</div></td>
            </tr>
          ))
        )}
      </OpsTable>
    </div>
  );
}
