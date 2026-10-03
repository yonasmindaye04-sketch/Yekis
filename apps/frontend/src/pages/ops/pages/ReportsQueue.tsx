/* ────────────────────────────────────────────────────────────────────────
   ReportsQueue.tsx — profile abuse reports + resolution modal.
   GET /admin/profile-reports · POST /admin/profile-reports/:id/resolve
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { Check, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { dt, opsApi, opsListApi } from "../opsApi";
import { useListPage } from "../opsList";
import type { ProfileReport, ReportResolution } from "../opsTypes";
import { Empty, ErrorBox, LoadingBox, OpsTable, PageHead, Pager, useToast } from "../components/ui";
import { useOpsUi } from "../opsUiContext";

const RESOLVE_OPTS: { v: ReportResolution; l: string }[] = [
  { v: "RESOLVED_NO_ACTION", l: "No Action Needed" },
  { v: "RESOLVED_PROFILE_HIDDEN", l: "Hide Profile" },
  { v: "RESOLVED_PROFILE_BANNED", l: "Ban Profile" },
];

export default function ReportsQueue() {
  const ui = useOpsUi();
  const toast = useToast();
  const list = useListPage<ProfileReport>(opsListApi.profileReports);
  const { rows, total, page, pages, loading, error, reload } = list;
  const [modal, setModal] = useState<{ id: string; action: ReportResolution; notes: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyFeatured, setBusyFeatured] = useState(false);

  // Recomputes the landing-page featured carousel (POST /featured/staff/refresh,
  // ADMIN only). Lives here because profile moderation is this page's concern.
  const refreshFeatured = async () => {
    if (!window.confirm("Recompute the featured talent carousel? This updates the landing page.")) return;
    setBusyFeatured(true);
    try {
      await opsApi.refreshFeaturedCarousel();
      toast("Featured carousel refreshed.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Carousel refresh failed");
    } finally {
      setBusyFeatured(false);
    }
  };

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;
  const open = rows.filter((r) => r.status === "OPEN");
  const current = modal ? rows.find((r) => r.id === modal.id) : null;

  const confirm = async () => {
    if (!modal || !modal.notes.trim()) return;
    setBusy(true);
    try {
      await opsApi.resolveProfileReport(modal.id, modal.action, modal.notes.trim());
      toast(`Report against ${current?.reported ?? "user"} resolved.`);
      setModal(null);
      reload();
      ui.refreshBadges();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Resolve failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade">
      <PageHead
        title="Profile Reports"
        sub="User-to-user abuse reports awaiting moderation"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={refreshFeatured} disabled={busyFeatured}>
              <RefreshCw size={14} /> Refresh Featured Carousel
            </button>
            <button className="btn btn-ghost" onClick={reload}><RefreshCw size={14} /> Refresh</button>
          </div>
        }
      />
      {open.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <Empty icon={ShieldCheck}>No pending reports — the queue is currently empty.</Empty>
        </div>
      ) : (
        <OpsTable
          heads={["Reported User", "Reporter", "Reason", "Date", ""]}
          foot={<Pager page={page} pages={pages} total={total} onPage={list.setPage} unit="reports" />}
        >
          {open.map((r) => (
            <tr key={r.id}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Users size={14} style={{ color: "var(--ops-text-3)" }} />
                  <span className="cell-main" style={{ color: "var(--ops-primary)" }}>{r.reported}</span>
                </div>
              </td>
              <td style={{ color: "var(--ops-text-2)" }}>{r.reporter}</td>
              <td>
                <div className="cell-main">{r.reason.replace(/_/g, " ")}</div>
                <div className="cell-sub" style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }} title={r.details}>
                  {r.details}
                </div>
              </td>
              <td style={{ color: "var(--ops-text-2)" }}>{dt(r.created)}</td>
              <td>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setModal({ id: r.id, action: "RESOLVED_NO_ACTION", notes: "" })}
                >
                  <Check size={13} /> Resolve
                </button>
              </td>
            </tr>
          ))}
        </OpsTable>
      )}

      {modal && current ? (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Resolve Profile Report</h3>
              <button className="modal-x" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <label className="lbl">Report Details</label>
              <div className="kv" style={{ marginBottom: 16, fontSize: 13 }}>
                <p><b>Reason:</b> {current.reason.replace(/_/g, " ")}</p>
                <p style={{ marginTop: 5, color: "var(--ops-text-2)" }}><b>Details:</b> {current.details}</p>
              </div>
              <label className="lbl">Resolution Action</label>
              <select
                className="sel"
                style={{ width: "100%", marginBottom: 16 }}
                value={modal.action}
                onChange={(e) => setModal({ ...modal, action: e.target.value as ReportResolution })}
              >
                {RESOLVE_OPTS.map((o) => (
                  <option value={o.v} key={o.v}>{o.l}</option>
                ))}
              </select>
              <label className="lbl">Staff Notes <span style={{ color: "var(--ops-red)" }}>*</span></label>
              <textarea
                className="inp-t"
                placeholder="Internal notes about this resolution…"
                value={modal.notes}
                onChange={(e) => setModal({ ...modal, notes: e.target.value })}
              />
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!modal.notes.trim() || busy} onClick={() => void confirm()}>
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
