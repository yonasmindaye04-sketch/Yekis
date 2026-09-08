// AdminLedgerPage.tsx — double-entry ledger read-side
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "./api/client";

interface LedgerAccountRow {
  id: string;
  code: string;
  name: string;
  type: string;
  currency: string;
  balanceMinor: number;
  updatedAt: string;
}

interface LedgerSummary {
  accounts: LedgerAccountRow[];
  journalCount: number;
  integrity: {
    isBalanced: boolean;
    totalEntries: number;
    totalDebitsMinor: number;
    totalCreditsMinor: number;
    discrepancyMinor: number;
  };
}

interface JournalEntryLineRow {
  id: string;
  debitMinor: number;
  creditMinor: number;
  account: { code: string; name: string; type: string };
}

interface LedgerJournalRow {
  id: string;
  idempotencyKey: string;
  description: string;
  referenceType: string;
  referenceId?: string | null;
  postedAt: string;
  entries: JournalEntryLineRow[];
  totalDebitsMinor: number;
  totalCreditsMinor: number;
}

export function AdminLedgerPage() {
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [journals, setJournals] = useState<LedgerJournalRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refType, setRefType] = useState("ALL");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSummary = useCallback(async () => {
    try {
      setSummary((await api.adminLedgerSummary()) as LedgerSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load summary");
    }
  }, []);

  const loadJournals = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await api.adminLedgerJournals({ page, q, referenceType: refType }) as {
        items: LedgerJournalRow[];
        total: number;
      };
      setJournals(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load journals");
    } finally { setLoading(false); }
  }, [page, refType, q]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);
  useEffect(() => { void loadJournals(); }, [loadJournals]);

  const formatAmount = (minor: number) => `ETB ${(minor / 100).toLocaleString()}`;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div>
      {error && <p className="single-chat-error">{error}</p>}

      {summary ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
          {summary.accounts.map((acc) => (
            <div key={acc.id} className="panel" style={{ padding: 12 }}>
              <p className="eyebrow" style={{ margin: 0 }}>{acc.type}</p>
              <p style={{ margin: 0, fontSize: "0.83rem" }}>{acc.name}</p>
              <strong>{formatAmount(acc.balanceMinor)}</strong>
              <br />
              <small style={{ color: "var(--color-text-secondary)" }}>{acc.code}</small>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">Loading ledger summary…</p>
      )}

      {summary && (
        <div style={{ padding: 10, marginBottom: 12, borderRadius: 8, background: summary.integrity.isBalanced ? "#16a34a1a" : "#dc26261a" }}>
          <strong>Integrity: {summary.integrity.isBalanced ? "Balanced" : "MISMATCH"}</strong>
          <span style={{ marginLeft: 8, fontSize: "0.84rem" }}>
            debits {formatAmount(summary.integrity.totalDebitsMinor)} · credits {formatAmount(summary.integrity.totalCreditsMinor)}
            · {summary.integrity.totalEntries} entries across {summary.journalCount} journals
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input placeholder="Search description / reference / idempotency key…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
        <select value={refType} onChange={(e) => setRefType(e.target.value)}>
          <option value="ALL">All journal types</option>
          {["WALLET_TOPUP", "ESCROW_FUND", "MILESTONE_RELEASE", "DISPUTE_REFUND", "WITHDRAWAL_PAYOUT"].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn-secondary" onClick={() => void loadJournals()} disabled={loading}><RefreshCw size={14} /> Refresh</button>
      </div>

      {loading && journals.length === 0 ? <p className="empty-state">Loading journals…</p> : journals.length === 0 ? <p className="empty-state">No journal entries found.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "8px" }}>Description</th>
                <th style={{ padding: "8px" }}>Reference</th>
                <th style={{ padding: "8px" }}>Debited</th>
                <th style={{ padding: "8px" }}>Credited</th>
                <th style={{ padding: "8px" }}>Posted</th>
              </tr>
            </thead>
            <tbody>
              {journals.map((j) => (
                <tr key={j.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "8px" }}>{j.description}</td>
                  <td style={{ padding: "8px", fontFamily: "monospace", fontSize: "0.78rem" }}>
                    {j.referenceType}{j.referenceId ? ` · ${j.referenceId.slice(0, 8)}` : ""}
                    {j.idempotencyKey ? `\n${j.idempotencyKey}` : ""}
                  </td>
                  <td style={{ padding: "8px" }}>{formatAmount(j.totalDebitsMinor)}</td>
                  <td style={{ padding: "8px" }}>{formatAmount(j.totalCreditsMinor)}</td>
                  <td style={{ padding: "8px", fontSize: "0.8rem" }}>{new Date(j.postedAt).toLocaleString()}</td>
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
export default AdminLedgerPage;
