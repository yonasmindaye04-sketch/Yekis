/* ────────────────────────────────────────────────────────────────────────
   Contracts.tsx — contract list with client-side search/status filters and
   an inline detail view (milestones, payments, disputes).
   GET /admin/contracts
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, RefreshCw, Search } from "lucide-react";
import { dt, fmt, opsApi, useApi, withContractDetail } from "../opsApi";
import type { Contract } from "../opsTypes";
import { Empty, ErrorBox, LoadingBox, OpsTable, PageHead, Pager, Pill, Rail } from "../components/ui";

export default function Contracts() {
  const { data, error, loading, reload } = useApi<Contract[]>(opsApi.contracts);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [detailId, setDetailId] = useState<string | null>(null);

  // Milestones / payments / disputes live on a separate detail route, so the
  // row is fetched when it is opened rather than for every row up front.
  const [detail, setDetail] = useState<Contract | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  const openDetail = useCallback(async (id: string) => {
    setDetailId(id);
    setDetail(null);
    setDetailBusy(true);
    setDetailErr(null);
    try {
      const raw = await opsApi.contractDetail(id);
      const row = (data ?? []).find((c) => c.id === id);
      if (row) setDetail(withContractDetail(row, raw));
    } catch (e) {
      setDetailErr(e instanceof Error ? e.message : "Could not load contract");
    } finally {
      setDetailBusy(false);
    }
  }, [data]);

  const closeDetail = useCallback(() => {
    setDetailId(null);
    setDetail(null);
    setDetailErr(null);
  }, []);

  if (loading && !data) return <LoadingBox />;
  if (error || !data) return <ErrorBox error={error ?? "No data"} reload={reload} />;

  if (detailId) {
    if (detailBusy && !detail) return <LoadingBox />;
    if (detailErr)
      return (
        <div className="fade">
          <button className="back-link" onClick={closeDetail}>
            <ChevronLeft size={15} /> Back to contracts
          </button>
          <ErrorBox error={detailErr} reload={() => void openDetail(detailId)} />
        </div>
      );
    if (detail) {
      return (
        <div className="fade">
          <button className="back-link" onClick={closeDetail}>
            <ChevronLeft size={15} /> Back to contracts
          </button>
          <div className="card card-pad">
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--ops-text-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
              Contract Overview
            </div>
            <h2 style={{ fontSize: 20, margin: "6px 0 4px", letterSpacing: "-.02em", fontWeight: 800 }}>{detail.title}</h2>
            <div style={{ fontSize: 12.5, color: "var(--ops-text-2)" }} className="mono">
              {detail.id} · {detail.cat} · {dt(detail.created)}
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
              <Pill s={detail.status} />
              <span className="pill p-sky"><span className="pdot" />Escrow held: {fmt(detail.escrowHeld)}</span>
            </div>
            <div className="grid g2" style={{ marginTop: 18 }}>
              <div className="kv"><div className="kv-k">Client</div><div className="kv-v" style={{ fontSize: 15 }}>{detail.client}</div><div style={{ fontSize: 12, color: "var(--ops-text-2)", marginTop: 2 }}>{detail.clientEmail}</div></div>
              <div className="kv"><div className="kv-k">Freelancer</div><div className="kv-v" style={{ fontSize: 15 }}>{detail.fl}</div><div style={{ fontSize: 12, color: "var(--ops-text-2)", marginTop: 2 }}>{detail.flEmail}</div></div>
            </div>
            <div className="sec-title" style={{ marginTop: 22 }}>Milestones ({detail.ms})</div>
            <div className="tbl-wrap" style={{ border: "1px solid var(--ops-border-soft)", borderRadius: 10 }}>
              <table className="tbl">
                <thead><tr><th>Title</th><th>State</th><th>Amount</th></tr></thead>
                <tbody>
                  {detail.milestones.map((ms, i) => (
                    <tr key={i}><td className="cell-main">{ms.t}</td><td><Pill s={ms.s} /></td><td className="amount">{fmt(ms.a)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sec-title" style={{ marginTop: 22 }}>Payments</div>
            {detail.pays.length === 0 ? (
              <div className="empty">No payments recorded.</div>
            ) : (
              <div className="tbl-wrap" style={{ border: "1px solid var(--ops-border-soft)", borderRadius: 10 }}>
                <table className="tbl">
                  <thead><tr><th>Provider</th><th>Status</th><th>Amount</th><th>Created</th></tr></thead>
                  <tbody>
                    {detail.pays.map((p, i) => (
                      <tr key={i}><td><Rail p={p.p} /></td><td><Pill s={p.s} /></td><td className="amount">{fmt(p.a)}</td><td style={{ color: "var(--ops-text-2)" }}>{dt(p.c)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {detail.disputes.length ? (
              <>
                <div className="sec-title" style={{ marginTop: 22 }}>Disputes</div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {detail.disputes.map((d, i) => (
                    <span className="pill p-red" key={i}><span className="pdot" />{d.cat} · {d.stage.replace("STAGE_", "Stage ")}</span>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      );
    }
    return <LoadingBox />;
  }

  const needle = q.toLowerCase();
  const rows = data.filter(
    (c) =>
      (status === "ALL" || c.status === status) &&
      (!needle || c.title.toLowerCase().includes(needle) || c.client.toLowerCase().includes(needle) || c.fl.toLowerCase().includes(needle)),
  );

  return (
    <div className="fade">
      <PageHead
        title="Contracts"
        sub="Manage and monitor all platform contracts, milestones and disputes"
        right={<button className="btn btn-primary"><Download size={14} /> Export CSV</button>}
      />
      <div className="card filters">
        <div className="f-search">
          <Search size={15} />
          <input placeholder="Search title, client, freelancer…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="sel" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["ALL", "ACTIVE", "COMPLETED", "TERMINATED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>{s === "ALL" ? "All statuses" : s[0] + s.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <button className="btn btn-ghost" onClick={reload}><RefreshCw size={14} /> Refresh</button>
      </div>
      <OpsTable heads={["Contract", "Client", "Freelancer", "Milestones", "Status", "Created", ""]} foot={<Pager n={rows.length} />}>
        {rows.length === 0 ? (
          <tr><td colSpan={7}><Empty icon={FileText}>No contracts found.</Empty></td></tr>
        ) : (
          rows.map((c) => (
            <tr className="clickable" key={c.id} onClick={() => void openDetail(c.id)}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ color: "var(--ops-text-3)" }}><FileText size={15} /></span>
                  <div><div className="cell-main">{c.title}</div><div className="cell-sub mono">{c.id}</div></div>
                </div>
              </td>
              <td><div className="cell-main" style={{ fontWeight: 600 }}>{c.client}</div><div className="cell-sub">{c.clientEmail}</div></td>
              <td><div className="cell-main" style={{ fontWeight: 600 }}>{c.fl}</div><div className="cell-sub">{c.flEmail}</div></td>
              <td style={{ fontWeight: 700 }}>{c.ms}</td>
              <td><Pill s={c.status} /></td>
              <td style={{ color: "var(--ops-text-2)" }}>{dt(c.created)}</td>
              <td style={{ color: "var(--ops-text-3)" }}><ChevronRight size={15} /></td>
            </tr>
          ))
        )}
      </OpsTable>
    </div>
  );
}
