/* ────────────────────────────────────────────────────────────────────────
   Staff.tsx — staff accounts, inline role editing and the permission
   matrix. GET /admin/staff · POST /admin/staff/:userId/role
   The matrix is rendered from GET /admin/permissions/matrix so it always
   reflects the backend's ROLE_PERMISSIONS rather than a local copy.
   ──────────────────────────────────────────────────────────────────────── */

import { useMemo, useState } from "react";
import { Check, RefreshCw, Shield, UserX, UserCheck } from "lucide-react";
import { opsApi, opsListApi, useApi } from "../opsApi";
import type { StaffMember, StaffRole } from "../opsTypes";
import { useListPage } from "../opsList";
import { ErrorBox, LoadingBox, OpsTable, PageHead, Pager, Pill, useToast } from "../components/ui";

const ROLE_LABELS: Record<StaffRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin (legacy)",
  OPERATIONS_ADMIN: "Operations Admin",
  FINANCE_ADMIN: "Finance Admin",
  DISPUTE_MEDIATOR: "Dispute Mediator",
  COMPLIANCE_ADMIN: "Compliance Admin",
  COMPLIANCE_OFFICER: "Compliance Officer (legacy)",
  SUPPORT: "Support Agent",
};

export default function StaffPage() {
  const toast = useToast();
  const list = useListPage<StaffMember>(opsListApi.staff);
  const { rows, total, page, pages, loading, error, reload } = list;
  const matrix = useApi(opsApi.permissionMatrix);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StaffRole | null>("SUPPORT");
  const [busy, setBusy] = useState(false);

  const columns = useMemo(() => {
    const roles = matrix.data?.roles ?? {};
    return Object.keys(roles).filter((r) => r !== "ADMIN");
  }, [matrix.data]);

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;

  const save = async (id: string) => {
    setBusy(true);
    try {
      await opsApi.setStaffRole(id, draft);
      toast(draft ? "Staff role updated." : "Console access removed.");
      setEditId(null);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (s: StaffMember) => {
    const suspended = !s.suspended;
    const reason = suspended ? window.prompt("Reason for suspending this staff account:") : undefined;
    if (suspended && (!reason || reason.trim().length < 5)) { toast("A suspension reason of at least 5 characters is required."); return; }
    setBusy(true);
    try { await opsApi.setStaffStatus(s.id, suspended, reason?.trim()); toast(suspended ? "Staff account suspended." : "Staff account reactivated."); reload(); }
    catch (e) { toast(e instanceof Error ? e.message : "Status update failed"); }
    finally { setBusy(false); }
  };

  const grants = (role: string, perm: string) => {
    const list = matrix.data?.roles?.[role];
    return Array.isArray(list) && (list.includes("*") || list.includes(perm));
  };

  return (
    <div className="fade">
      <PageHead
        title="Administrators & Permissions"
        sub="Staff accounts and their permission scopes. All role changes are audited."
        right={<button className="btn btn-ghost" onClick={reload}><RefreshCw size={14} /> Refresh</button>}
      />
      <OpsTable heads={["Email", "UCID", "User Role", "Staff Role", "Status", ""]} foot={<Pager page={page} pages={pages} total={total} onPage={list.setPage} unit="accounts" />}>
        {rows.map((s) => (
          <tr key={s.id}>
            <td className="cell-main" style={{ fontWeight: 600 }}>{s.email}</td>
            <td className="mono" style={{ fontSize: 12, color: "var(--ops-text-2)" }}>{s.ucid}</td>
            <td><Pill s={s.userRole} /></td>
            <td>
              {editId === s.id ? (
                <select
                  className="sel"
                  style={{ padding: "5px 9px" }}
                  value={draft ?? ""}
                  onChange={(e) => setDraft(e.target.value ? (e.target.value as StaffRole) : null)}
                >
                  <option value="">No console access</option>
                  {(Object.keys(ROLE_LABELS) as StaffRole[]).map((r) => (
                    <option value={r} key={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              ) : s.staffRole ? (
                <Pill s={s.staffRole} />
              ) : (
                <span style={{ color: "var(--ops-text-3)" }}>—</span>
              )}
            </td>
            <td>{s.suspended ? <Pill s="SUSPENDED" /> : <Pill s="ACTIVE" />}</td>
            <td>
              {editId === s.id ? (
                <span style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void save(s.id)}><Check size={12} /> Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                </span>
              ) : (
                <span style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(s.id); setDraft(s.staffRole); }}>Edit role</button>
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void toggleStatus(s)}>{s.suspended ? <UserCheck size={12} /> : <UserX size={12} />} {s.suspended ? "Reactivate" : "Suspend"}</button>
                </span>
              )}
            </td>
          </tr>
        ))}
      </OpsTable>

      <div className="card card-pad" style={{ marginTop: 24 }}>
        <div className="sec-title"><Shield size={17} /> Permission Matrix</div>
        {!matrix.data ? (
          <div className="empty">
            {matrix.error ? `Could not load the matrix: ${matrix.error}` : "Loading matrix…"}
          </div>
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl matrix" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Permission</th>
                    {columns.map((r) => (
                      <th style={{ textAlign: "center" }} className="mono" key={r}>{r.replace("_ADMIN", "")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(matrix.data.permissions ?? []).map((p) => (
                    <tr key={p}>
                      <td className="mono" style={{ fontSize: 11.5, color: "var(--ops-text-2)", fontWeight: 600 }}>{p}</td>
                      {columns.map((r) => (
                        <td style={{ textAlign: "center" }} className={grants(r, p) ? "yes" : "no"} key={r}>
                          {grants(r, p) ? "●" : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="kbd-hint" style={{ marginTop: 8 }}>
              Served by <span className="mono">GET /admin/permissions/matrix</span>. The legacy{" "}
              <span className="mono">ADMIN</span> role is omitted here — it is an alias for Super Admin.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
