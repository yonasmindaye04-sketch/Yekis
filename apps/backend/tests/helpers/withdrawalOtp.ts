/**
 * Test helper: a live withdrawal approval.
 *
 * Withdrawals require an SMS approval code (the Roadmap makes two-factor
 * approval mandatory for withdrawals). A test that exercises the money path
 * therefore needs a code it can submit.
 *
 * This writes the same row the production flow writes — an UNVERIFIED
 * challenge with the code hashed and salted — so the test goes through the
 * real verification, including the hashing and the attempt counter, rather
 * than short-circuiting it.
 */
import { randomBytes } from "node:crypto";
import { prisma } from "../../src/lib/prisma.js";
import { hashCode } from "../../src/modules/auth/phone-verification.service.js";

/** The code the helper issues. Fixed so the caller can submit it. */
export const TEST_WITHDRAWAL_CODE = "123456";

/**
 * Creates a pending withdrawal challenge for a user and returns the code.
 *
 * Any previous challenge for that user is removed first, because the
 * production flow allows only one outstanding code per (phone, purpose) and
 * the verification looks up the newest one.
 */
export async function grantWithdrawalApproval(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { phone: true },
  });

  await prisma.phoneVerificationCode.deleteMany({
    where: { userId, purpose: "WITHDRAWAL" },
  });

  const salt = randomBytes(16).toString("hex");
  await prisma.phoneVerificationCode.create({
    data: {
      userId,
      phone: user.phone,
      purpose: "WITHDRAWAL",
      codeHash: hashCode(salt, TEST_WITHDRAWAL_CODE),
      salt,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  return TEST_WITHDRAWAL_CODE;
}

/** Removes any withdrawal challenge a test left behind. */
export async function clearWithdrawalApproval(userId: string): Promise<void> {
  await prisma.phoneVerificationCode.deleteMany({
    where: { userId, purpose: "WITHDRAWAL" },
  });
}
