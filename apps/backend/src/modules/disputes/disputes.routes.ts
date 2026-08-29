// === IMPORTS ===
import { Router, Request, Response } from "express";
import { DisputesService } from "./disputes.service.js";
import { DisputeCategory, DisputeStage } from "@prisma/client";

export const disputesRouter = Router();

// POST /api/v1/disputes/raise - raise a dispute on a contract
disputesRouter.post("/raise", async (req: Request, res: Response) => {
  try {
    const { contractId, milestoneId, raisedByUserId, category, description } =
      req.body;

    if (
      !contractId ||
      !milestoneId ||
      !raisedByUserId ||
      !category ||
      !description
    ) {
      res.status(400).json({ error: "MISSING_REQUIRED_FIELDS" });
      return;
    }

    const dispute = await DisputesService.raiseDispute({
      contractId,
      milestoneId,
      raisedByUserId,
      category: category as DisputeCategory,
      description,
    });

    res.json({ success: true, dispute });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /api/v1/disputes/contract/:contractId - get dispute for contract
disputesRouter.get(
  "/contract/:contractId",
  async (req: Request, res: Response) => {
    try {
      const dispute = await DisputesService.getDisputeByContract(
        req.params.contractId as string,
      );
      res.json({ dispute });
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  },
);

// GET /api/v1/disputes/mediator/queue - list disputes in mediator queue
disputesRouter.get("/mediator/queue", async (_req: Request, res: Response) => {
  try {
    const queue = await DisputesService.listMediatorQueue();
    res.json({ queue });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/v1/disputes/:id/advance-stage - advance dispute stage
disputesRouter.post(
  "/:id/advance-stage",
  async (req: Request, res: Response) => {
    try {
      const {
        nextStage,
        actorUserId,
        evidenceBundlePath,
        mediatorRecommendation,
      } = req.body;

      if (!nextStage || !actorUserId) {
        res.status(400).json({ error: "MISSING_REQUIRED_FIELDS" });
        return;
      }

      const dispute = await DisputesService.advanceDisputeStage({
        disputeId: req.params.id as string,
        nextStage: nextStage as DisputeStage,
        actorUserId,
        evidenceBundlePath,
        mediatorRecommendation,
      });

      res.json({ success: true, dispute });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  },
);
