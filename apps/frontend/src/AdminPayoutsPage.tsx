// AdminPayoutsPage.tsx — disbursement visibility for freelancers
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Check, X } from "lucide-react";
import { api } from "./api/client";
import { events } from "./analytics";

interface PayoutRow {
  id: string;
  amountMinor: number;
  feeMinor: number;
  netAmountMinor: number;
  provider: string;
  payoutAccountIdentifier: string;
  providerPayoutId?: string | null;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
  settledAt?: string | null;
  user?: { email: string; displayName: string | null; id: string };
}

export function AdminPayoutsPage() {
  const [items, setItems] = useState<PayoutRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(0);
  const [status, setStatus] = useState("ALL");
  const [provider, setProvider] = useState("ALL");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [providerRef, setProviderRef] = useState("");
  const [failReason, setFailReason] = useState("");

  const settle = async (payoutId: string, decision: "CONFIRMED" | "FAILED") => {
    try {
      await api.adminSettlePayout(payoutId, {
        decision,
        providerPayoutId: decision === "CONFIRMED" ? providerRef || undefined : undefined,
        failureReason: decision === "FAILED" ? failReason || undefined : undefined,
      });
      // Analytics: staff confirmed the payout reached the payout rail.
      if (decision === "CONFIRMED") {
        const settled = items.find((p) => p.id === payoutId);
        events.payoutCompleted(settled?.provider ?? "UNKNOWN");
      }
      setSettlingId(null);
      setProviderRef("");
      setFailReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to settle payout");
    }
  };

  const load = useCallback(async () => {
    setLoading(true);setError("");
    try {
      const res = await api.adminListPayouts({
        page, q, provider, status
      }) as { items: PayoutRow[]; total: number; pendingPayouts?: number };
      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
      setPending(res.pendingPayouts ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payouts");
    } finally { setLoading(false); }
  }, [page, status, provider, q]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 20));
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Search by freelancer email or payout account…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">Any status</option>
          {["PENDING", "PROCESSING", "CONFIRMED", "FAILED", "REVERSED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="ALL">Any rail</option>
          {["TELEBIRR", "CBE_BIRR"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="btn-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</button>
      </div>
      <div style={{ marginBottom: 16, padding: 10, background: "var(--color-bg-elevated)", borderRadius: 8, fontSize: "0.85rem" }}>
        <strong>Pending / processing:</strong> {pending} payout(s) awaiting disbursement.
      </div>
      {error && <p className="single-chat-error">{error}</p>}
      {loading && items.length === 0 ? <p className="empty-state">Loading payouts…</p> : items.length === 0 ? <p className="empty-state">No payouts match.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "8px" }}>Freelancer</th>
                <th style={{ padding: "8px" }}>Payout acct</th>
                <th style={{ padding: "8px" }}>Provider ref</th>
                <th style={{ padding: "8px" }}>Provider</th>
                <th style={{ padding: "8px" }}>Net</th>
                <th style={{ padding: "8px" }}>Status</th>
                <th style={{ padding: "8px" }}>Reason</th>
                <th style={{ padding: "8px" }}>Settle</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "8px" }}>{row.user?.displayName ?? row.user?.email ?? "—"}</td>
                  <td style={{ padding: "8px", fontFamily: "monospace", fontSize: 12 }}>{row.payoutAccountIdentifier}</td>
                  <td style={{ padding: "8px", fontFamily: "monospace", fontSize: 12 }}>{row.providerPayoutId ?? "—"}</td>
                  <td style={{ padding: "8px" }}>{row.provider}</td>
                  <td style={{ padding: "8px" }}>ETB {(row.netAmountMinor / 100).toLocaleString()}</td>
                  <td style={{ padding: "8px" }}><span className="status-pill">{row.status}</span></td>
                  <td style={{ padding: "8px", fontSize: "0.78rem" }} title={row.errorMessage ?? ""}>{row.errorMessage ?? "—"}</td>
                  <td style={{ padding: "8px" }}>
                    {(row.status === "PENDING" || row.status === "PROCESSING") && (
                      settlingId === row.id ? (
                        <div style={{ display: "grid", gap: 6, minWidth: 200 }}>
                          <input
                            placeholder="Provider reference (for confirm)"
                            value={providerRef}
                            onChange={(e) => setProviderRef(e.target.value)}
                            style={{ fontSize: 12, padding: "4px 8px" }}
                          />
                          <input
                            placeholder="Failure reason (for fail)"
                            value={failReason}
                            onChange={(e) => setFailReason(e.target.value)}
                            style={{ fontSize: 12, padding: "4px 8px" }}
                          />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="btn-primary"
                              style={{ fontSize: 12, padding: "4px 10px" }}
                              onClick={() => void settle(row.id, "CONFIRMED")}
                              title="Confirm the transfer executed out-of-band"
                            >
                              <Check size={13} /> Confirm
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ fontSize: 12, padding: "4px 10px", color: "#dc2626" }}
                              onClick={() => void settle(row.id, "FAILED")}
                              title="Mark failed — wallet will be re-credited"
                            >
                              <X size={13} /> Failed
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ fontSize: 12, padding: "4px 10px" }}
                              onClick={() => { setSettlingId(null); setProviderRef(""); setFailReason(""); }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 12, padding: "4px 10px" }}
                          onClick={() => setSettlingId(row.id)}
                        >
                          Settle
                        </button>
                      )
                    )}
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
export default AdminPayoutsPage;
