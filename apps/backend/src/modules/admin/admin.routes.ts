// === IMPORTS ===
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireFreshAuth, type AuthedRequest } from "../../middleware/auth.js";
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
import {
  listReconciliation,
  getReportsSummary,
  getDashboardSummary,
  getSystemHealth,
} from "./operational.service.js";
import {
  settlePayout,
  PayoutNotFoundError,
  InvalidPayoutStateError,
} from "./payoutAdmin.service.js";
import { moderateGigStatus, GigNotFoundError } from "../gigs/gig.service.js";
import { EscrowAdminHoldError, releaseMilestoneFunds } from "../escrow/escrow.service.js";

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

/**
 * Raised inside the staff-status transaction when the target is the last active
 * administrator. Carried out of the transaction so the route can answer 409
 * rather than 500: refusing to suspend the last admin is correct behaviour, not
 * a server fault.
 */
class LastActiveAdminError extends Error {
  constructor() {
    super("Cannot suspend the last active administrator.");
    this.name = "LastActiveAdminError";
  }
}

export const adminRouter = Router();
adminRouter.use(requireAuth);

// ---------- Gig moderation ----------
// The public gig API intentionally exposes only owner operations. This admin
// queue gives staff a paginated review surface before a gig becomes ACTIVE.
adminRouter.get(
  "/gigs",
  requirePermission("gigs.moderate"),
  async (req: AuthedRequest, res) => {
    try {
      const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
      const q = String(req.query.q ?? "").trim();
      const status = String(req.query.status ?? "").trim();
      const allowed = ["DRAFT", "ACTIVE", "PAUSED", "REJECTED", "ARCHIVED"];
      const where: any = {};
      if (allowed.includes(status)) where.status = status;
      if (q) {
        where.OR = [
          { title: { contains: q, mode: "insensitive" } },
          { freelancer: { email: { contains: q, mode: "insensitive" } } },
          { freelancer: { displayName: { contains: q, mode: "insensitive" } } },
        ];
      }
      const [total, items] = await Promise.all([
        prisma.gig.count({ where }),
        prisma.gig.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take: limit,
          include: {
            freelancer: { select: { id: true, email: true, displayName: true, ucid: true } },
            packages: { orderBy: { priceMinor: "asc" }, take: 3 },
          },
        }),
      ]);
      return res.json({ items, total, page, pageSize: limit });
    } catch (err) {
      logger.error({ err }, "Failed to list gig moderation queue");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

adminRouter.post(
  "/gigs/:gigId/moderation",
  requireFreshAuth(300),
  requirePermission("gigs.moderate"),
  async (req: AuthedRequest, res) => {
    const parsed = z.object({
      status: z.enum(["ACTIVE", "REJECTED", "PAUSED", "ARCHIVED"]),
      reason: z.string().max(1000).optional(),
    }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }
    if (parsed.data.status === "REJECTED" && (parsed.data.reason ?? "").trim().length < 10) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "A rejection reason of at least 10 characters is required." });
    }
    try {
      return res.json(await moderateGigStatus({
        staffUserId: req.user!.id,
        gigId: String(req.params.gigId),
        status: parsed.data.status,
        reason: parsed.data.reason,
      }));
    } catch (err) {
      if (err instanceof GigNotFoundError) return res.status(404).json({ error: "NOT_FOUND" });
      logger.error({ err }, "Failed to moderate gig");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

adminRouter.post(
  "/escrows/:milestoneId/release",
  requireFreshAuth(300),
  requirePermission("escrow.release"),
  async (req: AuthedRequest, res) => {
    const parsed = z.object({ reason: z.string().min(10).max(1000) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    try {
      const milestone = await prisma.milestone.findUnique({ where: { id: String(req.params.milestoneId) }, select: { id: true, amountMinor: true, escrowState: true, contract: { select: { freelancerId: true } } } });
      if (!milestone) return res.status(404).json({ error: "NOT_FOUND" });
      if (!["SUBMITTED_FOR_REVIEW", "DISPUTED"].includes(milestone.escrowState)) return res.status(409).json({ error: "INVALID_STATE", message: `Cannot release milestone in state ${milestone.escrowState}.` });
      await releaseMilestoneFunds(milestone.id, milestone.contract.freelancerId, milestone.amountMinor);
      await recordAuditEvent({ userId: req.user!.id, eventType: "ADMIN_ESCROW_RELEASED", entityType: "Milestone", entityId: milestone.id, amountMinor: milestone.amountMinor, metadata: { reason: parsed.data.reason }, actorRole: req.user!.staffRole ?? null, previousState: { escrowState: milestone.escrowState }, newState: { escrowState: "RELEASED" }, requestId: String(req.id ?? ""), ipAddress: req.ip ?? null });
      return res.json({ id: milestone.id, escrowState: "RELEASED" });
    } catch (err) {
      if (err instanceof EscrowAdminHoldError) return res.status(423).json({ error: "ESCROW_ADMIN_HOLD", message: err.message });
      logger.error({ err }, "Failed to release escrow as admin");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

adminRouter.post(
  "/escrows/:milestoneId/hold",
  requireFreshAuth(300),
  requirePermission("escrow.freeze"),
  async (req: AuthedRequest, res) => {
    const parsed = z.object({ reason: z.string().min(10).max(1000) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    const milestoneId = String(req.params.milestoneId);
    try {
      const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId }, select: { id: true, escrowState: true } });
      if (!milestone) return res.status(404).json({ error: "NOT_FOUND" });
      const existing = await prisma.escrowHold.findFirst({ where: { milestoneId, active: true }, select: { id: true } });
      if (existing) return res.status(409).json({ error: "ALREADY_ON_HOLD" });
      const hold = await prisma.escrowHold.create({ data: { milestoneId, placedByStaffId: req.user!.id, reason: parsed.data.reason } });
      await recordAuditEvent({ userId: req.user!.id, eventType: "ADMIN_ESCROW_HELD", entityType: "Milestone", entityId: milestoneId, metadata: { reason: parsed.data.reason }, actorRole: req.user!.staffRole ?? null, previousState: { escrowState: milestone.escrowState }, newState: { escrowHoldId: hold.id, active: true }, requestId: String(req.id ?? ""), ipAddress: req.ip ?? null });
      return res.status(201).json(hold);
    } catch (err) {
      logger.error({ err }, "Failed to place escrow hold");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

adminRouter.post(
  "/escrows/:milestoneId/unhold",
  requireFreshAuth(300),
  requirePermission("escrow.freeze"),
  async (req: AuthedRequest, res) => {
    const parsed = z.object({ reason: z.string().min(10).max(1000) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    const milestoneId = String(req.params.milestoneId);
    try {
      const updated = await prisma.escrowHold.updateMany({ where: { milestoneId, active: true }, data: { active: false, releasedByStaffId: req.user!.id, releasedAt: new Date(), releaseReason: parsed.data.reason } });
      if (updated.count === 0) return res.status(404).json({ error: "ACTIVE_HOLD_NOT_FOUND" });
      await recordAuditEvent({ userId: req.user!.id, eventType: "ADMIN_ESCROW_UNHELD", entityType: "Milestone", entityId: milestoneId, metadata: { reason: parsed.data.reason }, actorRole: req.user!.staffRole ?? null, newState: { active: false }, requestId: String(req.id ?? ""), ipAddress: req.ip ?? null });
      return res.json({ id: milestoneId, active: false });
    } catch (err) {
      logger.error({ err }, "Failed to remove escrow hold");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

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
  requireFreshAuth(300),
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
  requireFreshAuth(300),
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
  requireFreshAuth(300),
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
  requireFreshAuth(300),
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

      await prisma.$executeRaw`UPDATE "User" SET "sessionVersion" = "sessionVersion" + 1 WHERE id = ${targetUserId}`;

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

adminRouter.post(
  "/staff/:userId/status",
  requireFreshAuth(300),
  requirePermission("admins.manage"),
  async (req: AuthedRequest, res) => {
    // The reason is mandatory. It was `min(5).optional()`, which meant a staff
    // account could be suspended with no explanation at all, or with a
    // five-character one. Suspension cuts someone's access instantly; the record
    // of why is the only thing that makes that reviewable later.
    const parsed = z
      .object({
        suspended: z.boolean(),
        reason: z
          .string()
          .trim()
          .min(20, "Give at least 20 characters of context.")
          .max(500),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    const targetUserId = String(req.params.userId);
    if (targetUserId === req.user!.id) return res.status(409).json({ error: "CANNOT_CHANGE_OWN_STATUS" });
    try {
      const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, staffRole: true, isSuspended: true } });
      if (!target?.staffRole) return res.status(404).json({ error: "STAFF_NOT_FOUND" });
      // The last-admin guard, the status change and the session invalidation
      // are now one transaction.
      //
      // They used to be three separate statements: count the remaining active
      // admins, update the target, bump sessionVersion. Two concurrent requests
      // could both read "one other admin", both pass the count, and both suspend
      // -- leaving the platform with zero working admins and no obvious error.
      // That is a lockout, not a race that resolves safely.
      //
      // Serializable isolation means the second transaction's count sees the
      // first one's committed row, so the loser fails the check and 409s
      // instead of taking the last admin down with it.
      const updated = await prisma.$transaction(
        async (tx) => {
          if (parsed.data.suspended && (target.staffRole === "ADMIN" || target.staffRole === "SUPER_ADMIN")) {
            // Lock the candidate set rather than just counting it.
            //
            // Serializable isolation alone proved NOT sufficient here: two
            // concurrent suspensions of the last two admins both committed,
            // because the count can be satisfied by an index-only scan, which
            // takes no row-level predicate lock, so PostgreSQL's SSI never sees
            // the read-write cycle. FOR UPDATE blocks the second transaction on
            // the actual rows, so it re-reads the first one's committed state.
            const locked = await tx.$queryRaw<{ id: string }[]>`
              SELECT "id" FROM "User"
               WHERE "staffRole" IN ('ADMIN', 'SUPER_ADMIN')
                 AND "isSuspended" = false
                 AND "id" <> ${targetUserId}
               FOR UPDATE
            `;
            if (locked.length === 0) {
              throw new LastActiveAdminError();
            }
          }

          const row = await tx.user.update({
            where: { id: targetUserId },
            data: { isSuspended: parsed.data.suspended },
            select: { id: true, isSuspended: true, staffRole: true },
          });

          // Revoking every live session for the target is the point of a
          // suspension, so it must not be able to fail independently of the
          // status change.
          await tx.$executeRaw`UPDATE "User" SET "sessionVersion" = "sessionVersion" + 1 WHERE id = ${targetUserId}`;

          return row;
        },
        { isolationLevel: "Serializable" },
      );

      await recordAuditEvent({ userId: req.user!.id, eventType: parsed.data.suspended ? "STAFF_SUSPENDED" : "STAFF_UNSUSPENDED", entityType: "User", entityId: targetUserId, metadata: { reason: parsed.data.reason }, actorRole: req.user!.staffRole ?? null, previousState: { isSuspended: target.isSuspended }, newState: { isSuspended: updated.isSuspended } });
      return res.json(updated);
    } catch (err) {
      if (err instanceof LastActiveAdminError) {
        return res.status(409).json({
          error: "CANNOT_SUSPEND_LAST_ADMIN",
          message: "This is the last active administrator. Promote another first.",
        });
      }
      logger.error({ err }, "Failed to update staff status");
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

adminRouter.post(
  "/payouts/:payoutId/settle",
  requireFreshAuth(300),
  requirePermission("payouts.settle"),
  async (req: AuthedRequest, res) => {
    const parsed = z
      .object({
        decision: z.enum(["CONFIRMED", "FAILED"]),
        providerPayoutId: z.string().min(4).max(200).optional(),
        failureReason: z.string().min(5).max(1000).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }
    try {
      const settled = await settlePayout({
        staffUserId: req.user!.id,
        payoutId: String(req.params.payoutId),
        decision: parsed.data.decision,
        providerPayoutId: parsed.data.providerPayoutId,
        failureReason: parsed.data.failureReason,
      });
      return res.json(settled);
    } catch (err) {
      if (err instanceof PayoutNotFoundError) {
        return res.status(404).json({ error: "NOT_FOUND", message: err.message });
      }
      if (err instanceof InvalidPayoutStateError) {
        return res.status(409).json({ error: "CONFLICT", message: err.message });
      }
      logger.error({ err }, "Failed to settle payout");
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

// ---------- Reconciliation (Phase 4) ----------
adminRouter.get(
  "/reconciliation",
  requirePermission("reconciliation.view"),
  async (req: AuthedRequest, res) => {
    try {
      return res.json(
        await listReconciliation({
          page: Math.max(1, parseInt(String(req.query.page)) || 1),
          limit: Math.min(100, parseInt(String(req.query.limit)) || 20),
          recStatus: req.query.recStatus as string | undefined,
          provider: req.query.provider as string | undefined,
        }),
      );
    } catch (err) {
      logger.error({ err }, "Failed to list reconciliation");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- Reports (Phase 4) ----------
adminRouter.get(
  "/reports/summary",
  requirePermission("reports.view"),
  async (_req: AuthedRequest, res) => {
    try {
      return res.json(await getReportsSummary());
    } catch (err) {
      logger.error({ err }, "Failed to fetch reports summary");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- Overview (Phase 8) ----------
adminRouter.get(
  "/dashboard/summary",
  requirePermission("dashboard.view"),
  async (_req: AuthedRequest, res) => {
    try {
      return res.json(await getDashboardSummary());
    } catch (err) {
      logger.error({ err }, "Failed to fetch dashboard summary");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// ---------- Monitoring (Phase 7) ----------
adminRouter.get(
  "/monitoring/health",
  requirePermission("monitoring.view"),
  async (_req: AuthedRequest, res) => {
    try {
      return res.json(await getSystemHealth());
    } catch (err) {
      logger.error({ err }, "Failed to fetch system health");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);
