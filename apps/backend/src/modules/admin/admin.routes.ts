// === IMPORTS ===
import { Router } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../../middleware/auth.js";
import { requireStaffRole } from "../../middleware/staffRole.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { notifyStaffOfEvent } from "../../lib/staffAlerts.js";

/**
 * Staff-only platform administration surface. Everything here requires a
 * staff role; audit logs are additionally readable by COMPLIANCE_OFFICER.
 *
 * Fills admin-side gaps identified in the production-readiness audit:
 *   - Audit log viewer (previously write-only)
 *   - User management: search / suspend / unsuspend / force KYC re-review
 */

export const adminRouter = Router();

function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(String(query.page ?? "1")) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? "25")) || 25));
  return { page, limit, skip: (page - 1) * limit };
}

// ---------- Audit log viewer ----------

adminRouter.get(
  "/audit-logs",
  requireStaffRole("ADMIN", "COMPLIANCE_OFFICER"),
  async (req: AuthedRequest, res) => {
    try {
      const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
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
  }
);

// ---------- User management: search ----------

adminRouter.get("/users/search", requireStaffRole("ADMIN"), async (req: AuthedRequest, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const q = String(req.query.q ?? "").trim();

    if (q.length < 2) {
      return res.status(400).json({ error: "QUERY_TOO_SHORT", message: "Search at least 2 characters." });
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
});

// ---------- User management: suspend / unsuspend ----------

const SuspendInput = z.object({ reason: z.string().min(5).max(500) });

adminRouter.post(
  "/users/:id/suspend",
  requireStaffRole("ADMIN"),
  async (req: AuthedRequest, res) => {
    const parsed = SuspendInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
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
      });

      return res.json({ id: user.id, isSuspended: user.isSuspended });
    } catch (err) {
      logger.error({ err }, "Failed to suspend user");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

adminRouter.post(
  "/users/:id/unsuspend",
  requireStaffRole("ADMIN"),
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
      });

      return res.json({ id: user.id, isSuspended: user.isSuspended });
    } catch (err) {
      logger.error({ err }, "Failed to unsuspend user");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

// ---------- User management: force KYC re-review ----------

adminRouter.post(
  "/users/:id/force-kyc-rereview",
  requireStaffRole("ADMIN", "COMPLIANCE_OFFICER"),
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
  }
);
