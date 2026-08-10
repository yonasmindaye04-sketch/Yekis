import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { logger } from "../../lib/logger.js";
import {
  getContract,
  acceptContract,
  ContractNotFoundError,
  NotContractPartyError,
  AlreadyAcceptedError,
} from "./contracts.service.js";

export const contractsRouter = Router();

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
  return false;
}

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
