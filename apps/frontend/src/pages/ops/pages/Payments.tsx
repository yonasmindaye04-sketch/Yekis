/* ────────────────────────────────────────────────────────────────────────
   Payments.tsx — inbound client funding across rails.

   Search and filters are pushed to the server
   (GET /admin/payments?page&limit&q&status&provider) so results are not
   limited to whatever the first page happened to contain.
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { dts, fmt, opsListApi } from "../opsApi";
import { useListPage } from "../opsList";
import { PAYMENT_STATUSES, RAILS } from "../opsConst";
import type { Payment } from "../opsTypes";
import {
  Empty,
  ErrorBox,
  FilterSelect,
  LoadingBox,
  OpsTable,
  PageHead,
  Pager,
  Pill,
  Rail,
} from "../components/ui";

export default function Payments() {
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");

  const list = useListPage<Payment>(
    (p) => opsListApi.payments({ ...p, status, provider }),
    25,
    [status, provider],
  );
  const { rows, total, page, pages, loading, error, search, setSearch, setPage, reload } = list;

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;

  return (
    <div className="fade">
      <PageHead
        title="Payments"
        sub="Inbound client funding transactions across Telebirr & CBE Birr rails"
      />
      <div className="card filters">
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search provider TX id or client email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect value={status} onChange={setStatus} options={PAYMENT_STATUSES} allLabel="Any status" label="Payment status" />
        <FilterSelect value={provider} onChange={setProvider} options={RAILS} allLabel="Any rail" label="Provider" humanise={false} />
        <button className="btn btn-ghost" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <OpsTable
        heads={["Provider TX ID", "Contract", "Client", "Provider", "Status", "Amount", "Created"]}
        foot={
          <Pager page={page} pages={pages} total={total} onPage={setPage} unit="transactions" />
        }
      >
        {rows.length === 0 ? (
          <tr><td colSpan={7}><Empty icon={Search}>No payments match this search.</Empty></td></tr>
        ) : (
          rows.map((p) => (
            <tr key={p.id}>
              <td className="mono" style={{ fontSize: 12, color: "var(--ops-text-2)" }}>{p.txId}</td>
              <td className="cell-main" style={{ fontWeight: 600 }}>{p.job}</td>
              <td style={{ color: "var(--ops-text-2)" }}>{p.client}</td>
              <td><Rail p={p.provider} /></td>
              <td><Pill s={p.status} /></td>
              <td className="amount">{fmt(p.amount)}</td>
              <td style={{ color: "var(--ops-text-2)", fontSize: 12.5 }}>{dts(p.created)}</td>
            </tr>
          ))
        )}
      </OpsTable>
    </div>
  );
}