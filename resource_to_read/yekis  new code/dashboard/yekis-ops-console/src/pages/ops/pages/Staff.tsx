/* ────────────────────────────────────────────────────────────────────────
   Staff.tsx — staff accounts, inline role editing and the permission
   matrix. GET /admin/staff · PATCH /admin/staff/:id/role
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { Check, RefreshCw, Shield } from "lucide-react";
import { opsApi, useApi } from "../opsApi";
import type { StaffMember, StaffRole } from "../opsTypes";
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
const PERMS = ["MANAGE_STAFF", "MANAGE_CONTRACTS", "SETTLE_PAYOUTS", "VIEW_LEDGER", "MANAGE_DISPUTES", "VIEW_RISK_FLAGS", "EXPORT_REPORTS"];
const MROLES: StaffRole[] = ["SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN", "SUPPORT", "COMPLIANCE_ADMIN"];
const hasPerm = (r: StaffRole, p: string) =>
  r === "SUPER_ADMIN" ||
  (r === "OPERATIONS_ADMIN" && !["MANAGE_STAFF", "VIEW_LEDGER"].includes(p)) ||
  (r === "FINANCE_ADMIN" && ["SETTLE_PAYOUTS", "VIEW_LEDGER", "EXPORT_REPORTS"].includes(p)) ||
  (r === "SUPPORT" && p === "MANAGE_DISPUTES") ||
  (r === "COMPLIANCE_ADMIN" && ["VIEW_RISK_FLAGS", "VIEW_LEDGER"].includes(p));

export default function StaffPage() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<StaffMember[]>(opsApi.staff);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StaffRole>("SUPPORT");
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <LoadingBox />;
  if (error || !data) return <ErrorBox error={error ?? "No data"} reload={reload} />;

  const save = async (id: string) => {
    setBusy(true);
    try {
      await opsApi.setStaffRole(id, draft);
      toast("Staff role updated.");
      setEditId(null);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade">
      <PageHead
        title="Administrators & Permissions"
        sub="Staff accounts and their permission scopes. All role changes are audited."
        right={<button className="btn btn-ghost" onClick={reload}><RefreshCw size={14} /> Refresh</button>}
      />
      <OpsTable heads={["Email", "UCID", "User Role", "Staff Role", "Status", ""]} foot={<Pager n={data.length} />}>
        {data.map((s) => (
          <tr key={s.id}>
            <td className="cell-main" style={{ fontWeight: 600 }}>{s.email}</td>
            <td className="mono" style={{ fontSize: 12, color: "var(--ops-text-2)" }}>{s.ucid}</td>
            <td><Pill s={s.role} /></td>
            <td>
              {editId === s.id ? (
                <select className="sel" style={{ padding: "5px 9px" }} value={draft} onChange={(e) => setDraft(e.target.value as StaffRole)}>
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
            <td>{s.suspended ? <Pill s="SUSPENDED" /> : <span className="pill p-green"><span className="pdot" />Active</span>}</td>
            <td>
              {editId === s.id ? (
                <span style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void save(s.id)}><Check size={12} /> Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                </span>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(s.id); setDraft(s.staffRole ?? "SUPPORT"); }}>
                  Edit role
                </button>
              )}
            </td>
          </tr>
        ))}
      </OpsTable>
      <div className="card card-pad" style={{ marginTop: 24 }}>
        <div className="sec-title"><Shield size={17} /> Permission Matrix</div>
        <div className="tbl-wrap">
          <table className="tbl matrix" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Permission</th>
                {MROLES.map((r) => (
                  <th style={{ textAlign: "center" }} className="mono" key={r}>{r.replace("_ADMIN", "")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMS.map((p) => (
                <tr key={p}>
                  <td className="mono" style={{ fontSize: 11.5, color: "var(--ops-text-2)", fontWeight: 600 }}>{p}</td>
                  {MROLES.map((r) => (
                    <td style={{ textAlign: "center" }} className={hasPerm(r, p) ? "yes" : "no"} key={r}>
                      {hasPerm(r, p) ? "●" : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
