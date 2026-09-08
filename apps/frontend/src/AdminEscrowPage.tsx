// AdminEscrowPage.tsx — milestone escrow oversight
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "./api/client";

interface EscrowRow {
  id: string;
  title: string;
  amountMinor: number;
  escrowState: string;
  submittedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  contract?: {
    job?: { title?: string };
    client?: { email?: string; displayName?: string | null };
    freelancer?: { email?: string; displayName?: string | null };
  } | null;
  paymentTransactions?: {
    provider: string;
    providerTransactionId: string;
    status: string;
  }[];
}

export function AdminEscrowPage() {
  const [items, setItems] = useState<EscrowRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState("ALL");
  const [q, setQ] = useState("");
  const [heldMinor, setHeldMinor] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);setError("");
    try {
      const res = await api.adminListEscrows({
        page, q, escrowState: state
      }) as { items: EscrowRow[]; total: number; escrowHeldMinor?: number };
      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
      setHeldMinor(res.escrowHeldMinor ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load escrow records");
    } finally { setLoading(false); }
  }, [page, state, q]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 20));
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Search by contract or freelancer…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
        <select value={state} onChange={(e) => setState(e.target.value)}>
          <option value="ALL">All escrow states</option>
          {["PENDING", "ESCROW_HELD", "WORK_IN_PROGRESS", "SUBMITTED_FOR_REVIEW", "DISPUTED", "RELEASED", "REFUNDED", "PARTIAL_REFUND"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</button>
      </div>
      <div style={{ marginBottom: 16, padding: 10, background: "var(--color-bg-elevated)", borderRadius: 8, fontSize: "0.85rem" }}>
        <strong>Currently held:</strong> ETB {(heldMinor / 100).toLocaleString()} across {total} milestone escrow rows
      </div>
      {error && <p className="single-chat-error">{error}</p>}
      {loading && items.length === 0 ? <p className="empty-state">Loading escrow…</p> : items.length === 0 ? <p className="empty-state">No milestone escrows match.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "8px" }}>Contract</th>
                <th style={{ padding: "8px" }}>Milestone</th>
                <th style={{ padding: "8px" }}>Freelancer</th>
                <th style={{ padding: "8px" }}>Amount</th>
                <th style={{ padding: "8px" }}>Held / Released</th>
                <th style={{ padding: "8px" }}>State</th>
                <th style={{ padding: "8px" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "8px" }}>{row.contract?.job?.title ?? "—"}</td>
                  <td style={{ padding: "8px" }}>{row.title}</td>
                  <td style={{ padding: "8px" }}>{row.contract?.freelancer?.email ?? "—"}</td>
                  <td style={{ padding: "8px" }}>ETB {(row.amountMinor / 100).toLocaleString()}</td>
                  <td style={{ padding: "8px", fontSize: "0.8rem" }}>
                    {row.paymentTransactions && row.paymentTransactions.length > 0
                      ? `${row.paymentTransactions.map((p) => p.provider).join("|")} · ${row.paymentTransactions[0]?.status}`
                      : "Wallet-only (not via rail)"}
                  </td>
                  <td style={{ padding: "8px" }}><span className="status-pill">{row.escrowState}</span></td>
                  <td style={{ padding: "8px", fontSize: "0.8rem" }}>{new Date(row.createdAt).toLocaleDateString()}</td>
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
export default AdminEscrowPage;
