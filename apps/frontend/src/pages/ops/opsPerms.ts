/* ────────────────────────────────────────────────────────────────────────
   opsPerms.ts — role → permission resolution for the Operations Console nav.

   The backend is the single source of truth: `GET /admin/permissions/matrix`
   returns every permission key plus the role → permission map, and each route
   enforces `requirePermission` (or `requireStaffRole`) independently. This
   module only decides which nav entries to *show*, so a reviewer never sees a
   link that would 403.

   SUPER_ADMIN and ADMIN both carry the full key list, so they are handled by
   the wildcard rather than by an enumerated fallback.
   ──────────────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import { opsApi } from "./opsApi";

/** Permission required to open each console page. */
export const OPS_PERMS = {
  overview: "dashboard.view",
  support: "support.handle",
  "dispute-queue": "disputes.view",
  risk: "tms.review",
  kyc: "kyc.review",
  "reports-queue": "profiles.moderate",
  gigs: "gigs.moderate",
  featured: "featured.manage",
  bot: "bot.manage",
  receipts: "topups.review",
  ledger: "ledger.view",
  reconciliation: "reconciliation.view",
  withholding: "reports.view",
  reports: "reports.view",
  contracts: "contracts.view",
  payments: "payments.view",
  escrow: "escrow.view",
  payouts: "payouts.view",
  monitoring: "monitoring.view",
  users: "users.view",
  staff: "admins.manage",
  audit: "audit.view",
  /* Editing your own profile is not an administrative act — it is open to
     every authenticated account, so it is gated on the baseline permission
     every staff role already holds rather than on a moderation key. */
  profile: "dashboard.view",
} as const;

export type OpsPageId = keyof typeof OPS_PERMS;

/**
 * Minimal map used until (or instead of) the server matrix. Mirrors the
 * backend's COMPLIANCE_SET / SUPPORT_SET groupings so a failed matrix fetch
 * degrades to something close to correct rather than to "hide everything".
 */
const FALLBACK_MATRIX: Record<string, readonly string[]> = {
  SUPER_ADMIN: ["*"],
  ADMIN: ["*"],
  OPERATIONS_ADMIN: [
    "dashboard.view", "users.view", "users.suspend", "contracts.view",
    "escrow.view", "payments.view", "payouts.view", "payouts.settle",
    "disputes.view", "support.handle", "monitoring.view", "receipts.view",
  ],
  FINANCE_ADMIN: [
    "dashboard.view", "users.view", "payments.view", "escrow.view",
    "payouts.view", "payouts.settle", "ledger.view", "reconciliation.view",
    "reports.view", "receipts.view", "audit.view",
  ],
  DISPUTE_MEDIATOR: [
    "dashboard.view", "users.view", "contracts.view", "disputes.view",
    "disputes.mediate", "disputes.resolve",
  ],
  COMPLIANCE_ADMIN: [
    "dashboard.view", "users.view", "kyc.review", "tms.review",
    "support.handle", "disputes.view", "disputes.mediate", "monitoring.view",
    "audit.view", "topups.review", "profiles.moderate",
  ],
  COMPLIANCE_OFFICER: [
    "dashboard.view", "users.view", "kyc.review", "tms.review",
    "support.handle", "disputes.view", "disputes.mediate", "monitoring.view",
    "audit.view", "topups.review", "profiles.moderate",
  ],
  SUPPORT: ["dashboard.view", "users.view", "support.handle"],
};

export interface PermsApi {
  /** True when `staffRole` may open the given console page. */
  can: (page: OpsPageId) => boolean;
  /** Raw permission keys granted to the current staff role. */
  keys: readonly string[];
  /** Staff role string as reported by /auth/me, or null. */
  role: string | null;
  loading: boolean;
}

export function useOpsPerms(staffRole: string | null | undefined): PermsApi {
  const [matrix, setMatrix] = useState<Record<string, readonly string[]>>(FALLBACK_MATRIX);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void opsApi
      .permissionMatrix()
      .then((m) => {
        if (alive && m?.roles) setMatrix(m.roles);
      })
      .catch(() => {
        /* keep the fallback map — nav stays usable, routes still 403 correctly */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => {
    const isSuper = staffRole === "SUPER_ADMIN" || staffRole === "ADMIN";
    const keys =
      (staffRole && matrix[staffRole]) ||
      (staffRole && FALLBACK_MATRIX[staffRole]) ||
      (isSuper ? ["*"] : []);
    const set = new Set(keys);
    return {
      keys,
      role: staffRole ?? null,
      loading,
      can: (page: OpsPageId) => {
        if (isSuper) return true;
        const needed = OPS_PERMS[page];
        return set.has("*") || set.has(needed);
      },
    };
  }, [matrix, staffRole, loading]);
}

/** Human label for a staff role, used in the console sidebar. */
export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADMIN: "Administrator",
  OPERATIONS_ADMIN: "Operations",
  FINANCE_ADMIN: "Finance",
  DISPUTE_MEDIATOR: "Dispute Mediator",
  COMPLIANCE_ADMIN: "Compliance",
  COMPLIANCE_OFFICER: "Compliance Officer",
  SUPPORT: "Customer Support",
};
