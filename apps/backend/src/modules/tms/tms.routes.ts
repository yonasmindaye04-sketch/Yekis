// === IMPORTS ===
import { Router } from "express";
import { FileStrInput, DismissFlagInput } from "@marketplace/schemas";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { requireStaffRole } from "../../middleware/staffRole.js";
import { logger } from "../../lib/logger.js";
import {
  getComplianceQueue,
  fileStr,
  dismissFlag,
  getActivityFeed,
  liftComplianceHold,
  FlagNotFoundError,
  FlagAlreadyResolvedError,
} from "./tms.service.js";

export const tmsRouter = Router();

// === MAIN FUNCTIONS ===
function handleKnownErrors(
  err: unknown,
  res: import("express").Response,
): boolean {
  if (err instanceof FlagNotFoundError) {
    res.status(404).json({ error: "NOT_FOUND" });
    return true;
  }
  if (err instanceof FlagAlreadyResolvedError) {
    res.status(409).json({ error: "ALREADY_RESOLVED" });
    return true;
  }
  return false;
}

// All TMS routes are Compliance Officer / Admin only — there is no
// user-facing surface for this module by design.
tmsRouter.use(requireAuth, requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"));

tmsRouter.get("/queue", async (req: AuthedRequest, res) => {
  const page = req.query.page ? parseInt(req.query.page as string) : undefined;
  const limit = req.query.pageSize
    ? parseInt(req.query.pageSize as string)
    : undefined;
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;
  const flagType = req.query.flagType as string | undefined;

  const queue = await getComplianceQueue({
    page,
    limit,
    search,
    status,
    flagType,
  });
  return res.json(queue);
});

tmsRouter.get("/activity", async (_req, res) => {
  const feed = await getActivityFeed();
  return res.json(feed);
});

tmsRouter.post("/:flagId/file-str", async (req: AuthedRequest, res) => {
  const parsed = FileStrInput.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  try {
    const result = await fileStr({
      staffUserId: req.user!.id,
      flagId: req.params.flagId as string,
      reviewNotes: parsed.data.reviewNotes,
      strReferenceNumber: parsed.data.strReferenceNumber,
      suspendAccount: parsed.data.suspendAccount,
    });
    return res.json(result);
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Failed to record STR filing");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

tmsRouter.post("/:flagId/dismiss", async (req: AuthedRequest, res) => {
  const parsed = DismissFlagInput.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  try {
    const result = await dismissFlag({
      staffUserId: req.user!.id,
      flagId: req.params.flagId as string,
      reviewNotes: parsed.data.reviewNotes,
    });
    return res.json(result);
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Failed to dismiss flag");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

tmsRouter.post(
  "/users/:userId/lift-hold",
  requireAuth,
  requireStaffRole("COMPLIANCE_OFFICER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    try {
      const user = await liftComplianceHold({
        staffUserId: req.user!.id,
        userId: req.params.userId as string,
        reason: req.body.reason,
      });
      return res.json(user);
    } catch (err: any) {
      logger.error({ err }, "Failed to lift compliance hold");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);
