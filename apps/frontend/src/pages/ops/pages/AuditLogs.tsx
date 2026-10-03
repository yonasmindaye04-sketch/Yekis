/* ────────────────────────────────────────────────────────────────────────
   AuditLogs.tsx — immutable audit trail.

   Carried over from the dashboard this console replaces. Reads
   GET /admin/audit-logs (audit.view). The endpoint has no date filter, so
   this surface offers entityType / eventType narrowing over the newest rows.
   ──────────────────────────────────────────────────────────────────────── */

import { useMemo, useState } from "react";
import { FileText, RefreshCw, Search } from "lucide-react";
import { dts, opsApi, useApi } from "../opsApi";
import { Empty, ErrorBox, LoadingBox, OpsTable, PageHead, Pager, Pill } from "../components/ui";

export default function AuditLogs() {
  const { data, error, loading, reload } = useApi(opsApi.auditLogs);
  const [q, setQ] = useState("");

  const rows = useMemo(() => data?.items ?? [], [data]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return rows;
    return rows.filter((r) =>
      [r.eventType, r.entityType, r.entityId, r.action, r.actorRole, r.userId]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(needle)),
    );
  }, [rows, q]);

  if (loading && !data) return <LoadingBox />;
  if (error && !data) return <ErrorBox error={error} reload={reload} />;

  return (
    <div className="fade">
      <PageHead
        title="Audit Logs"
        sub="Append-only record of privileged actions across the platform"
        right={<button className="btn btn-ghost" onClick={reload}><RefreshCw size={14} /> Refresh</button>}
      />
      <div className="card filters">
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Filter loaded rows by event, entity or actor…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <span style={{ fontSize: 12, color: "var(--ops-text-3)", fontWeight: 600 }}>
          Newest {rows.length} of {data?.total ?? 0} · server has no date filter
        </span>
      </div>
      <OpsTable
        heads={["Event", "Entity", "Action", "Actor", "Amount", "IP", "When"]}
        foot={<Pager n={filtered.length} />}
      >
        {filtered.length === 0 ? (
          <tr><td colSpan={7}><Empty icon={FileText}>No audit entries match.</Empty></td></tr>
        ) : (
          filtered.map((r) => (
            <tr key={r.id}>
              <td>
                <div className="cell-main">{r.eventType.replace(/_/g, " ")}</div>
                <div className="cell-sub mono">{r.id}</div>
              </td>
              <td style={{ fontSize: 12.5 }}>
                <div>{r.entityType}</div>
                <div className="cell-sub mono">{r.entityId}</div>
              </td>
              <td>{r.action ? <Pill s={r.action} /> : <span style={{ color: "var(--ops-text-3)" }}>—</span>}</td>
              <td style={{ fontSize: 12.5 }}>{r.actorRole ?? "—"}</td>
              <td className="amount">{r.amountMinor != null ? (r.amountMinor / 100).toLocaleString() : "—"}</td>
              <td className="mono" style={{ fontSize: 12 }}>{r.ipAddress ?? "—"}</td>
              <td style={{ color: "var(--ops-text-2)", fontSize: 12.5 }}>{dts(r.createdAt)}</td>
            </tr>
          ))
        )}
      </OpsTable>
    </div>
  );
}