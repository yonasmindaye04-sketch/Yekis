// === IMPORTS ===
import { randomInt } from "node:crypto";

/**
 * Shared primitives for federated (Google / Apple / Facebook / Telegram)
 * identity handling.
 *
 * WHY PLACEHOLDER PHONES
 * `User.phone` is a non-null @unique column because escrow payouts, KYC and
 * SMS OTP depend on it. Social providers never hand out a phone number, and
 * we refuse to invent one inside an operator-allocated Ethiopian range
 * (national numbers beginning 7 or 9). Fabricating `+2519...` would mean
 * writing someone else's real subscriber number into our PII store (AML
 * integrity) and could collide with a live subscriber, breaking that
 * person's login with a unique-constraint error.
 *
 * Instead every federated account gets a reserved `+251 0xxxxxxxx` block
 * that no operator is allocated, retried on unique-constraint violation so
 * concurrent signups cannot collide.
 *
 * WHY passwordSetAt
 * Merging a federated identity into an existing account keyed only on email
 * is an account-takeover primitive while email ownership is unverified: an
 * attacker pre-registers `victim@gmail.com` with a password and receives the
 * real account the moment the victim clicks "Continue with Google". So we
 * only auto-merge into accounts that were themselves created by a federated
 * provider (passwordSetAt IS NULL). Password accounts must sign in first and
 * then link the provider from an authenticated session.
 */

// === MAIN FUNCTIONS ===
export class AccountLinkRequiredError extends Error {}

const PLACEHOLDER_PHONE_MAX_ATTEMPTS = 8;

export function buildPlaceholderPhone(): string {
  return `+2510${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
}

export function isUniqueConstraintViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "P2002"
  );
}

/**
 * Runs `attempt` with a freshly generated placeholder phone, retrying on a
 * unique-constraint violation. The pre-insert race is inherent (two requests
 * can draw the same random number), so recovery is handled by retry rather
 * than by a read-then-write check.
 */
export async function withPlaceholderPhone<T>(
  attempt: (phone: string) => Promise<T>,
): Promise<T> {
  for (let i = 0; i < PLACEHOLDER_PHONE_MAX_ATTEMPTS; i++) {
    const phone = buildPlaceholderPhone();
    try {
      return await attempt(phone);
    } catch (err) {
      const isLast = i === PLACEHOLDER_PHONE_MAX_ATTEMPTS - 1;
      if (isLast || !isUniqueConstraintViolation(err)) throw err;
    }
  }
  throw new Error("Unreachable: placeholder phone retry loop exhausted.");
}

/**
 * True when the account has a platform password of its own. Such accounts
 * must never be silently claimed by a federated email match.
 */
export function isPasswordOwnedAccount(user: {
  passwordSetAt: Date | null;
}): boolean {
  return user.passwordSetAt !== null;
}

/**
 * Describes why a federated sign-in could not be merged, for audit metadata.
 */
export function accountLinkRequiredMessage(email: string): string {
  return (
    `An account already exists for ${email}. Sign in with your password first, ` +
    `then link this provider from your account settings.`
  );
}