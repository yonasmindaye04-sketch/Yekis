/* ────────────────────────────────────────────────────────────────────────
   Reconciliation.tsx — rail vs ledger verification.
   GET /admin/reconciliation
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { RefreshCw, Search, TriangleAlert } from "lucide-react";
import { fmt, opsListApi } from "../opsApi";
import { useListPage } from "../opsList";
import { RECON_STATUSES, RAILS } from "../opsConst";
import type { ReconRow } from "../opsTypes";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import {
  Banner,
  Empty,
  ErrorBox,
  FilterSelect,
  Kv,
  LoadingBox,
  OpsTable,
  PageHead,
  Pager,
  Pill,
  Rail,
} from "../components/ui";

export default function Reconciliation() {
  const [recStatus, setRecStatus] = useState("");
  const [provider, setProvider] = useState("");

  const list = useListPage<ReconRow>(
    (p) => opsListApi.reconciliation({ ...p, recStatus, provider }),
    25,
    [recStatus, provider],
  );
  const { rows, total, page, pages, loading, error, search, setSearch, setPage, reload } = list;

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;

  const mism = rows.filter((r) => r.rec === "MISMATCH");

  return (
    <div className="fade">
      <PageHead
        title="Reconciliation"
        sub="Verify provider transactions against internal escrow records"
      />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kv k="Mismatches on page" v={String(mism.length)} warn={mism.length > 0} />
        <Kv k="Matched on page" v={String(rows.filter((r) => r.rec === "MATCHED").length)} />
        <Kv k="Awaiting outcome" v={String(rows.filter((r) => r.rec === "PENDING").length)} />
        <Kv k="Total transactions" v={total.toLocaleString()} />
      </div>
      {mism.length ? (
        <Banner
          tone="b-red"
          icon={TriangleAlert}
          strong={`${mism.length} mismatch(es) on this page.`}
          rest="Amounts differ between provider rail and internal ledger — investigate before the next settlement run."
        />
      ) : null}
      <Card className="card filters" style={{ marginTop: 16 }}>
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search provider transaction id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect value={recStatus} onChange={setRecStatus} options={RECON_STATUSES} allLabel="All reconciliation status" label="Reconciliation status" />
        <FilterSelect value={provider} onChange={setProvider} options={RAILS} allLabel="Any rail" label="Provider" humanise={false} />
        <Button variant="outline" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </Card>
      <OpsTable
        heads={["Provider TX ID", "Provider", "Internal Amount", "Escrow State", "Rec Status", "Difference"]}
        foot={<Pager page={page} pages={pages} total={total} onPage={setPage} unit="transactions" />}
      >
        {rows.length === 0 ? (
          <tr><td colSpan={6}><Empty icon={TriangleAlert}>No provider transactions to reconcile.</Empty></td></tr>
        ) : (
          rows.map((r) => (
            <tr key={r.id}>
              <td className="mono" style={{ fontSize: 12, color: "var(--ops-text-2)" }}>{r.txId}</td>
              <td><Rail p={r.provider} /></td>
              <td className="amount">{fmt(r.amt)}</td>
              <td><Pill s={r.esc} /></td>
              <td><Pill s={r.rec} /></td>
              <td>
                {r.diff == null ? (
                  <span style={{ color: "var(--ops-text-3)" }}>—</span>
                ) : (
                  <b style={{ color: "var(--ops-red)" }}>{fmt(r.diff)}</b>
                )}
              </td>
            </tr>
          ))
        )}
      </OpsTable>
    </div>
  );
}
