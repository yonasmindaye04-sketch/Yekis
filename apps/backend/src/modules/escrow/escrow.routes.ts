// === IMPORTS ===
import { Router } from "express";
import { FundEscrowInput, PaymentProvider } from "@marketplace/schemas";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { requireKycVerified } from "../../middleware/hardBlock.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import {
  fundMilestone,
  fundMilestoneFromWallet,
  submitMilestone,
  acceptMilestone,
  withdrawFromWallet,
  MilestoneNotFoundError,
  NotContractPartyError,
  InvalidEscrowStateError,
  ContractNotFullyExecutedError,
  InsufficientBalanceError,
  ActiveContractWithdrawalBlockedError,
} from "./escrow.service.js";
import { WithdrawalHeldForReviewError } from "../tms/tms.service.js";

export const escrowRouter = Router();

// === MAIN FUNCTIONS ===
function handleKnownErrors(
  err: unknown,
  res: import("express").Response,
): boolean {
  if (err instanceof NotContractPartyError) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
    return true;
  }
  if (err instanceof MilestoneNotFoundError) {
    res.status(404).json({ error: "NOT_FOUND" });
    return true;
  }
  if (
    err instanceof InvalidEscrowStateError ||
    err instanceof ContractNotFullyExecutedError
  ) {
    res.status(409).json({ error: "INVALID_STATE", message: err.message });
    return true;
  }
  if (err instanceof InsufficientBalanceError) {
    res
      .status(422)
      .json({ error: "INSUFFICIENT_BALANCE", message: err.message });
    return true;
  }
  if (err instanceof ActiveContractWithdrawalBlockedError) {
    res.status(409).json({
      error: "ACTIVE_CONTRACT_BLOCKS_WITHDRAWAL",
      message: err.message,
    });
    return true;
  }
  if (err instanceof WithdrawalHeldForReviewError) {
    res.status(202).json({ error: "HELD_FOR_REVIEW", message: err.message });
    return true;
  }
  return false;
}

// Client funds a milestone. Requires at least Tier 1 (already required to
// have a contract at all) — funding itself doesn't need Tier 2, only
// withdrawal does.
escrowRouter.post(
  "/fund",
  requireAuth,
  requireKycVerified("TIER_1"),
  async (req: AuthedRequest, res) => {
    const parsed = FundEscrowInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

    try {
      const result = await fundMilestone({
        clientId: req.user!.id,
        milestoneId: parsed.data.milestoneId,
        provider: parsed.data.provider,
      });
      return res.json(result);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Escrow funding failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// Primary escrow-funding path: deducts directly from the client's in-platform
// wallet balance. Requires the contract to be fully signed by both parties
// and the client to have sufficient wallet balance (topped up via receipt).
escrowRouter.post(
  "/fund-from-wallet",
  requireAuth,
  requireKycVerified("TIER_1"),
  async (req: AuthedRequest, res) => {
    const parsed = z
      .object({ milestoneId: z.string().min(1) })
      .safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

    try {
      const result = await fundMilestoneFromWallet({
        clientId: req.user!.id,
        milestoneId: parsed.data.milestoneId,
      });
      return res.json(result);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Wallet-funded escrow failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

escrowRouter.post(
  "/milestones/:milestoneId/submit",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const result = await submitMilestone({
        freelancerId: req.user!.id,
        milestoneId: req.params.milestoneId as string,
      });
      return res.json(result);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Milestone submission failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

escrowRouter.post(
  "/milestones/:milestoneId/accept",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const result = await acceptMilestone({
        clientId: req.user!.id,
        milestoneId: req.params.milestoneId as string,
      });
      return res.json(result);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Milestone acceptance failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

escrowRouter.get("/wallet", requireAuth, async (req: AuthedRequest, res) => {
  const wallet = await prisma.wallet.findUnique({
    where: { userId: req.user!.id },
  });
  return res.json({ balanceMinor: wallet?.balanceMinor ?? 0 });
});

escrowRouter.get(
  "/milestones",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const milestones = await prisma.milestone.findMany({
      where: {
        contract: {
          OR: [{ clientId: req.user!.id }, { freelancerId: req.user!.id }],
        },
      },
      orderBy: { dueDate: "asc" },
    });
    return res.json(milestones);
  },
);

const WithdrawInput = z.object({
  amountMinor: z.number().int().positive(),
  provider: PaymentProvider,
  payoutAccountIdentifier: z.string().min(3), // e.g. the Telebirr/CBE phone or account number funds should land on
});

// Withdrawal is the one place Tier 2 is actually enforced — this is the
// concrete route the whole tiered-KYC design exists to gate.
escrowRouter.post(
  "/wallet/withdraw",
  requireAuth,
  requireKycVerified("TIER_2"),
  async (req: AuthedRequest, res) => {
    const parsed = WithdrawInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

    try {
      const result = await withdrawFromWallet({
        userId: req.user!.id,
        amountMinor: parsed.data.amountMinor,
        provider: parsed.data.provider,
        payoutAccountIdentifier: parsed.data.payoutAccountIdentifier,
      });
      return res.json(result);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Withdrawal failed");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);
