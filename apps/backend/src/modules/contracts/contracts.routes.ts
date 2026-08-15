// === IMPORTS ===
import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { getSignedObjectUrl } from "../../lib/objectStore.js";
import {
  getContract,
  acceptContract,
  ContractNotFoundError,
  NotContractPartyError,
  AlreadyAcceptedError,
} from "./contracts.service.js";
import { InsufficientBalanceError } from "../escrow/escrow.service.js";

export const contractsRouter = Router();


// === MAIN FUNCTIONS ===
function handleKnownErrors(err: unknown, res: import("express").Response): boolean {
  if (err instanceof NotContractPartyError) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
    return true;
  }
  if (err instanceof ContractNotFoundError) {
    res.status(404).json({ error: "NOT_FOUND" });
    return true;
  }
  if (err instanceof AlreadyAcceptedError) {
    res.status(409).json({ error: "CONFLICT", message: err.message });
    return true;
  }
  if (err instanceof InsufficientBalanceError) {
    // Contract was signed but auto-funding failed — the signature stands;
    // this message tells the client they need to top up to start the work.
    res.status(402).json({ error: "INSUFFICIENT_WALLET_BALANCE", message: err.message });
    return true;
  }
  return false;
}

contractsRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const contracts = await prisma.contract.findMany({
    where: { OR: [{ clientId: req.user!.id }, { freelancerId: req.user!.id }] },
    include: {
      job: { select: { id: true, title: true, status: true } },
      milestones: { orderBy: { dueDate: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json(contracts.map((contract) => ({
    ...contract,
    fullyExecuted: !!contract.clientAcceptedAt && !!contract.freelancerAcceptedAt,
  })));
});

contractsRouter.get("/:contractId", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const contract = await getContract(req.user!.id, req.params.contractId as string);
    return res.json(contract);
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Failed to fetch contract");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

contractsRouter.get("/:contractId/document", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const contract = await getContract(req.user!.id, req.params.contractId as string);
    return res.json({ url: await getSignedObjectUrl(contract.documentStoragePath) });
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Failed to create contract document URL");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

contractsRouter.post("/:contractId/accept", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await acceptContract(req.user!.id, req.params.contractId as string);
    return res.json(result);
  } catch (err) {
    if (handleKnownErrors(err, res)) return;
    logger.error({ err }, "Contract acceptance failed");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});
