// AdminPaymentsPage.tsx — reads real PaymentTransaction records
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "./api/client";

interface PaymentRow {
  id: string;
  amountMinor: number;
  status: string;
  provider: string;
  providerTransactionId: string;
  createdAt: string;
  milestone?: {
    title: string;
    contract?: {
      job?: { title?: string };
      client?: { email?: string; displayName?: string | null };
      freelancer?: { email?: string; displayName?: string | null };
    };
  } | null;
}

export function AdminPaymentsPage() {
  const [items, setItems] = useState<PaymentRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const [provider, setProvider] = useState("ALL");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);setError("");
    try {
      const res = await api.adminListPayments({
        page, q, provider, status
      }) as { items: PaymentRow[]; total: number };
      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
    } finally { setLoading(false); }
  }, [page, status, provider, q]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 20));
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input placeholder="Search batch ID or client email…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">Any status</option>
          {["PENDING", "SUCCESS", "FAILED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="ALL">Payments via any rail</option>
          {["TELEBIRR", "CBE_BIRR"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="btn-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</button>
      </div>
      {error && <p className="single-chat-error">{error}</p>}
      {loading && items.length === 0 ? <p className="empty-state">Loading payments…</p> : items.length === 0 ? <p className="empty-state">No payments match this filter.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "8px" }}>Provider TX ID</th>
                <th style={{ padding: "8px" }}>Contract</th>
                <th style={{ padding: "8px" }}>Client</th>
                <th style={{ padding: "8px" }}>Provider</th>
                <th style={{ padding: "8px" }}>Status</th>
                <th style={{ padding: "8px" }}>Amount</th>
                <th style={{ padding: "8px" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "8px", fontFamily: "monospace", fontSize: 12 }}>{row.providerTransactionId}</td>
                  <td style={{ padding: "8px" }}>{row.milestone?.contract?.job?.title ?? row.milestone?.title ?? "—"}</td>
                  <td style={{ padding: "8px" }}>{row.milestone?.contract?.client?.email ?? "—"}</td>
                  <td style={{ padding: "8px" }}>{row.provider}</td>
                  <td style={{ padding: "8px" }}><span className="status-pill">{row.status}</span></td>
                  <td style={{ padding: "8px" }}>ETB {(row.amountMinor / 100).toLocaleString()}</td>
                  <td style={{ padding: "8px", fontSize: "0.8rem" }}>{new Date(row.createdAt).toLocaleString()}</td>
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
export default AdminPaymentsPage;
