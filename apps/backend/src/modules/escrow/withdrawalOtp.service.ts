// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import {
  requestPhoneCode,
  verifyPhoneCode,
  PhoneCodeInvalidError,
  PhoneCodeExpiredError,
  PhoneCodeAttemptsExceededError,
  PhoneCodeNotFoundError,
  PhoneCodeRateLimitedError,
  PhoneCodeDeliveryFailedError,
} from "../auth/phone-verification.service.js";

// === TYPES ===
export class WithdrawalOtpRequiredError extends Error {}
export class WithdrawalOtpInvalidError extends Error {}
export class WithdrawalPhoneMissingError extends Error {}

// === CONSTANTS ===
/**
 * How long a verified code authorises a withdrawal attempt.
 *
 * Short on purpose. The code approves ONE payout, not a session. Two minutes
 * is enough to cover the round trip of a retry after a network error, and
 * short enough that a code that leaks out of the SMS (shoulder-surfed,
 * forwarded, read over the user's shoulder) is useless by the time it is
 * noticed.
 */
const APPROVAL_WINDOW_MS = 2 * 60 * 1000;

// === MAIN FUNCTIONS ===

/**
 * Issues a one-time code that approves a single payout.
 *
 * The code goes to the phone number on the account — the same number the
 * money would be sent to. If the user cannot receive an SMS on the number
 * that is about to receive their money, they should not be able to move that
 * money.
 */
export async function requestWithdrawalOtp(userId: string): Promise<{
  expiresAt: Date;
  retryAfterSec: number;
  devCode?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, phone: true, phoneVerifiedAt: true },
  });

  if (!user) throw new WithdrawalOtpRequiredError("Account not found.");
  if (!user.phone || !user.phoneVerifiedAt) {
    throw new WithdrawalPhoneMissingError(
      "Verify your phone number before withdrawing. We send payouts to the number on your account, so we have to confirm it is yours.",
    );
  }

  const challenge = await requestPhoneCode({
    phone: user.phone,
    userId: user.id,
    purpose: "WITHDRAWAL",
    message:
      "Your Yekis withdrawal approval code is {code}. It approves ONE payout " +
      "and expires in 10 minutes. Yekis staff will never ask you for it.",
  });

  logger.info({ userId }, "Withdrawal approval code issued");

  return {
    expiresAt: challenge.expiresAt,
    retryAfterSec: challenge.retryAfterSec,
    ...(challenge.devCode ? { devCode: challenge.devCode } : {}),
  };
}

/**
 * Checks a submitted code and records the approval.
 *
 * Errors are collapsed into one generic message: distinguishing "no code
 * issued" from "wrong code" from "expired" tells an attacker which state the
 * challenge is in, and there is nothing a user can do differently about any
 * of them except request a new code.
 */
export async function verifyWithdrawalOtp(params: {
  userId: string;
  code: string;
}): Promise<{ challengeId: string; approvedUntil: Date }> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, phone: true },
  });
  if (!user?.phone) {
    throw new WithdrawalOtpInvalidError("That code is not valid.");
  }

  try {
    await verifyPhoneCode({
      phone: user.phone,
      code: params.code,
      userId: params.userId,
      purpose: "WITHDRAWAL",
    });
  } catch (err) {
    if (
      err instanceof PhoneCodeInvalidError ||
      err instanceof PhoneCodeExpiredError ||
      err instanceof PhoneCodeAttemptsExceededError ||
      err instanceof PhoneCodeNotFoundError ||
      err instanceof PhoneCodeRateLimitedError ||
      err instanceof PhoneCodeDeliveryFailedError
    ) {
      throw new WithdrawalOtpInvalidError("That code is not valid.");
    }
    throw err;
  }

  const approved = await prisma.phoneVerificationCode.findFirst({
    where: {
      userId: params.userId,
      purpose: "WITHDRAWAL",
      verifiedAt: { not: null },
    },
    orderBy: { verifiedAt: "desc" },
    select: { id: true, verifiedAt: true },
  });

  if (!approved?.verifiedAt) {
    throw new WithdrawalOtpInvalidError("That code is not valid.");
  }

  return {
    challengeId: approved.id,
    approvedUntil: new Date(approved.verifiedAt.getTime() + APPROVAL_WINDOW_MS),
  };
}

/**
 * Asserts that this user has a live approval for one withdrawal.
 *
 * Called from inside `withdrawFromWallet` rather than only at the route, so
 * the check cannot be bypassed by reaching the money through another path.
 * A fresh re-authentication is not a substitute: it proves the session is
 * recent, not that the person in front of the screen approved THIS payout.
 */
export async function assertWithdrawalApproved(userId: string): Promise<void> {
  const approved = await prisma.phoneVerificationCode.findFirst({
    where: {
      userId,
      purpose: "WITHDRAWAL",
      verifiedAt: {
        not: null,
        gte: new Date(Date.now() - APPROVAL_WINDOW_MS),
      },
    },
    orderBy: { verifiedAt: "desc" },
    select: { id: true },
  });

  if (!approved) {
    throw new WithdrawalOtpRequiredError(
      "Confirm the withdrawal code we sent you by SMS before withdrawing.",
    );
  }
}

/**
 * Consumes the approval once the money has actually moved.
 *
 * Without this, a code approved for one withdrawal could be replayed for a
 * second one inside the approval window.
 */
export async function consumeWithdrawalApproval(userId: string): Promise<void> {
  await prisma.phoneVerificationCode.deleteMany({
    where: { userId, purpose: "WITHDRAWAL" },
  });
}

/** Exposed for tests and for the ops console. */
export const WITHDRAWAL_APPROVAL_WINDOW_MS = APPROVAL_WINDOW_MS;
