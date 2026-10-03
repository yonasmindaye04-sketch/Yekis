import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ChevronRight, ChevronLeft, FileText, Search } from "lucide-react";
import { api } from "./api/client";
import { statusTone } from "./AdminOpsPages";

interface ContractRow {
  id: string;
  status: string;
  createdAt: string;
  client: { id: string; email: string; displayName: string | null; role: string };
  freelancer: { id: string; email: string; displayName: string | null; role: string };
  job: { id: string; title: string; category: string; status: string };
  _count: { milestones: number };
}
interface MilestoneRow {
  id: string;
  title: string;
  amountMinor: number;
  escrowState: string;
  submittedAt: string | null;
  releasedAt: string | null;
}
interface ContractDetail {
  contract: { id: string; status: string; jobTitle: string; jobCategory: string; createdAt: string };
  parties: {
    client: { email: string; displayName: string | null; id: string };
    freelancer: { email: string; displayName: string | null; id: string };
  };
  milestones: MilestoneRow[];
  payments: { id: string; status: string; amountMinor: number; provider: string; createdAt: string }[];
  disputes: { id: string; stage: string; category: string }[];
  totals: { escrowHeldMinor: number; milestoneCount: number };
}

const fmt = (minor: number) => `ETB ${(minor / 100).toLocaleString()}`;

