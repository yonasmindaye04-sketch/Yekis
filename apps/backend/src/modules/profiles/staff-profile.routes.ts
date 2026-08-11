// === IMPORTS ===
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireStaffRole } from "../../middleware/staffRole.js";
import { logger } from "../../lib/logger.js";
import { recordAuditEvent } from "../../lib/audit.js";

export const staffProfileRouter = Router();

// === ROUTES ===
staffProfileRouter.get("/reports", requireAuth, requireStaffRole("ADMIN", "COMPLIANCE_OFFICER", "SUPPORT"), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const [reports, total] = await Promise.all([
      prisma.profileReport.findMany({
        where: { status: "PENDING" },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          reportedUser: { select: { id: true, ucid: true, displayName: true } }
        }
      }),
      prisma.profileReport.count({ where: { status: "PENDING" } })
    ]);
    
    res.json({
      data: reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error("GET /staff/reports error", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

const resolveReportSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED"]),
  staffNotes: z.string().optional()
});

staffProfileRouter.patch("/reports/:reportId", requireAuth, requireStaffRole("ADMIN", "COMPLIANCE_OFFICER"), async (req: any, res) => {
  try {
    const { reportId } = req.params;
    const data = resolveReportSchema.parse(req.body);
    
    const report = await prisma.profileReport.update({
      where: { id: reportId },
      data: {
        status: data.status,
        staffNotes: data.staffNotes,
        resolvedAt: new Date(),
        reviewedByStaffId: req.user.id
      }
    });
    
    await recordAuditEvent({
      eventType: "RESOLVE_REPORT",
      userId: req.user.id,
      entityType: "ProfileReport",
      entityId: reportId,
      metadata: { status: data.status, notes: data.staffNotes }
    });
    
    res.json(report);
  } catch (error) {
    logger.error("PATCH /staff/reports/:reportId error", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to resolve report" });
  }
});
