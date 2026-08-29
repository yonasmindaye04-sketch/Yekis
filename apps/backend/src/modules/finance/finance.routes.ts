// === IMPORTS ===
import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { requireStaffRole } from "../../middleware/staffRole.js";
import {
  getFinanceReconciliation,
  getFeeCreditLedger,
  getWithholdingReports,
  markWithholdingReportFiled,
} from "./finance.service.js";
import { logger } from "../../lib/logger.js";
import { z } from "zod";

export const financeRouter = Router();

// === MAIN FUNCTIONS ===
/**
 * All finance routes are restricted to staff roles (e.g., ADMIN, COMPLIANCE_OFFICER)
 * because they expose platform-wide financial aggregates and revenue data.
 */

// T2-B: Finance reconciliation endpoint
financeRouter.get(
  "/reconciliation",
  requireAuth,
  requireStaffRole("ADMIN", "COMPLIANCE_OFFICER"),
  async (req: AuthedRequest, res) => {
    try {
      const periodMonth = req.query.periodMonth as string | undefined;
      const data = await getFinanceReconciliation({ periodMonth });
      return res.json(data);
    } catch (err) {
      logger.error({ err }, "Failed to fetch finance reconciliation");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// T2-B: Fee credit ledger
financeRouter.get(
  "/ledger/fees",
  requireAuth,
  requireStaffRole("ADMIN", "COMPLIANCE_OFFICER"),
  async (req: AuthedRequest, res) => {
    try {
      const page = req.query.page
        ? parseInt(req.query.page as string)
        : undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;
      const ledger = await getFeeCreditLedger({ page, limit });
      return res.json(ledger);
    } catch (err) {
      logger.error({ err }, "Failed to fetch fee credit ledger");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// T2-C: Withholding tax reports list
financeRouter.get(
  "/withholding",
  requireAuth,
  requireStaffRole("ADMIN", "COMPLIANCE_OFFICER"),
  async (req: AuthedRequest, res) => {
    try {
      const page = req.query.page
        ? parseInt(req.query.page as string)
        : undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;
      const reports = await getWithholdingReports({ page, limit });
      return res.json(reports);
    } catch (err) {
      logger.error({ err }, "Failed to fetch withholding reports");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

const MarkFiledSchema = z.object({
  eraReferenceNumber: z.string().min(1),
});

// T2-C: Mark withholding report as filed with ERA
financeRouter.post(
  "/withholding/:reportId/file",
  requireAuth,
  requireStaffRole("ADMIN", "COMPLIANCE_OFFICER"),
  async (req: AuthedRequest, res) => {
    const parsed = MarkFiledSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const result = await markWithholdingReportFiled({
        reportId: req.params.reportId!,
        staffUserId: req.user!.id,
        eraReferenceNumber: parsed.data.eraReferenceNumber,
      });
      return res.json(result);
    } catch (err) {
      logger.error(
        { err, reportId: req.params.reportId },
        "Failed to mark withholding report as filed",
      );
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);
