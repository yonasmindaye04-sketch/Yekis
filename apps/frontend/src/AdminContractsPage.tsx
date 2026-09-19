import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ChevronRight, FileText } from "lucide-react";
import { api } from "./api/client";

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
      <div>
        <button className="btn-secondary" style={{ marginBottom: 12 }} onClick={() => setDetail(null)}>← Back to contracts</button>
        <div className="panel" style={{ padding: 16 }}>
          <p className="eyebrow">Contract overview</p>
          <h2 style={{ margin: "4px 0" }}>{detail.contract.jobTitle}</h2>
          <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--color-text-secondary)" }}>
            {detail.contract.id} · {detail.contract.jobCategory} · {new Date(detail.contract.createdAt).toLocaleDateString()}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <span className="status-pill">{detail.contract.status}</span>
            <span className="status-pill">Escrow held: ETB {(detail.totals.escrowHeldMinor / 100).toLocaleString()}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
            <div className="panel" style={{ padding: 12 }}>
              <p className="eyebrow" style={{ margin: "0 0 4px" }}>Client</p>
              <strong>{detail.parties.client.displayName ?? detail.parties.client.email}</strong>
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{detail.parties.client.email}</div>
            </div>
            <div className="panel" style={{ padding: 12 }}>
              <p className="eyebrow" style={{ margin: "0 0 4px" }}>Freelancer</p>
              <strong>{detail.parties.freelancer.displayName ?? detail.parties.freelancer.email}</strong>
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{detail.parties.freelancer.email}</div>
            </div>
          </div>
          <h3 style={{ margin: "16px 0 8px" }}>Milestones</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "8px" }}>Title</th>
                <th style={{ padding: "8px" }}>State</th>
                <th style={{ padding: "8px" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {detail.milestones.map((m) => (
                <tr key={m.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "8px" }}>{m.title}</td>
                  <td style={{ padding: "8px" }}><span className="status-pill">{m.escrowState}</span></td>
                  <td style={{ padding: "8px" }}>ETB {(m.amountMinor / 100).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 style={{ margin: "16px 0 8px" }}>Payments</h3>
          {detail.payments.length === 0 ? <p className="empty-state">No payments recorded.</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ padding: "8px" }}>Provider</th>
                  <th style={{ padding: "8px" }}>Status</th>
                  <th style={{ padding: "8px" }}>Amount</th>
                  <th style={{ padding: "8px" }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {detail.payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "8px" }}>{p.provider}</td>
                    <td style={{ padding: "8px" }}><span className="status-pill">{p.status}</span></td>
                    <td style={{ padding: "8px" }}>ETB {(p.amountMinor / 100).toLocaleString()}</td>
                    <td style={{ padding: "8px" }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {detail.disputes && detail.disputes.length > 0 && (
            <>
              <h3 style={{ margin: "16px 0 8px" }}>Disputes</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {detail.disputes.map((d) => (
                  <span key={d.id} className="status-pill" title={d.id}>
                    {d.category} · {d.stage.replace("STAGE_", "").replace("_", " ")}
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
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          placeholder="Search by title / client / freelancer / contract id"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: 240 }}
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="TERMINATED">Terminated</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button className="btn-secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} /> Search
        </button>
      </div>
      {error && <p className="single-chat-error">{error}</p>}
      {loading && items.length === 0 ? <p className="empty-state">Loading contracts…</p> : items.length === 0 ? (
        <p className="empty-state">No contracts found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "8px" }}>Contract</th>
                <th style={{ padding: "8px" }}>Client</th>
                <th style={{ padding: "8px" }}>Freelancer</th>
                <th style={{ padding: "8px" }}>Milestones</th>
                <th style={{ padding: "8px" }}>Status</th>
                <th style={{ padding: "8px" }}>Created</th>
                <th style={{ padding: "8px" }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--color-border)", cursor: "pointer" }} onClick={() => void openDetail(row.id)}>
                  <td style={{ padding: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FileText size={14} />
                      <span>{row.job.title}</span>
                    </div>
                    <small style={{ color: "var(--color-text-secondary)" }}>{row.id}</small>
                  </td>
                  <td style={{ padding: "8px", fontSize: "0.8rem" }}>{row.client.displayName ?? row.client.email}</td>
                  <td style={{ padding: "8px", fontSize: "0.8rem" }}>{row.freelancer.displayName ?? row.freelancer.email}</td>
                  <td style={{ padding: "8px" }}>{row._count.milestones}</td>
                  <td style={{ padding: "8px" }}><span className="status-pill">{row.status}</span></td>
                  <td style={{ padding: "8px" }}>{new Date(row.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: "8px" }}><ChevronRight size={14} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <button className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
        <span style={{ alignSelf: "center", fontSize: "0.8rem" }}>{page} / {totalPages}</span>
        <button className="btn-secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
      </div>
    </div>
  );
}
export default AdminContractsPage;
