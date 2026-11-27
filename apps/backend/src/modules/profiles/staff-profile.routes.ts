// === IMPORTS ===
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../admin/permissions.js";
import { logger } from "../../lib/logger.js";
import { recordAuditEvent } from "../../lib/audit.js";

export const staffProfileRouter = Router();

// === ROUTES ===
staffProfileRouter.get(
  "/reports",
  requireAuth,
  requirePermission("profiles.moderate"),
  async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;
      const statusParam = String(req.query.status || "OPEN").trim().toUpperCase();
      const reasonParam = String(req.query.reason || "").trim().toUpperCase();
      const searchParam = String(req.query.search || "").trim();

      const where: Record<string, unknown> = {};
      if (statusParam === "OPEN") {
        where.status = { in: ["PENDING", "UNDER_REVIEW"] };
      } else if (statusParam && statusParam !== "ALL") {
        where.status = statusParam;
      }
      if (reasonParam && reasonParam !== "ALL") {
        where.reason = reasonParam;
      }
      if (searchParam.length >= 2) {
        where.OR = [
          { details: { contains: searchParam, mode: "insensitive" } },
          { reportedUser: { displayName: { contains: searchParam, mode: "insensitive" } } },
          { reportedUser: { email: { contains: searchParam, mode: "insensitive" } } },
          { reportedUser: { ucid: { contains: searchParam, mode: "insensitive" } } },
        ];
      }

      const [reports, total] = await Promise.all([
        prisma.profileReport.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            reportedUser: {
              select: {
                id: true,
                ucid: true,
                displayName: true,
                email: true,
                role: true,
                isSuspended: true,
                cachedKycTier: true,
                cachedKycStatus: true,
              },
            },
          },
        }),
        prisma.profileReport.count({ where }),
      ]);

      const reporterIds = [...new Set(reports.map((r) => r.reporterId).filter(Boolean))];
      const reportedUserIds = [...new Set(reports.map((r) => r.reportedUserId).filter(Boolean))];

      const [reporters, priorCounts, activeMilestones] = await Promise.all([
        reporterIds.length
          ? prisma.user.findMany({
              where: { id: { in: reporterIds } },
              select: { id: true, ucid: true, displayName: true, email: true, role: true },
            })
          : Promise.resolve([]),
        reportedUserIds.length
          ? prisma.profileReport.groupBy({
              by: ["reportedUserId"],
              where: { reportedUserId: { in: reportedUserIds } },
              _count: { id: true },
            })
          : Promise.resolve([]),
        reportedUserIds.length
          ? prisma.milestone.findMany({
              where: {
                escrowState: { in: ["ESCROW_HELD", "SUBMITTED_FOR_REVIEW", "WORK_IN_PROGRESS", "DISPUTED"] },
                contract: { OR: [{ clientId: { in: reportedUserIds } }, { freelancerId: { in: reportedUserIds } }] },
              },
              select: {
                amountMinor: true,
                contractId: true,
                contract: { select: { clientId: true, freelancerId: true } },
              },
            })
          : Promise.resolve([]),
      ]);

      const reporterById = new Map(reporters.map((u) => [u.id, u]));
      const priorByUser = new Map(priorCounts.map((c) => [c.reportedUserId, c._count.id]));
      const escrowByUser = new Map<string, { contracts: Set<string>; exposureMinor: number }>();
      for (const m of activeMilestones) {
        for (const uid of [m.contract.clientId, m.contract.freelancerId]) {
          if (!reportedUserIds.includes(uid)) continue;
          const entry = escrowByUser.get(uid) ?? { contracts: new Set<string>(), exposureMinor: 0 };
          entry.contracts.add(m.contractId);
          entry.exposureMinor += m.amountMinor;
          escrowByUser.set(uid, entry);
        }
      }

      const enriched = reports.map((r) => {
        const rep = reporterById.get(r.reporterId);
        const escrow = escrowByUser.get(r.reportedUserId);
        const priorReportsCount = priorByUser.get(r.reportedUserId) ?? 1;
        const escrowExposureMinor = escrow?.exposureMinor ?? 0;
        const activeContractsCount = escrow?.contracts.size ?? 0;
        return {
          ...r,
          reportedUser: {
            id: r.reportedUser.id,
            ucid: r.reportedUser.ucid,
            displayName: r.reportedUser.displayName,
            email: r.reportedUser.email,
            role: r.reportedUser.role,
            kycTier: r.reportedUser.cachedKycTier,
            kycStatus: r.reportedUser.cachedKycStatus,
          },
          reporter: rep ?? null,
          priorReportsCount,
          activeContractsCount,
          escrowExposureMinor,
          checks: {
            regexFlagged: r.reason === "OFF_PLATFORM_CONTACT" || r.reason === "SPAM",
            repeatOffender: priorReportsCount > 1,
            escrowAtRisk: escrowExposureMinor > 0,
            faydaVerified: r.reportedUser.cachedKycStatus === "VERIFIED",
          },
        };
      });

      res.json({
        data: enriched,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error({ err: error }, "GET /staff/reports error");
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  },
);

const resolveReportSchema = z.object({
  status: z.enum([
    "PENDING",
    "UNDER_REVIEW",
    "RESOLVED_NO_ACTION",
    "RESOLVED_PROFILE_HIDDEN",
    "RESOLVED_PROFILE_BANNED",
  ]),
  staffNotes: z.string().optional(),
});

staffProfileRouter.patch(
  "/reports/:reportId",
  requireAuth,
  requirePermission("profiles.moderate"),
  async (req: any, res) => {
    try {
      const { reportId } = req.params;
      const data = resolveReportSchema.parse(req.body);

      const report = await prisma.profileReport.update({
        where: { id: reportId },
        data: {
          status: data.status,
          staffNotes: data.staffNotes,
          resolvedAt: new Date(),
          reviewedByStaffId: req.user.id,
        },
      });

      await recordAuditEvent({
        eventType: "RESOLVE_REPORT",
        userId: req.user.id,
        entityType: "ProfileReport",
        entityId: reportId,
        metadata: { status: data.status, notes: data.staffNotes },
      });

      res.json(report);
    } catch (error) {
      logger.error({ err: error }, "PATCH /staff/reports/:reportId error");
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to resolve report" });
    }
  },
);
