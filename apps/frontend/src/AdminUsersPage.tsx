import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ChevronRight } from "lucide-react";
import { api } from "./api/client";

interface UserRow {
  id: string;
  ucid: string;
  email: string;
  phone: string;
  displayName: string | null;
  role: string;
  staffRole: string | null;
  isSuspended: boolean;
  cachedKycStatus: string | null;
  createdAt: string;
  profileCompleteness: number;
}
interface UserDetail {
  user: {
    id: string; ucid: string; email: string; phone: string;
    displayName: string | null; role: string;
    staffRole: string | null; isSuspended: boolean;
    emailVerified: boolean; createdAt: string;
    profileCompleteness: number; profileViews: number;
  };
  kyc: { tier: string; status: string; nextReviewDueAt: string | null } | null;
  walletBalance: number;
  activity: {
    jobsPosted: number; proposalsSubmitted: number;
    contractsAsClient: number; contractsAsFreelancer: number;
    gigsOwned: number; gigOrders: number;
  };
}

export function AdminUsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<UserDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await api.adminListUsers({ page, q: q || undefined, role: role !== "ALL" ? role : undefined }) as { items: UserRow[]; total: number };
      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally { setLoading(false); }
  }, [page, q, role]);

  useEffect(() => { void load(); }, [load]);

  const openDetail = async (id: string) => {
    try { setDetail((await api.adminGetUser(id)) as unknown as UserDetail); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load user"); }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  if (detail) {
    const u = detail.user;
    return (
      <div>
        <button className="btn-secondary" style={{ marginBottom: 12 }} onClick={() => setDetail(null)}>
          ← Back to users
        </button>
        <div className="panel" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8, flexWrap: "wrap" }}>
            <div>
              <p className="eyebrow">User profile</p>
              <h2 style={{ margin: "4px 0" }}>{u.displayName || u.email}</h2>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                {u.email} · {u.phone} · {u.ucid}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="status-pill">{u.role}{u.staffRole ? ` · ${u.staffRole}` : ""}</span>
              {u.isSuspended && <span className="status-pill" style={{ background: "#dc2626", color: "#fff" }}>Suspended</span>}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
            {[
              ["Wallet balance", `ETB ${(detail.walletBalance / 100).toLocaleString()}`],
              ["KYC status", detail.kyc ? `${detail.kyc.tier} · ${detail.kyc.status}` : "—"],
              ["Email verified", u.emailVerified ? "Yes" : "No"],
              ["Joined", new Date(u.createdAt).toLocaleDateString()],
            ].map(([k, v]) => (
              <div key={k} className="panel" style={{ padding: 12 }}>
                <p className="eyebrow" style={{ margin: 0 }}>{k}</p>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          <div className="panel" style={{ padding: 14, marginTop: 14 }}>
            <p className="eyebrow" style={{ margin: "0 0 8px" }}>Activity</p>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 14 }}>
              <span>Jobs posted: <strong>{detail.activity.jobsPosted}</strong></span>
              <span>Proposals: <strong>{detail.activity.proposalsSubmitted}</strong></span>
              <span>Contracts (client): <strong>{detail.activity.contractsAsClient}</strong></span>
              <span>Contracts (freelancer): <strong>{detail.activity.contractsAsFreelancer}</strong></span>
              <span>Gigs: <strong>{detail.activity.gigsOwned}</strong></span>
              <span>Orders: <strong>{detail.activity.gigOrders}</strong></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input placeholder="Search email / phone / name / UCID" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ flex: 1, minWidth: 220 }} />
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="ALL">All roles</option>
          <option value="CLIENT">Client</option>
          <option value="FREELANCER">Freelancer</option>
          <option value="BOTH">Both</option>
        </select>
        <button className="btn-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Search</button>
      </div>
      {error && <p className="single-chat-error">{error}</p>}
      {loading && items.length === 0 ? <p className="empty-state">Loading users…</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "8px" }}>User</th>
                <th style={{ padding: "8px" }}>Contact</th>
                <th style={{ padding: "8px" }}>Role</th>
                <th style={{ padding: "8px" }}>KYC</th>
                <th style={{ padding: "8px" }}>Joined</th>
                <th style={{ padding: "8px" }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.id}
                  style={{ borderBottom: "1px solid var(--color-border)", cursor: "pointer" }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open user detail for ${row.displayName ?? row.email}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void openDetail(row.id);
                    }
                  }}
                  onClick={() => void openDetail(row.id)}
                >
                  <td style={{ padding: "8px" }}>
                    <div>{row.displayName ?? row.email}</div>
                    <small style={{ color: "var(--color-text-secondary)" }}>{row.ucid}</small>
                  </td>
                  <td style={{ padding: "8px", fontSize: "0.84rem" }}>
                    {row.email}<br /><span style={{ color: "var(--color-text-secondary)" }}>{row.phone}</span>
                  </td>
                  <td style={{ padding: "8px" }}><span className="status-pill">{row.role}</span></td>
                  <td style={{ padding: "8px" }}><span className="status-pill">{row.cachedKycStatus ?? "NONE"}</span></td>
                  <td style={{ padding: "8px" }}>{new Date(row.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: "8px" }}><ChevronRight size={14} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <button className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
        <span style={{ alignSelf: "center", fontSize: "0.8rem" }}>{page} / {totalPages}</span>
        <button className="btn-secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
      </div>
    </div>
  );
}
export default AdminUsersPage;
