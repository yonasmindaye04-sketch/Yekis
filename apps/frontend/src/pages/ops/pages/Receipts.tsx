/* ────────────────────────────────────────────────────────────────────────
   Receipts.tsx — wallet top-up review queue.

   Approve, reject or flag a manual transfer. Flagging raises a
   STAFF_FLAGGED TransactionFlag that then surfaces under Risk & Fraud.
   GET  /wallet/topups/queue
   POST /wallet/topups/:id/approve · /reject · /flag
   ──────────────────────────────────────────────────────────────────────── */

import { Fragment, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Eye,
  RefreshCw,
  Search,
  TriangleAlert,
  WalletCards,
  XCircle,
} from "lucide-react";
import { dt, fmt, opsApi, opsListApi } from "../opsApi";
import { useListPage } from "../opsList";
import { TOPUP_STATUSES } from "../opsConst";
import type { RawTopUpItem } from "../opsBackend";
import {
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
  useToast,
} from "../components/ui";

export default function Receipts() {
  const toast = useToast();
  const [status, setStatus] = useState("PENDING");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = useListPage<RawTopUpItem>(
    (p) => opsListApi.topUps({ ...p, status }),
    25,
    [status],
  );
  const { rows, total, page, pages, loading, error, search, setSearch, setPage, reload } = list;

  const act = async (row: RawTopUpItem, kind: "APPROVED" | "REJECTED" | "FLAG") => {
    const reason =
      kind === "REJECTED"
        ? window.prompt("Rejection reason (min 5 characters):") ?? ""
        : kind === "FLAG"
          ? window.prompt("Why is this suspicious? (min 10 characters):") ?? ""
          : "";
    if (kind !== "APPROVED" && reason.trim().length < (kind === "FLAG" ? 10 : 5)) {
      toast("A longer reason is required.");
      return;
    }
    setBusyId(row.id);
    try {
      if (kind === "APPROVED") await opsApi.reviewTopUp(row.id, "APPROVED");
      else if (kind === "REJECTED") await opsApi.reviewTopUp(row.id, "REJECTED", reason.trim());
      else await opsApi.flagTopUp(row.id, reason.trim());
      toast(
        kind === "APPROVED"
          ? "Top-up approved and wallet credited."
          : kind === "REJECTED"
            ? "Top-up rejected."
            : "Flagged for AML review — see Risk & Fraud.",
      );
      setOpenId(null);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const openReceipt = async (row: RawTopUpItem) => {
    try {
      const { url } = await opsApi.topUpReceiptUrl(row.id);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast(e instanceof Error ? e.message : "No receipt available");
    }
  };

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;

  const pending = rows.filter((r) => r.status === "PENDING");
  const pendingValue = pending.reduce((s, r) => s + r.amountMinor, 0);

  return (
    <div className="fade">
      <PageHead
        title="Receipt Reviews"
        sub="Manual bank and mobile-money transfers awaiting verification"
        right={
          <button className="btn btn-ghost" onClick={reload}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kv k="Matching transfers" v={total.toLocaleString()} />
        <Kv k="Pending on page" v={String(pending.length)} warn={pending.length > 0} />
        <Kv k="Pending value" v={fmt(pendingValue)} />
        <Kv k="Without a receipt" v={String(rows.filter((r) => !r.receiptImagePath).length)} />
      </div>

      <div className="card filters">
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search by user email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={TOPUP_STATUSES}
          allLabel="All statuses"
          label="Top-up status"
        />
        <button className="btn btn-ghost" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <OpsTable
        heads={["User", "Amount", "Rail", "Reference", "History", "Submitted", "Status", ""]}
        foot={<Pager page={page} pages={pages} total={total} onPage={setPage} unit="transfers" />}
      >
        {rows.length === 0 ? (
          <tr><td colSpan={8}><Empty icon={WalletCards}>No top-ups in this state.</Empty></td></tr>
        ) : (
          rows.map((r) => (
            <Fragment key={r.id}>
              <tr className="clickable" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                <td>
                  <div className="cell-main">{r.user.email}</div>
                  <div className="cell-sub mono">{r.user.ucid}</div>
                </td>
                <td className="amount">{fmt(r.amountMinor)}</td>
                <td><Rail p={r.provider} /></td>
                <td className="mono" style={{ fontSize: 12.5 }}>{r.referenceNumber || "—"}</td>
                <td style={{ fontSize: 12.5, color: "var(--ops-text-2)" }}>
                  {r.userHistory.approvedCount} approved · {fmt(r.userHistory.approvedTotalMinor)}
                  {r.userHistory.rejectedCount ? ` · ${r.userHistory.rejectedCount} rejected` : ""}
                </td>
                <td style={{ color: "var(--ops-text-2)", fontSize: 12.5 }}>{dt(r.createdAt)}</td>
                <td><Pill s={r.status} /></td>
                <td>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {r.receiptImagePath ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Open the receipt image"
                        onClick={(e) => {
                          e.stopPropagation();
                          void openReceipt(r);
                        }}
                      >
                        <Eye size={12} />
                      </button>
                    ) : null}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenId(openId === r.id ? null : r.id);
                      }}
                    >
                      {openId === r.id ? "Close" : "Decide"}
                      <ChevronDown size={12} />
                    </button>
                  </div>
                </td>
              </tr>
              {openId === r.id ? (
                <tr className="expand-row">
                  <td colSpan={8}>
                    <div className="settle-grid">
                      <div style={{ fontSize: 12.5, color: "var(--ops-text-2)" }}>
                        {r.receiptImagePath
                          ? "A receipt image is attached — open it to verify before deciding."
                          : "No receipt image was attached. This is normal for automatic checkout top-ups, which the provider confirms directly."}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={busyId === r.id || r.status !== "PENDING"}
                          onClick={(e) => {
                            e.stopPropagation();
                            void act(r, "FLAG");
                          }}
                        >
                          <TriangleAlert size={13} /> Flag as suspicious
                        </button>
                        <button
                          className="btn btn-red btn-sm"
                          disabled={busyId === r.id || r.status !== "PENDING"}
                          onClick={(e) => {
                            e.stopPropagation();
                            void act(r, "REJECTED");
                          }}
                        >
                          <XCircle size={13} /> Reject
                        </button>
                        <button
                          className="btn btn-green btn-sm"
                          disabled={busyId === r.id || r.status !== "PENDING"}
                          onClick={(e) => {
                            e.stopPropagation();
                            void act(r, "APPROVED");
                          }}
                        >
                          <CheckCircle2 size={13} /> Approve &amp; credit
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))
        )}
      </OpsTable>
    </div>
  );
}