export function AdminContractsPage() {
  const [items, setItems] = useState<ContractRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<ContractDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await api.adminListContracts({
        page,
        q: q || undefined,
        status: status !== "ALL" ? status : undefined,
      });
      const typed = res as { items: ContractRow[]; total: number };
      setItems(typed.items ?? []);
      setTotal(typed.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contracts");
    } finally { setLoading(false); }
  }, [page, q, status]);

  useEffect(() => { void load(); }, [load]);

  const openDetail = async (id: string) => {
    try { setDetail((await api.adminGetContract(id)) as ContractDetail); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load contract"); }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  if (detail) {
    return (
      <div className="oc-fade">
        <button className="oc-back" onClick={() => setDetail(null)}>
          <ChevronLeft size={15} /> Back to contracts
        </button>
        <div className="oc-card oc-card-pad">
          <div className="oc-kv-k">Contract Overview</div>
          <h2 style={{ fontSize: 20, margin: "6px 0 4px", letterSpacing: "-0.02em", fontWeight: 800 }}>
            {detail.contract.jobTitle}
          </h2>
          <div style={{ fontSize: 12.5, color: "var(--oc-text-2)" }} className="oc-mono">
            {detail.contract.id} · {detail.contract.jobCategory} · {new Date(detail.contract.createdAt).toLocaleDateString()}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            <span className={`oc-pill ${statusTone(detail.contract.status)}`}>
              <span className="oc-pdot"></span>{detail.contract.status.replace(/_/g, " ")}
            </span>
            <span className="oc-pill oc-p-sky">
              <span className="oc-pdot"></span>Escrow held: {fmt(detail.totals.escrowHeldMinor)}
            </span>
          </div>
          <div className="oc-grid oc-g2" style={{ marginTop: 18 }}>
            <div className="oc-kv">
              <div className="oc-kv-k">Client</div>
              <div className="oc-kv-v" style={{ fontSize: 15 }}>{detail.parties.client.displayName ?? detail.parties.client.email}</div>
              <div style={{ fontSize: 12, color: "var(--oc-text-2)", marginTop: 2 }}>{detail.parties.client.email}</div>
            </div>
            <div className="oc-kv">
              <div className="oc-kv-k">Freelancer</div>
              <div className="oc-kv-v" style={{ fontSize: 15 }}>{detail.parties.freelancer.displayName ?? detail.parties.freelancer.email}</div>
              <div style={{ fontSize: 12, color: "var(--oc-text-2)", marginTop: 2 }}>{detail.parties.freelancer.email}</div>
            </div>
          </div>
          <div className="oc-sec-title" style={{ marginTop: 22 }}>Milestones ({detail.totals.milestoneCount})</div>
          <div className="oc-tbl-wrap" style={{ border: "1px solid var(--oc-border-soft)", borderRadius: 10 }}>
            <table className="oc-tbl">
              <thead><tr><th>Title</th><th>State</th><th>Amount</th></tr></thead>
              <tbody>
                {detail.milestones.map((m) => (
                  <tr key={m.id}>
                    <td className="oc-cell-main">{m.title}</td>
                    <td>
                      <span className={`oc-pill ${statusTone(m.escrowState)}`}>
                        <span className="oc-pdot"></span>{m.escrowState.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="oc-amount">{fmt(m.amountMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="oc-sec-title" style={{ marginTop: 22 }}>Payments</div>
          {detail.payments.length === 0 ? <div className="oc-empty">No payments recorded.</div> : (
            <div className="oc-tbl-wrap" style={{ border: "1px solid var(--oc-border-soft)", borderRadius: 10 }}>
              <table className="oc-tbl">
                <thead><tr><th>Provider</th><th>Status</th><th>Amount</th><th>Created</th></tr></thead>
                <tbody>
                  {detail.payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className={`oc-rail ${p.provider === "TELEBIRR" ? "oc-rail-tele" : "oc-rail-cbe"}`}>
                          <i></i>{p.provider}
                        </span>
                      </td>
                      <td>
                        <span className={`oc-pill ${statusTone(p.status)}`}>
                          <span className="oc-pdot"></span>{p.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="oc-amount">{fmt(p.amountMinor)}</td>
                      <td style={{ color: "var(--oc-text-2)" }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {detail.disputes && detail.disputes.length > 0 && (
            <>
              <div className="oc-sec-title" style={{ marginTop: 22 }}>Disputes</div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {detail.disputes.map((d) => (
                  <span key={d.id} className="oc-pill oc-p-red" title={d.id}>
                    <span className="oc-pdot"></span>
                    {d.category.replace(/_/g, " ")} · {d.stage.replace("STAGE_", "Stage ").replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="oc-fade">
      <div className="oc-page-head">
        <div>
          <div className="oc-page-title">Contracts</div>
          <div className="oc-page-sub">Manage and monitor all platform contracts, milestones and disputes</div>
        </div>
      </div>
      <div className="oc-card oc-filters">
        <div className="oc-f-search">
          <Search size={15} />
          <input
            placeholder="Search title, client, freelancer…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>
        <select className="oc-sel" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="TERMINATED">Terminated</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button className="oc-btn oc-btn-ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? "fa-spin" : ""} /> Refresh
        </button>
      </div>
      {error && <p className="oc-empty" style={{ color: "var(--oc-red)" }}>{error}</p>}
      <div className="oc-card">
        <div className="oc-tbl-wrap">
          <table className="oc-tbl">
            <thead>
              <tr><th>Contract</th><th>Client</th><th>Freelancer</th><th>Milestones</th><th>Status</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr><td colSpan={7}><div className="oc-empty">Loading contracts…</div></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7}><div className="oc-empty">No contracts found.</div></td></tr>
              ) : items.map((row) => (
                <tr key={row.id} className="oc-clickable" onClick={() => void openDetail(row.id)}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ color: "var(--oc-text-3)" }}><FileText size={15} /></span>
                      <div>
                        <div className="oc-cell-main">{row.job.title}</div>
                        <div className="oc-cell-sub oc-mono">{row.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="oc-cell-main" style={{ fontWeight: 600 }}>{row.client.displayName ?? row.client.email}</div>
                    <div className="oc-cell-sub">{row.client.email}</div>
                  </td>
                  <td>
                    <div className="oc-cell-main" style={{ fontWeight: 600 }}>{row.freelancer.displayName ?? row.freelancer.email}</div>
                    <div className="oc-cell-sub">{row.freelancer.email}</div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{row._count.milestones}</td>
                  <td>
                    <span className={`oc-pill ${statusTone(row.status)}`}>
                      <span className="oc-pdot"></span>{row.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={{ color: "var(--oc-text-2)" }}>{new Date(row.createdAt).toLocaleDateString()}</td>
                  <td style={{ color: "var(--oc-text-3)" }}><ChevronRight size={15} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="oc-pager">
          <span className="oc-pager-info">Page {page} of {totalPages} · {total} records</span>
          <div className="oc-pager-btns">
            <button className="oc-btn oc-btn-ghost oc-btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</button>
            <button className="oc-btn oc-btn-ghost oc-btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default AdminContractsPage;
