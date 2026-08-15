import { Router } from "express";
import {
  CreateJobInput,
  JobSearchQuery,
  CreateProposalInput,
  ProposalDecisionInput,
} from "@marketplace/schemas";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { requireKycVerified } from "../../middleware/hardBlock.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import {
  createJob,
  searchJobs,
  getJobById,
  cancelJob,
  ForbiddenRoleError,
  JobNotFoundError,
  InvalidJobStateError,
} from "./jobs.service.js";
import {
  submitProposal,
  listProposalsForJob,
  decideProposal,
  withdrawProposal,
  ProposalNotFoundError,
  DuplicateProposalError,
  SelfBidError,
} from "./proposals.service.js";

export const jobsRouter = Router();

// Small local helper — every route below needs the caller's role, and the
// JWT payload only carries role at issuance time, which can go stale if a
// user's role changes mid-session. Re-reading it per request keeps
// authorization decisions correct at the cost of one extra query.
async function currentUserRole(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true } });
  return user.role;
}

function handleKnownErrors(err: unknown, res: import("express").Response): boolean {
  if (err instanceof ForbiddenRoleError || err instanceof SelfBidError) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
    return true;
  }
  if (err instanceof JobNotFoundError || err instanceof ProposalNotFoundError) {
    res.status(404).json({ error: "NOT_FOUND" });
    return true;
  }
  if (err instanceof InvalidJobStateError || err instanceof DuplicateProposalError) {
    res.status(409).json({ error: "CONFLICT", message: err.message });
    return true;
  }
  return false;
}

// ---------- Jobs ----------

jobsRouter.post("/", requireAuth, requireKycVerified("TIER_1"), async (req: AuthedRequest, res) => {
  const parsed = CreateJobInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  try {
    const role = await currentUserRole(req.user!.id);
    const job = await createJob({ clientId: req.user!.id, clientRole: role, input: parsed.data });
    return res.status(201).json(job);
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Job creation failed");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

jobsRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = JobSearchQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  const result = await searchJobs(parsed.data);
  return res.json(result);
});

jobsRouter.get("/:jobId", requireAuth, async (req, res) => {
  try {
    const job = await getJobById(req.params.jobId as string);
    return res.json(job);
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    throw err;
  }
});

jobsRouter.post("/:jobId/cancel", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const job = await cancelJob({ jobId: req.params.jobId as string, requestingUserId: req.user!.id });
    return res.json(job);
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Job cancellation failed");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ---------- Proposals ----------

jobsRouter.post(
  "/:jobId/proposals",
  requireAuth,
  requireKycVerified("TIER_1"),
  async (req: AuthedRequest, res) => {
    const parsed = CreateProposalInput.safeParse({ ...req.body, jobId: req.params.jobId });
    if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

    try {
      const role = await currentUserRole(req.user!.id);
      const proposal = await submitProposal({
        freelancerId: req.user!.id,
        freelancerRole: role,
        input: parsed.data,
      });
      return res.status(201).json(proposal);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Proposal submission failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

jobsRouter.get("/:jobId/proposals", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const proposals = await listProposalsForJob({
      jobId: req.params.jobId as string,
      requestingUserId: req.user!.id,
    });
    return res.json(proposals);
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Failed to list proposals");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

jobsRouter.post("/proposals/:proposalId/decision", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = ProposalDecisionInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  try {
    const result = await decideProposal({
      proposalId: req.params.proposalId as string,
      requestingUserId: req.user!.id,
      decision: parsed.data.decision,
    });
    return res.json(result);
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Proposal decision failed");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

jobsRouter.post("/proposals/:proposalId/withdraw", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await withdrawProposal({
      proposalId: req.params.proposalId as string,
      requestingUserId: req.user!.id,
    });
    return res.json(result);
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Proposal withdrawal failed");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});
