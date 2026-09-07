// === IMPORTS ===
import { Router } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../../middleware/auth.js";
import { requireStaffRole } from "../../middleware/staffRole.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { notifyStaffOfEvent } from "../../lib/staffAlerts.js";
import type { StaffRole } from "@prisma/client";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  STAFF_ROLES,
  requirePermission,
} from "./permissions.js";
import {
  listUsers,
  getUserSummary,
  listContracts,
  getContractDetail,
} from "./usersContracts.service.js";
import {
  listPayments,
  listEscrows,
  listPayouts,
  getLedgerSummary,
  listLedgerJournals,
} from "./financeAdmin.service.js";

/**
 * Staff-only platform administration surface. Everything here requires a
 * staff role; sensitive surfaces additionally require a permission key via
 * `requirePermission(...)` (see permissions.ts, ADMIN_PHASE1_PLAN.md §2).
 * Audit logs are additionally readable by compliance roles.
 *
 * Fills admin-side gaps identified in the production-readiness audit:
 *   - Audit log viewer (previously write-only)
 *   - User management: search / suspend / unsuspend / force KYC re-review
 *   - RBAC: permission matrix, staff listing, role assignment
 */

export const adminRouter = Router();

function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(String(query.page ?? "1")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(query.limit ?? "25")) || 25),
  );
  return { page, limit, skip: (page - 1) * limit };
}

// ---------- Audit log viewer ----------

