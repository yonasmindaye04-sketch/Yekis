/* ────────────────────────────────────────────────────────────────────────
   Ledger.tsx — double-entry ledger: account cards, integrity banner,
   paginated journal table.
   GET /admin/ledger (accounts + integrity) · GET /admin/ledger/journals
   ──────────────────────────────────────────────────────────────────────── */

import { BookOpen, CheckCircle2, RefreshCw, Search } from "lucide-react";
import { dts, fmt, opsApi, opsListApi, useApi } from "../opsApi";
import { useListPage } from "../opsList";
import { JOURNAL_TYPES } from "../opsConst";
import type { JournalEntry, LedgerBundle } from "../opsTypes";
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
} from "../components/ui";
import { useState } from "react";

export default function Ledger() {
  /* Accounts and integrity come from the summary route; the journal table
     pages separately because the journal can be far longer than one page. */
  const summary = useApi<LedgerBundle>(opsApi.ledger);
  const [refType, setRefType] = useState("");

  const journals = useListPage<JournalEntry>(
    (p) => opsListApi.ledgerJournals({ ...p, referenceType: refType }),
    25,
    [refType],
  );
  const {
    rows, total, page, pages, loading, error, search, setSearch, setPage, reload,
  } = journals;

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;

  const bundle = summary.data;

  return (
    <div className="fade">
      <PageHead
        title="Double-Entry Ledger"
        sub="Account balances, journal entries and integrity verification"
      />

      {bundle ? (
        <>
          <div className="grid g6" style={{ marginBottom: 16 }}>
            {bundle.accounts.slice(0, 12).map((a) => (
              <div className="card acct-card" key={a.code}>
                <div className="acct-type" style={{ color: a.c }}>{a.type}</div>
                <div className="acct-name">{a.name}</div>
                <div className="acct-bal">{fmt(a.bal)}</div>
                <div className="acct-code mono">{a.code}</div>
              </div>
            ))}
          </div>
          {bundle.integrity.bal ? (
            <Banner
              tone="b-green"
              icon={CheckCircle2}
              strong="Integrity: Balanced"
              rest={`— debits ${fmt(bundle.integrity.dr)} · credits ${fmt(bundle.integrity.cr)} · ${bundle.integrity.entries.toLocaleString()} entries across ${bundle.integrity.journals} journals.`}
            />
          ) : (
            <Banner
              tone="b-red"
              icon={BookOpen}
              strong="Integrity: MISMATCH"
              rest={`— debits ${fmt(bundle.integrity.dr)} · credits ${fmt(bundle.integrity.cr)} · discrepancy is a real accounting fault, investigate immediately.`}
            />
          )}
          <div className="grid g4" style={{ marginTop: 16, marginBottom: 16 }}>
            <Kv k="Accounts" v={String(bundle.accounts.length)} />
            <Kv k="Journals (all time)" v={bundle.integrity.journals.toLocaleString()} />
            <Kv k="Ledger entries" v={bundle.integrity.entries.toLocaleString()} />
            <Kv
              k="Journals matching filter"
              v={total.toLocaleString()}
            />
          </div>
        </>
      ) : summary.error ? (
        <ErrorBox error={summary.error} reload={summary.reload} />
      ) : (
        <LoadingBox />
      )}

      <div className="card filters">
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search description / reference / idempotency key…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect
          value={refType}
          onChange={setRefType}
          options={JOURNAL_TYPES}
          allLabel="All journal types"
          label="Journal type"
        />
        <button className="btn btn-ghost" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <OpsTable
        heads={["Description", "Reference", "Debited", "Credited", "Posted"]}
        foot={<Pager page={page} pages={pages} total={total} onPage={setPage} unit="journals" />}
      >
        {rows.length === 0 ? (
          <tr><td colSpan={5}><Empty icon={BookOpen}>No journal entries match.</Empty></td></tr>
        ) : (
          rows.map((j) => (
            <tr key={j.id}>
              <td className="cell-main" style={{ fontWeight: 600 }}>{j.desc}</td>
              <td><Pill s={j.ref} /></td>
              <td className="amount">{fmt(j.dr)}</td>
              <td className="amount">{fmt(j.cr)}</td>
              <td style={{ color: "var(--ops-text-2)", fontSize: 12.5 }}>{dts(j.posted)}</td>
            </tr>
          ))
        )}
      </OpsTable>
    </div>
  );
}