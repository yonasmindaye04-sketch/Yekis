/* ────────────────────────────────────────────────────────────────────────
   Staff.tsx — staff accounts, inline role editing and the permission
   matrix. GET /admin/staff · POST /admin/staff/:userId/role
   The matrix is rendered from GET /admin/permissions/matrix so it always
   reflects the backend's ROLE_PERMISSIONS rather than a local copy.
   ──────────────────────────────────────────────────────────────────────── */

import { useMemo, useState } from "react";
import { Check, RefreshCw, Shield, UserCheck, UserX } from "lucide-react";
import { opsApi, opsListApi, useApi } from "../opsApi";
import type { StaffMember, StaffRole } from "../opsTypes";
import { useListPage } from "../opsList";
import {
  Card,
  ErrorBox,
  LoadingBox,
  OpsActionModal,
  OpsTable,
  PageHead,
  Pager,
  Pill,
  useToast,
} from "../components/ui";

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
  const [suspendTarget, setSuspendTarget] = useState<StaffMember | null>(null);

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

  const reactivate = async (s: StaffMember) => {
    setBusy(true);
    try {
      await opsApi.setStaffStatus(
        s.id,
        false,
        "Account reactivated by Super Admin after operational review.",
      );
      toast("Staff account reactivated.");
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmSuspend = async ({ values }: { values: Record<string, string> }) => {
    if (!suspendTarget) return;
    setBusy(true);
    try {
      await opsApi.setStaffStatus(suspendTarget.id, true, values.reason);
      toast("Staff account suspended.");
      setSuspendTarget(null);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  };

  const grants = (role: string, perm: string) => {
    const permList = matrix.data?.roles?.[role];
    return Array.isArray(permList) && (permList.includes("*") || permList.includes(perm));
  };

  return (
    <div className="fade">
      <PageHead
        title="Administrators & Permissions"
        sub="Staff accounts and their permission scopes. All role changes are audited."
        right={
          <button type="button" className="btn btn-ghost" onClick={reload}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />
      <OpsTable
        heads={["Email", "UCID", "User Role", "Staff Role", "Status", ""]}
        foot={<Pager page={page} pages={pages} total={total} onPage={list.setPage} unit="accounts" />}
      >
        {rows.map((s) => (
          <tr key={s.id}>
            <td className="cell-main" style={{ fontWeight: 600 }}>
              {s.email}
            </td>
            <td className="mono" style={{ fontSize: 12, color: "var(--ops-text-2)" }}>
              {s.ucid}
            </td>
            <td>
              <Pill s={s.userRole} />
            </td>
            <td>
              {editId === s.id ? (
                <select
                  className="sel"
                  style={{ padding: "5px 9px" }}
                  value={draft ?? ""}
                  onChange={(e) =>
                    setDraft(e.target.value ? (e.target.value as StaffRole) : null)
                  }
                >
                  <option value="">No console access</option>
                  {(Object.keys(ROLE_LABELS) as StaffRole[]).map((r) => (
                    <option value={r} key={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              ) : s.staffRole ? (
                <Pill s={s.staffRole} />
              ) : (
                <span style={{ color: "var(--ops-text-3)" }}>—</span>
              )}
            </td>
            <td>
              <Pill s={s.suspended ? "SUSPENDED" : "ACTIVE"} />
            </td>
            <td>
              {editId === s.id ? (
                <span style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy}
                    onClick={() => void save(s.id)}
                  >
                    <Check size={12} /> Save
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditId(null)}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <span style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setEditId(s.id);
                      setDraft(s.staffRole);
                    }}
                  >
                    Edit role
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy}
                    onClick={() =>
                      s.suspended ? void reactivate(s) : setSuspendTarget(s)
                    }
                  >
                    {s.suspended ? <UserCheck size={12} /> : <UserX size={12} />}
                    {s.suspended ? "Reactivate" : "Suspend"}
                  </button>
                </span>
              )}
            </td>
          </tr>
        ))}
      </OpsTable>

      <Card className="card-pad" style={{ marginTop: 24 }}>
        <div className="sec-title">
          <Shield size={17} /> Permission Matrix
        </div>
        {!matrix.data ? (
          <div className="empty">
            {matrix.error
              ? `Could not load the matrix: ${matrix.error}`
              : "Loading matrix…"}
          </div>
        ) : (
          <>
            <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Role permission matrix">
              <table className="tbl matrix" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Permission</th>
                    {columns.map((r) => (
                      <th style={{ textAlign: "center" }} className="mono" key={r}>
                        {r.replace("_ADMIN", "")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(matrix.data.permissions ?? []).map((p) => (
                    <tr key={p}>
                      <td
                        className="mono"
                        style={{ fontSize: 11.5, color: "var(--ops-text-2)", fontWeight: 600 }}
                      >
                        {p}
                      </td>
                      {columns.map((r) => (
                        <td
                          style={{ textAlign: "center" }}
                          className={grants(r, p) ? "yes" : "no"}
                          key={r}
                        >
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
      </Card>

      <OpsActionModal
        open={suspendTarget !== null}
        title="Suspend Staff Account"
        description={
          suspendTarget
            ? `Suspending ${suspendTarget.email} revokes all active sessions immediately and records an immutable audit event.`
            : undefined
        }
        tone="danger"
        confirmLabel="Suspend Staff Account"
        busy={busy}
        fields={[
          {
            name: "reason",
            label: "Audit Reason (min 20 characters)",
            placeholder: "Provide full operational or security justification for this suspension…",
            multiline: true,
            required: true,
            minLength: 20,
            maxLength: 500,
          },
        ]}
        onConfirm={confirmSuspend}
        onCancel={() => !busy && setSuspendTarget(null)}
      />
    </div>
  );
}