adminRouter.get(
  "/audit-logs",
  requirePermission("audit.view"),
  async (req: AuthedRequest, res) => {
    try {
      const { page, limit, skip } = parsePagination(
        req.query as Record<string, unknown>,
      );
      const where: {
        eventType?: string;
        entityType?: string;
        entityId?: string;
        userId?: string;
      } = {};

      if (req.query.eventType) where.eventType = String(req.query.eventType);
      if (req.query.entityType) where.entityType = String(req.query.entityType);
      if (req.query.entityId) where.entityId = String(req.query.entityId);
      if (req.query.userId) where.userId = String(req.query.userId);

      const [total, items] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip,
        }),
      ]);

      return res.json({ items, total, page, limit });
    } catch (err) {
      logger.error({ err }, "Failed to list audit logs");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- User management: search ----------

adminRouter.get(
  "/users/search",
  requirePermission("users.view"),
  async (req: AuthedRequest, res) => {
    try {
      const { page, limit, skip } = parsePagination(
        req.query as Record<string, unknown>,
      );
      const q = String(req.query.q ?? "").trim();

      if (q.length < 2) {
        return res.status(400).json({
          error: "QUERY_TOO_SHORT",
          message: "Search at least 2 characters.",
        });
      }

      const where = {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q } },
          { ucid: { contains: q, mode: "insensitive" as const } },
          { displayName: { contains: q, mode: "insensitive" as const } },
        ],
      };

      const [total, items] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            phone: true,
            displayName: true,
            role: true,
            staffRole: true,
            isSuspended: true,
            cachedKycTier: true,
            cachedKycStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip,
        }),
      ]);

      return res.json({ items, total, page, limit });
    } catch (err) {
      logger.error({ err }, "Failed to search users");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- User management: suspend / unsuspend ----------

const SuspendInput = z.object({ reason: z.string().min(5).max(500) });

adminRouter.post(
  "/users/:id/suspend",
  requirePermission("users.suspend"),
  async (req: AuthedRequest, res) => {
    const parsed = SuspendInput.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const target = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: { id: true, isSuspended: true, staffRole: true },
      });

      if (!target) return res.status(404).json({ error: "NOT_FOUND" });
      if (target.staffRole) {
        // Staff accounts must be managed via DB/seed process - suspending a
        // compliance officer through the app would lock out the whole team.
        return res.status(403).json({ error: "CANNOT_SUSPEND_STAFF" });
      }

      const user = await prisma.user.update({
        where: { id: target.id },
        data: { isSuspended: true },
      });

      await recordAuditEvent({
        userId: req.user!.id,
        eventType: "USER_SUSPENDED",
        entityType: "User",
        entityId: user.id,
        metadata: { reason: parsed.data.reason },
        actorRole: req.user!.staffRole ?? null,
        previousState: { isSuspended: false },
        newState: { isSuspended: true },
        requestId: String(req.id ?? ""),
        ipAddress: req.ip ?? null,
      });

      return res.json({ id: user.id, isSuspended: user.isSuspended });
    } catch (err) {
      logger.error({ err }, "Failed to suspend user");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

adminRouter.post(
  "/users/:id/unsuspend",
  requirePermission("users.suspend"),
  async (req: AuthedRequest, res) => {
    try {
      const target = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: { id: true, isSuspended: true },
      });
      if (!target) return res.status(404).json({ error: "NOT_FOUND" });

      const user = await prisma.user.update({
        where: { id: target.id },
        data: { isSuspended: false },
      });

      await recordAuditEvent({
        userId: req.user!.id,
        eventType: "USER_UNSUSPENDED",
        entityType: "User",
        entityId: user.id,
        actorRole: req.user!.staffRole ?? null,
        previousState: { isSuspended: true },
        newState: { isSuspended: false },
        requestId: String(req.id ?? ""),
        ipAddress: req.ip ?? null,
      });

      return res.json({ id: user.id, isSuspended: user.isSuspended });
    } catch (err) {
      logger.error({ err }, "Failed to unsuspend user");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- User management: force KYC re-review ----------

adminRouter.post(
  "/users/:id/force-kyc-rereview",
  requirePermission("kyc.review"),
  async (req: AuthedRequest, res) => {
    try {
      const kyc = await prisma.kycRecord.findUnique({
        where: { userId: req.params.id },
      });
      if (!kyc) return res.status(404).json({ error: "KYC_NOT_FOUND" });

      const updated = await prisma.kycRecord.update({
        where: { userId: req.params.id },
        data: {
          periodicReviewPending: true,
          nextReviewDueAt: new Date(),
        },
      });

      await recordAuditEvent({
        userId: req.user!.id,
        eventType: "KYC_FORCED_REREVIEW",
        entityType: "KycRecord",
        entityId: kyc.id,
        metadata: { targetUserId: req.params.id },
      });

      await notifyStaffOfEvent({
        eventType: "kyc-rereview-requested",
        message: `Forced KYC re-review queued for user ${req.params.id}.`,
        metadata: { targetUserId: req.params.id, kycRecordId: kyc.id },
      });

      return res.json({
        kycRecordId: updated.id,
        periodicReviewPending: updated.periodicReviewPending,
        nextReviewDueAt: updated.nextReviewDueAt,
      });
    } catch (err) {
      logger.error({ err }, "Failed to force KYC re-review");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- RBAC: permission matrix + staff role management ----------

/**
 * Exposes the canonical role→permission mapping so the Admins & Permissions
 * UI can render live rules instead of a hard-coded copy.
 */
adminRouter.get(
  "/permissions/matrix",
  requirePermission("dashboard.view"),
  (_req: AuthedRequest, res) => {
    return res.json({ permissions: PERMISSIONS, roles: ROLE_PERMISSIONS });
  },
);

/** All accounts that currently have a staff role assigned. */
adminRouter.get(
  "/staff",
  requirePermission("admins.manage"),
  async (req: AuthedRequest, res) => {
    const { page, limit, skip } = parsePagination(
      req.query as Record<string, unknown>,
    );
    const [total, items] = await Promise.all([
      prisma.user.count({ where: { staffRole: { not: null } } }),
      prisma.user.findMany({
        where: { staffRole: { not: null } },
        select: {
          id: true,
          ucid: true,
          email: true,
          phone: true,
          displayName: true,
          role: true,
          staffRole: true,
          isSuspended: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
    ]);
    return res.json({ items, total, page, limit });
  },
);

const SetStaffRoleInput = z.object({
  // null clears the staff role (demotes to a regular user).
  staffRole: z
    .enum(
      STAFF_ROLES as [string, ...string[]],
    )
    .nullable(),
});

const FULL_ACCESS_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);

adminRouter.post(
  "/staff/:userId/role",
  requirePermission("admins.manage"),
  async (req: AuthedRequest, res) => {
    const parsed = SetStaffRoleInput.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }
    const nextRole = parsed.data.staffRole;
    const targetUserId = String(req.params.userId);
    const actorId = req.user!.id;

    try {
      const target = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true, staffRole: true },
      });
      if (!target) return res.status(404).json({ error: "NOT_FOUND" });

      // Self-lockout guard: an admin cannot change their own role via the API.
      if (targetUserId === actorId) {
        return res
          .status(409)
          .json({ error: "CANNOT_CHANGE_OWN_STAFF_ROLE" });
      }

      // Lockout guard: never strip the last full-access administrator.
      const strippingFullAccess =
        target.staffRole && FULL_ACCESS_ROLES.has(target.staffRole) &&
        !(nextRole && FULL_ACCESS_ROLES.has(nextRole));
      if (strippingFullAccess) {
        const adminsLeft = await prisma.user.count({
          where: {
            staffRole: { in: Array.from(FULL_ACCESS_ROLES) as StaffRole[] },
            isSuspended: false,
            id: { not: targetUserId },
          },
        });
        if (adminsLeft === 0) {
          return res
            .status(409)
            .json({ error: "CANNOT_DEMOTE_LAST_SUPER_ADMIN" });
        }
      }

      const updated = await prisma.user.update({
        where: { id: targetUserId },
        data: { staffRole: nextRole as StaffRole | null },
        select: { id: true, email: true, staffRole: true },
      });

      await recordAuditEvent({
        userId: actorId,
        eventType: "STAFF_ROLE_CHANGED",
        entityType: "User",
        entityId: targetUserId,
        actorRole: req.user!.staffRole ?? null,
        previousState: { staffRole: target.staffRole },
        newState: { staffRole: nextRole },
        metadata: { targetEmail: target.email },
        requestId: String(req.id ?? ""),
        ipAddress: req.ip ?? null,
      });

      return res.json(updated);
    } catch (err) {
      logger.error({ err }, "Failed to update staff role");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- Users Management ----------
adminRouter.get(
  "/users",
  requirePermission("users.view"),
  async (req: AuthedRequest, res) => {
    try {
      const params = {
        page: Math.max(1, parseInt(String(req.query.page)) || 1),
        limit: Math.min(100, parseInt(String(req.query.limit)) || 20),
        role: req.query.role as string | undefined,
        q: (req.query.q as string) ?? undefined,
      };
      return res.json(await listUsers(params));
    } catch (err) {
      logger.error({ err }, "Failed to list users");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

adminRouter.get(
  "/users/:userId",
  requirePermission("users.view"),
  async (req: AuthedRequest, res) => {
    try {
      const data = await getUserSummary(String(req.params.userId));
      if (!data) return res.status(404).json({ error: "NOT_FOUND" });
      return res.json(data);
    } catch (err) {
      logger.error({ err }, "Failed to fetch user detail");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- Contracts Management ----------
adminRouter.get(
  "/contracts",
  requirePermission("contracts.view"),
  async (req: AuthedRequest, res) => {
    try {
      const params = {
        page: Math.max(1, parseInt(String(req.query.page)) || 1),
        limit: Math.min(100, parseInt(String(req.query.limit)) || 20),
        status: req.query.status as string | undefined,
        q: (req.query.q as string) ?? undefined,
      };
      return res.json(await listContracts(params));
    } catch (err) {
      logger.error({ err }, "Failed to list contracts");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

adminRouter.get(
  "/contracts/:contractId",
  requirePermission("contracts.view"),
  async (req: AuthedRequest, res) => {
    try {
      const data = await getContractDetail(String(req.params.contractId));
      if (!data) return res.status(404).json({ error: "NOT_FOUND" });
      return res.json(data);
    } catch (err) {
      logger.error({ err }, "Failed to fetch contract detail");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- Payments ----------
adminRouter.get(
  "/payments",
  requirePermission("payments.view"),
  async (req: AuthedRequest, res) => {
    try {
      return res.json(
        await listPayments({
          page: Math.max(1, parseInt(String(req.query.page)) || 1),
          limit: Math.min(100, parseInt(String(req.query.limit)) || 20),
          status: req.query.status as string | undefined,
          provider: req.query.provider as string | undefined,
          q: req.query.q as string | undefined,
        }),
      );
    } catch (err) {
      logger.error({ err }, "Failed to list payments");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- Escrow (milestones) ----------
adminRouter.get(
  "/escrows",
  requirePermission("escrow.view"),
  async (req: AuthedRequest, res) => {
    try {
      return res.json(
        await listEscrows({
          page: Math.max(1, parseInt(String(req.query.page)) || 1),
          limit: Math.min(100, parseInt(String(req.query.limit)) || 20),
          escrowState: req.query.escrowState as string | undefined,
          q: req.query.q as string | undefined,
        }),
      );
    } catch (err) {
      logger.error({ err }, "Failed to list escrows");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- Payouts ----------
adminRouter.get(
  "/payouts",
  requirePermission("payouts.view"),
  async (req: AuthedRequest, res) => {
    try {
      return res.json(
        await listPayouts({
          page: Math.max(1, parseInt(String(req.query.page)) || 1),
          limit: Math.min(100, parseInt(String(req.query.limit)) || 20),
          status: req.query.status as string | undefined,
          provider: req.query.provider as string | undefined,
          q: req.query.q as string | undefined,
        }),
      );
    } catch (err) {
      logger.error({ err }, "Failed to list payouts");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- Ledger ----------
adminRouter.get(
  "/ledger",
  requirePermission("ledger.view"),
  async (_req: AuthedRequest, res) => {
    try {
      return res.json(await getLedgerSummary());
    } catch (err) {
      logger.error({ err }, "Failed to fetch ledger summary");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

adminRouter.get(
  "/ledger/journals",
  requirePermission("ledger.view"),
  async (req: AuthedRequest, res) => {
    try {
      return res.json(
        await listLedgerJournals({
          page: Math.max(1, parseInt(String(req.query.page)) || 1),
          limit: Math.min(100, parseInt(String(req.query.limit)) || 20),
          referenceType: req.query.referenceType as string | undefined,
          q: req.query.q as string | undefined,
        }),
      );
    } catch (err) {
      logger.error({ err }, "Failed to list ledger journals");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);
