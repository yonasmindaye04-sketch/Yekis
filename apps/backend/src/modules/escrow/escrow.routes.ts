// === IMPORTS ===
import { Router } from "express";
import { FundEscrowInput, PaymentProvider, WithdrawInput } from "../../schemas";
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
  PhoneNotVerifiedError,
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
  if (err instanceof PhoneNotVerifiedError) {
    // 403, not 422: nothing about the request is malformed, the account is
    // simply not yet allowed to move money to a destination it has not proven.
    res.status(403).json({
      error: "PHONE_NOT_VERIFIED",
      message: err.message,
      // Where the client sends the user to fix it.
      verifyAt: "/api/v1/auth/phone/code",
    });
    return true;
  }
  if (err instanceof WithdrawalHeldForReviewError) {
    res.status(202).json({ error: "HELD_FOR_REVIEW", message: err.message });
    return true;
  }
  return false;
}

// The milestone routes below were removed in Phase 0 ("baseline repair") while
// the frontend calls for them were left in place, which left the escrow
// lifecycle unreachable over HTTP: a contract could be signed, but no money
// could enter escrow, no delivery could be submitted and no payment could be
// released. acceptContract only records signatures and then tells the client
// escrow funding "is now available" -- to an endpoint that did not exist.
//
// The service functions were left imported and unused, so they are re-exposed
// here rather than rewritten. Auth is still delegated entirely to the service:
// every one of them re-reads the milestone and checks the caller's party
// position before touching money, and these handlers never make an
// authorisation decision of their own.

// Client funds a milestone with a payment provider (Telebirr / CBE / M-Pesa).
//
// The service function existed but the route did not: the frontend client
// calls POST /api/v1/escrow/fund and got a 404, so the only way money could
// enter escrow was the wallet path. Funding through a provider is what a
// client without wallet balance uses, so without this route that flow was
// unreachable over HTTP.
//
// Auth is delegated to the service: it re-reads the milestone and checks the
// caller's party position before initiating a payment.
escrowRouter.post(
  "/fund",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = z
      .object({
        milestoneId: z.string().min(1),
        contractId: z.string().min(1).optional(),
        provider: z.enum(["TELEBIRR", "CBE_BIRR", "M_PESA"]),
      })
      .safeParse(req.body);
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
      logger.error({ err }, "Failed to fund milestone via provider");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// Client funds a milestone. Requires at least Tier 1 (already required to
// have a contract at all) â€” funding itself doesn't need Tier 2, only
// withdrawal does.
escrowRouter.post(
  "/fund-from-wallet",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = z
      .object({ milestoneId: z.string().min(1) })
      .safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

    try {
      const milestone = await fundMilestoneFromWallet({
        clientId: req.user!.id,
        milestoneId: parsed.data.milestoneId,
      });
      return res.json(milestone);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Failed to fund milestone from wallet");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// Freelancer submits the delivery for a funded milestone.
escrowRouter.post(
  "/milestones/:milestoneId/submit",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const milestone = await submitMilestone({
        freelancerId: req.user!.id,
        milestoneId: String(req.params.milestoneId),
      });
      return res.json(milestone);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Failed to submit milestone delivery");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// Client accepts the delivery, which releases the funds to the freelancer.
escrowRouter.post(
  "/milestones/:milestoneId/accept",
  requireAuth,
  requireFreshAuth(300),
  async (req: AuthedRequest, res) => {
    try {
      const milestone = await acceptMilestone({
        clientId: req.user!.id,
        milestoneId: String(req.params.milestoneId),
      });
      return res.json(milestone);
    } catch (err) {
      if (handleKnownErrors(err, res)) return;
      logger.error({ err }, "Failed to accept milestone delivery");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// Milestones belonging to the caller, across every contract they are party to.
escrowRouter.get(
  "/milestones",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const milestones = await prisma.milestone.findMany({
        where: {
          contract: {
            OR: [{ clientId: req.user!.id }, { freelancerId: req.user!.id }],
          },
        },
        include: {
          contract: {
            select: { id: true, jobId: true, status: true },
          },
        },
        orderBy: { dueDate: "asc" },
      });
      return res.json(milestones);
    } catch (err) {
      logger.error({ err }, "Failed to list milestones");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// The caller's own payout history.
//
// PayoutTransaction rows have always existed and are written on every
// withdrawal, but there was no route that returned them to the user -- only the
// staff console could see them. A freelancer who asked "did my money arrive?"
// had no way to find out short of asking support, and the data they need for a
// tax record was invisible.
//
// Strictly scoped to req.user.id: this is not the admin listing, which is a
// separate route behind payouts.view.
escrowRouter.get(
  "/payouts",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit)) || 20));

    const [total, items] = await Promise.all([
      prisma.payoutTransaction.count({ where: { userId: req.user!.id } }),
      prisma.payoutTransaction.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          amountMinor: true,
          feeMinor: true,
          netAmountMinor: true,
          provider: true,
          status: true,
          payoutAccountIdentifier: true,
          errorMessage: true,
          createdAt: true,
          settledAt: true,
        },
      }),
    ]);

    return res.json({
      items,
      total,
      page,
      pageSize: limit,
    });
  },
);

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
