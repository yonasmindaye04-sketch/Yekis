/* ────────────────────────────────────────────────────────────────────────
   AuditLogs.tsx — immutable audit trail.
   GET /admin/audit-logs (audit.view). The route has no date filter and no
   server-side text search, so the query narrows the loaded page; paging is
   server-side.
   ──────────────────────────────────────────────────────────────────────── */

import { FileText, RefreshCw, Search } from "lucide-react";
import { dts, opsListApi } from "../opsApi";
import { useListPage } from "../opsList";
import type { RawAuditLog } from "../opsBackend";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import {
  Empty,
  ErrorBox,
  Kv,
  LoadingBox,
  OpsTable,
  PageHead,
  Pager,
  Pill,
} from "../components/ui";

export default function AuditLogs() {
  const list = useListPage<RawAuditLog>(opsListApi.auditLogs);
  const { rows, total, page, pages, loading, error, search, setSearch, setPage, reload } = list;

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;

  return (
    <div className="fade">
      <PageHead
        title="Audit Logs"
        sub="Append-only record of privileged actions across the platform"
        right={
          <Button variant="outline" onClick={reload}>
            <RefreshCw size={14} /> Refresh
          </Button>
        }
      />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kv k="Total entries" v={total.toLocaleString()} />
        <Kv k="On this page" v={String(rows.length)} />
        <Kv k="With an amount" v={String(rows.filter((r) => r.amountMinor != null).length)} />
        <Kv k="Staff actors" v={String(rows.filter((r) => r.actorRole).length)} />
      </div>
      <Card className="card filters">
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Filter this page by event, entity, actor or user id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </Card>
      <OpsTable
        heads={["Event", "Entity", "Action", "Actor", "Amount", "IP", "When"]}
        foot={<Pager page={page} pages={pages} total={total} onPage={setPage} unit="entries" />}
      >
        {rows.length === 0 ? (
          <tr><td colSpan={7}><Empty icon={FileText}>No audit entries match.</Empty></td></tr>
        ) : (
          rows.map((r) => (
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
      <div className="kbd-hint" style={{ marginTop: 10 }}>
        The audit endpoint supports <span className="mono">eventType</span>,{" "}
        <span className="mono">entityType</span>, <span className="mono">entityId</span> and{" "}
        <span className="mono">userId</span> filters but has no date range — free-text search
        narrows the current page only.
      </div>
    </div>
  );
}
