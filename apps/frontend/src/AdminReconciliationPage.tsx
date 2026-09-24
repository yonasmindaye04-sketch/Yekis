import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "./api/client";

interface ReconRow {
  id: string;
  amountMinor: number;
  status: string;
  provider: string;
  providerTransactionId: string;
  createdAt: string;
  reconciliationStatus: string;
  differenceMinor: number | null;
  milestone?: { title: string; escrowState: string; amountMinor: number } | null;
}

export function AdminReconciliationPage() {
  const [items, setItems] = useState<ReconRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [recStatus, setRecStatus] = useState("ALL");
  const [provider, setProvider] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await api.adminListReconciliation({ page, recStatus, provider }) as {
        items: ReconRow[]; total: number;
      };
      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reconciliation");
    } finally { setLoading(false); }
  }, [page, recStatus, provider]);

  useEffect(() => { void load(); }, [load]);
  const totalPages = Math.max(1, Math.ceil(total / 20));

  // Text-first status design: bold semantic-colored text, no filled background
  const pillStyle = (s: string) => {
    const map: Record<string, string> = {
      MATCHED: "#16a34a", MISMATCH: "#dc2626", PENDING: "#d97706", FAILED: "#6b7280",
    };
    return { color: map[s] ?? "var(--color-primary)" };
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <select value={recStatus} onChange={(e) => setRecStatus(e.target.value)}>
          <option value="ALL">All reconciliation status</option>
          {["MATCHED", "MISMATCH", "PENDING", "FAILED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="ALL">Any rail</option>
          {["TELEBIRR", "CBE_BIRR"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="btn-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</button>
      </div>
      {error && <p className="single-chat-error">{error}</p>}
      {loading && items.length === 0 ? <p className="empty-state">Loading reconciliation…</p> : items.length === 0 ? <p className="empty-state">No provider transactions to reconcile.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "8px" }}>Provider TX ID</th>
                <th style={{ padding: "8px" }}>Provider</th>
                <th style={{ padding: "8px" }}>Internal amount</th>
                <th style={{ padding: "8px" }}>Escrow state</th>
                <th style={{ padding: "8px" }}>Rec status</th>
                <th style={{ padding: "8px" }}>Diff</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "8px", fontFamily: "monospace", fontSize: 12 }}>{row.providerTransactionId}</td>
                  <td style={{ padding: "8px" }}>{row.provider}</td>
                  <td style={{ padding: "8px" }}>ETB {(row.amountMinor / 100).toLocaleString()}</td>
                  <td style={{ padding: "8px" }}><span className="status-pill">{row.milestone?.escrowState ?? "—"}</span></td>
                  <td style={{ padding: "8px" }}><span className="status-pill" style={pillStyle(row.reconciliationStatus)}>{row.reconciliationStatus}</span></td>
                  <td style={{ padding: "8px" }}>
                    {row.differenceMinor == null ? "—" : `ETB ${(row.differenceMinor / 100).toLocaleString()}`}
                  </td>
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
export default AdminReconciliationPage;