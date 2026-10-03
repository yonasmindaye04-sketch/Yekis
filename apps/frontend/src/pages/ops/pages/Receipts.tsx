/* ────────────────────────────────────────────────────────────────────────
   Receipts.tsx — wallet top-up review queue.

   Carried over from the dashboard this console replaces. Approve, reject or
   flag a top-up; flagging raises a STAFF_FLAGGED TransactionFlag that then
   surfaces on the Risk & Fraud page. Approval/rejection/flagging are three
   separate backend routes, all gated to COMPLIANCE_OFFICER | ADMIN.
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { CheckCircle2, Eye, RefreshCw, TriangleAlert, WalletCards, XCircle } from "lucide-react";
import { dt, fmt, opsApi, useApi } from "../opsApi";
import type { RawTopUpItem } from "../opsBackend";
import { Empty, ErrorBox, LoadingBox, OpsTable, PageHead, Pager, Pill, Rail } from "../components/ui";
import { useToast } from "../components/ui";

export default function Receipts() {
  const toast = useToast();
  const [status, setStatus] = useState("PENDING");
  const { data, error, loading, reload } = useApi(() => opsApi.topUpQueue(status));
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = data ?? [];

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
            : "Flagged for AML review.",
      );
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

  if (loading && !data) return <LoadingBox />;
  if (error && !data) return <ErrorBox error={error} reload={reload} />;

  return (
    <div className="fade">
      <PageHead
        title="Receipt Reviews"
        sub="Manual bank and mobile-money transfers awaiting verification"
        right={<button className="btn btn-ghost" onClick={reload}><RefreshCw size={14} /> Refresh</button>}
      />
      <div className="card filters">
        <select className="sel" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["PENDING", "APPROVED", "REJECTED", "FLAGGED"].map((s) => (
            <option key={s} value={s}>{s === "ALL" ? "All statuses" : s[0] + s.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </div>
      <OpsTable
        heads={["User", "Amount", "Rail", "Reference", "History", "Submitted", ""]}
        foot={<Pager n={rows.length} />}
      >
        {rows.length === 0 ? (
          <tr><td colSpan={7}><Empty icon={WalletCards}>No top-ups in this state.</Empty></td></tr>
        ) : (
          rows.map((r) => (
            <tr key={r.id}>
              <td>
                <div className="cell-main">{r.user.email}</div>
                <div className="cell-sub mono">{r.user.ucid}</div>
              </td>
              <td className="amount">{fmt(r.amountMinor)}</td>
              <td><Rail p={r.provider} /></td>
              <td className="mono" style={{ fontSize: 12.5 }}>{r.referenceNumber || "—"}</td>
              <td style={{ fontSize: 12.5, color: "var(--ops-text-2)" }}>
                {r.userHistory.approvedCount} ok · {fmt(r.userHistory.approvedTotalMinor)}
                {r.userHistory.rejectedCount ? ` · ${r.userHistory.rejectedCount} rejected` : ""}
              </td>
              <td style={{ color: "var(--ops-text-2)", fontSize: 12.5 }}>{dt(r.createdAt)}</td>
              <td>
                <div style={{ display: "flex", gap: 6 }}>
                  <Pill s={r.status} />
                  {r.receiptImagePath ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => void openReceipt(r)}>
                      <Eye size={12} />
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))
        )}
      </OpsTable>
      {rows.some((r) => r.status === "PENDING") ? (
        <div className="card card-pad" style={{ marginTop: 16 }}>
          <div className="sec-title"><TriangleAlert size={16} /> Pending decisions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {rows.filter((r) => r.status === "PENDING").map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <b>{r.user.email}</b>
                  <span style={{ color: "var(--ops-text-2)", marginLeft: 8 }}>{fmt(r.amountMinor)}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" disabled={busyId === r.id} onClick={() => void act(r, "FLAG")}>
                    <TriangleAlert size={13} /> Flag
                  </button>
                  <button className="btn btn-ghost btn-sm" disabled={busyId === r.id} onClick={() => void act(r, "REJECTED")}>
                    <XCircle size={13} /> Reject
                  </button>
                  <button className="btn btn-primary btn-sm" disabled={busyId === r.id} onClick={() => void act(r, "APPROVED")}>
                    <CheckCircle2 size={13} /> Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}