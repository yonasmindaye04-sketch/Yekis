import { useEffect, useState, useCallback, Fragment } from "react";
import { Search, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { api, type AuditLogRow } from "./api/client";

/**
 * Immutable audit-log explorer. Backed by GET /api/v1/admin/audit-logs
 * (requirePermission "audit.view"). Read-only by design — there is no delete or
 * edit path anywhere in the app for these rows.
 */
export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.getAuditLogs({
        page,
        limit: 25,
        userId: filterUser || undefined,
        entityType: filterEntity || undefined,
        action: filterAction || undefined,
      });
      setLogs(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [page, filterUser, filterEntity, filterAction]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <div>
      {/* Filter row */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          placeholder="Actor user ID…"
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          style={{ flex: 1, minWidth: 160 }}
        />
        <input
          placeholder="Entity type (e.g. User, Dispute)…"
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          style={{ flex: 1, minWidth: 160 }}
        />
        <input
          placeholder="Action (e.g. USER_SUSPENDED)…"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          style={{ flex: 1, minWidth: 160 }}
        />
        <button className="btn-secondary" onClick={() => void load()} disabled={isLoading}>
          <Search size={16} /> Search
        </button>
        <button className="btn-secondary" onClick={() => void load()} disabled={isLoading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <p className="single-chat-error">{error}</p>}

      {isLoading && logs.length === 0 ? (
        <p className="empty-state">Loading audit records…</p>
      ) : logs.length === 0 ? (
        <p className="empty-state">No audit entries match these filters.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="stat-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "10px 8px" }}></th>
                <th style={{ padding: "10px 8px" }}>Time</th>
                <th style={{ padding: "10px 8px" }}>Actor</th>
                <th style={{ padding: "10px 8px" }}>Staff role</th>
                <th style={{ padding: "10px 8px" }}>Action</th>
                <th style={{ padding: "10px 8px" }}>Entity</th>
                <th style={{ padding: "10px 8px" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const open = expandedId === log.id;
                return (
                  <Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedId(open ? null : log.id)}
                      style={{
                        cursor: "pointer",
                        borderBottom: "1px solid var(--color-border)",
                        background: open ? "var(--color-bg-subtle)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "10px 8px", width: 24 }}>
                        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </td>
                      <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: "10px 8px", fontFamily: "monospace", fontSize: "0.78rem" }}>
                        {log.user?.email ?? log.userId?.slice(0, 10) ?? "system"}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <span className="status-pill">{log.actorRole ?? log.user?.staffRole ?? "—"}</span>
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <span className="eyebrow" style={{ letterSpacing: 0 }}>
                          {log.action ?? log.eventType}
                        </span>
                      </td>
                      <td style={{ padding: "10px 8px", fontFamily: "monospace", fontSize: "0.78rem" }}>
                        {log.entityType}/{log.entityId.slice(0, 8)}
                      </td>
                      <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                        {log.amountMinor != null
                          ? `ETB ${(log.amountMinor / 100).toLocaleString()}`
                          : "—"}
                      </td>
                    </tr>
                    {open && (
                      <tr key={`${log.id}-detail`}>
                        <td
                          colSpan={7}
                          style={{
                            padding: "10px 12px",
                            background: "var(--color-bg)",
                            borderBottom: "1px solid var(--color-border)",
                          }}
                        >
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {log.previousState != null && (
                              <div>
                                <p className="eyebrow">Previous state</p>
                                <pre style={{ margin: 0, fontSize: "0.72rem", overflowX: "auto" }}>
                                  {JSON.stringify(log.previousState, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.newState != null && (
                              <div>
                                <p className="eyebrow">New state</p>
                                <pre style={{ margin: 0, fontSize: "0.72rem", overflowX: "auto" }}>
                                  {JSON.stringify(log.newState, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                          {(log.requestId || log.ipAddress) && (
                            <p style={{ margin: "8px 0 0", fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>
                              {log.requestId && `req: ${log.requestId}`}
                              {log.requestId && log.ipAddress && " · "}
                              {log.ipAddress && `IP: ${log.ipAddress}`}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <span style={{ color: "var(--color-text-secondary)", fontSize: "0.83rem" }}>
          Page {page} of {totalPages} ({total} records)
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            ← Prev
          </button>
          <button className="btn-secondary" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuditLogsPage;
