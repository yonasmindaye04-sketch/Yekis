import { useCallback, useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { api, type StaffUser, type PermissionMatrix } from "./api/client";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin (legacy)",
  OPERATIONS_ADMIN: "Operations Admin",
  FINANCE_ADMIN: "Finance Admin",
  DISPUTE_MEDIATOR: "Dispute Mediator",
  COMPLIANCE_ADMIN: "Compliance Admin",
  COMPLIANCE_OFFICER: "Compliance Officer (legacy)",
  SUPPORT: "Support Agent",
};

export function AdminsPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [staffRes, matrixRes] = await Promise.all([
        api.getStaffUsers({ page }),
        api.getPermissionMatrix(),
      ]);
      setStaff(staffRes.items ?? []);
      setTotal(staffRes.total ?? 0);
      setMatrix(matrixRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admins");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaveRole = async (userId: string) => {
    try {
      await api.setStaffRole(userId, selectedRole === "" ? null : selectedRole);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change role");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Administrators & Permissions</h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.84rem", color: "var(--color-text-secondary)" }}>
            Staff accounts and their permission scopes. All role changes are audited.
          </p>
        </div>
        <button className="btn-secondary" onClick={() => void load()} disabled={isLoading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <p className="single-chat-error">{error}</p>}

      {/* Staff list */}
      {isLoading && staff.length === 0 ? (
        <p className="empty-state">Loading staff accounts…</p>
      ) : staff.length === 0 ? (
        <p className="empty-state">No staff accounts found.</p>
      ) : (
        <div style={{ overflowX: "auto", marginBottom: 32 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "10px 8px" }}>Email</th>
                <th style={{ padding: "10px 8px" }}>UCID</th>
                <th style={{ padding: "10px 8px" }}>User role</th>
                <th style={{ padding: "10px 8px" }}>Staff role</th>
                <th style={{ padding: "10px 8px" }}>Status</th>
                <th style={{ padding: "10px 8px" }}></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const editing = editingId === s.id;
                return (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "10px 8px" }}>{s.email}</td>
                    <td style={{ padding: "10px 8px", fontFamily: "monospace", fontSize: "0.78rem" }}>
                      {s.ucid}
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <span className="status-pill">{s.role}</span>
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      {editing ? (
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                        >
                          <option value="">— Remove staff role —</option>
                          {Object.keys(ROLE_LABELS).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="status-pill">
                          {s.staffRole ? ROLE_LABELS[s.staffRole] ?? s.staffRole : "—"}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <span
                        className={`status-pill ${s.isSuspended ? "error" : "success"}`}
                      >
                        {s.isSuspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      {editing ? (
                        <span style={{ display: "flex", gap: 6 }}>
                          <button className="btn-primary" onClick={() => void handleSaveRole(s.id)}>
                            Save
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            setEditingId(s.id);
                            setSelectedRole(s.staffRole ?? "");
                          }}
                        >
                          Edit role
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <span style={{ color: "var(--color-text-secondary)", fontSize: "0.83rem" }}>
          Page {page} of {totalPages} ({total} staff)
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-secondary"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ← Prev
          </button>
          <button className="btn-secondary" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
            Next →
          </button>
        </div>
      </div>

      {/* Permission matrix */}
      {matrix && (
        <div className="panel" style={{ padding: 16 }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}
          >
            <WifiOff size={16} />
            <h3 style={{ margin: 0 }}>Permission matrix</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.8rem" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--color-border)" }}>
                    Permission
                  </th>
                  {Object.keys(matrix.roles).map((role) => (
                    <th
                      key={role}
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        borderBottom: "1px solid var(--color-border)",
                        fontFamily: "monospace",
                        fontSize: "0.72rem",
                      }}
                    >
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.permissions.map((key) => (
                  <tr key={key}>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--color-border)" }}>
                      {key}
                    </td>
                    {Object.keys(matrix.roles).map((role) => (
                      <td
                        key={`${role}-${key}`}
                        style={{
                          padding: "6px 8px",
                          borderBottom: "1px solid var(--color-border)",
                          textAlign: "center",
                        }}
                      >
                        {matrix.roles[role].includes(key) ? "●" : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminsPage;
