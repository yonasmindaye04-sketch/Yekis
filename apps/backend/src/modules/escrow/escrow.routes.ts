// === IMPORTS ===
import { Router } from "express";
import { FundEscrowInput, PaymentProvider, WithdrawInput } from "@marketplace/schemas";
import { z } from "zod";
import { requireAuth, requireFreshAuth, type AuthedRequest } from "../../middleware/auth.js";
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
  EscrowAdminHoldError,
} from "./escrow.service.js";
import { WithdrawalHeldForReviewError } from "../tms/tms.service.js";

export const escrowRouter = Router();

// Canonical wallet read used by the Mini App and browser wallet. The previous
// frontend call had no matching route, so its error path silently displayed
// the initial zero value instead of the account balance.
escrowRouter.get("/wallet", requireAuth, async (req: AuthedRequest, res) => {
  const wallet = await prisma.wallet.findUnique({
    where: { userId: req.user!.id },
    select: { balanceMinor: true },
  });
  if (!wallet) return res.status(404).json({ error: "WALLET_NOT_FOUND" });

  const [pendingTopUps, pendingPayouts] = await Promise.all([
    prisma.walletTopUp.aggregate({
      where: {
        userId: req.user!.id,
        status: { in: ["PENDING", "CHECKOUT_PENDING"] },
      },
      _sum: { amountMinor: true },
    }),
    prisma.payoutTransaction.aggregate({
      where: {
        userId: req.user!.id,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      _sum: { amountMinor: true },
    }),
  ]);

  const pendingMinor =
    (pendingTopUps._sum.amountMinor ?? 0) +
    (pendingPayouts._sum.amountMinor ?? 0);
  return res.json({
    balanceMinor: wallet.balanceMinor,
    pendingMinor,
    availableMinor: Math.max(0, wallet.balanceMinor - (pendingPayouts._sum.amountMinor ?? 0)),
  });
});

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
  if (err instanceof EscrowAdminHoldError) {
    res.status(423).json({ error: "ESCROW_ADMIN_HOLD", message: err.message });
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
    "/wallet/withdraw",
    requireAuth,
    requireFreshAuth(300),
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
