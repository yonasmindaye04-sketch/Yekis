// === IMPORTS ===
import type { NextFunction, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import type { AuthedRequest } from "../../middleware/auth.js";

// === PERMISSION KEYS ===
/**
 * Granular admin permissions. Keys are `domain.action` strings.
 *
 * Action verbs follow a fixed ladder — VIEW < CREATE < EDIT < APPROVE < EXECUTE < MANAGE.
 * Adding a new key requires adding it to at least one role in ROLE_PERMISSIONS below,
 * otherwise nothing grants it.
 */
export const PERMISSIONS = [
  "dashboard.view",
  "users.view",
  "users.suspend",
  "profiles.moderate",
  "kyc.review",
  "topups.review",
  "tms.review",
  "support.handle",
  "disputes.view",
  "disputes.mediate",
  "disputes.resolve",
  // Declared ahead of Phase 2+ so the matrix is complete from day one:
  "contracts.view",
  "escrow.view",
  "escrow.freeze",
  "escrow.release",
  "payments.view",
  "payouts.view",
  "ledger.view",
  "reconciliation.view",
  "reports.view",
  "receipts.view",
  "monitoring.view",
  "audit.view",
  "admins.manage",
  "settings.manage",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export type AdminRole =
  | "SUPER_ADMIN"
  | "ADMIN" // legacy super-equivalent — kept for backward compatibility
  | "OPERATIONS_ADMIN"
  | "FINANCE_ADMIN"
  | "DISPUTE_MEDIATOR"
  | "COMPLIANCE_ADMIN"
  | "COMPLIANCE_OFFICER" // legacy — mapped to the same compliance surface
  | "SUPPORT";

const ALL = PERMISSIONS.slice();

const SUPPORT_SET: readonly PermissionKey[] = [
  "dashboard.view",
  "users.view",
  "support.handle",
];

const COMPLIANCE_SET: readonly PermissionKey[] = [
  "dashboard.view",
  "users.view",
  "kyc.review",
  "tms.review",
  "support.handle",
  "disputes.view",
  "disputes.mediate",
  "monitoring.view",
  // Preserved from the legacy guard: compliance staff previously read audit
  // logs via requireStaffRole("ADMIN", "COMPLIANCE_OFFICER").
  "audit.view",
  // Compliance officers review manual top-up receipts today (requireStaffRole
  // ("COMPLIANCE_OFFICER", "ADMIN") in topup.routes.ts) — keep that power.
  "topups.review",
];

// === ROLE → PERMISSION MATRIX ===
export const ROLE_PERMISSIONS: Record<AdminRole, readonly PermissionKey[]> = {
  SUPER_ADMIN: ALL,
  // Legacy full-access accounts keep working until migrated to SUPER_ADMIN.
  ADMIN: ALL,
  OPERATIONS_ADMIN: [
    "dashboard.view",
    "users.view",
    "users.suspend",
    "contracts.view",
    "escrow.view",
    "payments.view",
    "payouts.view",
    "disputes.view",
    "support.handle",
    "monitoring.view",
    "receipts.view",
  ],
  // Finance sees money state everywhere but cannot release or suspend.
  FINANCE_ADMIN: [
    "dashboard.view",
    "users.view",
    "payments.view",
    "escrow.view",
    "payouts.view",
    "ledger.view",
    "reconciliation.view",
    "reports.view",
    "receipts.view",
    "audit.view",
  ],
  // Mediator decides disputes; financial release approval stays with
  // OPERATIONS_ADMIN/SUPER_ADMIN in later phases.
  DISPUTE_MEDIATOR: [
    "dashboard.view",
    "users.view",
    "contracts.view",
    "disputes.view",
    "disputes.mediate",
    "disputes.resolve",
  ],
  COMPLIANCE_ADMIN: COMPLIANCE_SET,
  COMPLIANCE_OFFICER: COMPLIANCE_SET,
  SUPPORT: SUPPORT_SET,
};

// === HELPERS ===
export function hasPermission(
  staffRole: string | null | undefined,
  key: PermissionKey,
): boolean {
  if (!staffRole) return false;
  const set = ROLE_PERMISSIONS[staffRole as AdminRole];
  return set ? set.includes(key) : false;
}

// === MIDDLEWARE ===
/**
 * Permission-scoped guard. Re-reads staffRole from the database on every
 * request (never trusts the JWT, which can be stale after a role change) and
 * refuses with 403 PERMISSION_DENIED when the role lacks the permission key.
 *
 * Use requireStaffRole() for coarse "any staff" gating and requirePermission()
 * for sensitive surfaces (financials, admin management, audits).
 */
export function requirePermission(key: PermissionKey) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { staffRole: true },
    });

    if (!user || !hasPermission(user.staffRole, key)) {
      return res
        .status(403)
        .json({ error: "PERMISSION_DENIED", required: key });
    }
    next();
  };
}

/** All staff roles — used for validation of role-change inputs. */
export const STAFF_ROLES: readonly string[] = Object.keys(ROLE_PERMISSIONS);
