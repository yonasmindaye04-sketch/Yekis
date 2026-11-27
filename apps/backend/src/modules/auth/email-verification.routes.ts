// === IMPORTS ===
import type { Response, Router } from "express";
import { z } from "zod";
import { rateLimit } from "../../lib/rateLimit.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { env, isDevCodeDisclosureAllowed } from "../../config/env.js";
import {
  requestEmailCode,
  verifyEmailCode,
  isEmailDeliveryConfigured,
  normalizeEmail,
  isDeliverableEmailShape,
  EmailCodeNotFoundError,
  EmailCodeExpiredError,
  EmailCodeAttemptsExceededError,
  EmailCodeRateLimitedError,
  EmailCodeDeliveryFailedError,
  EmailCodeInvalidError,
  EmailAlreadyRegisteredError,
} from "./email-verification.service.js";

/**
 * Email OTP verification — the onboarding channel.
 *
 * WHY THIS EXISTS
 * The signup flow proved control of the phone number over SMS. On a hosted
 * testing environment the SMS provider has no key, so `sendSms()` returns
 * `sent: false` and the first onboarding step fails for every new user. Email
 * is used for onboarding until SMS is configured, because `User.email` is
 * already the login identifier and the destination of every transactional mail
 * — proving it is a takeover-prevention control in its own right.
 *
 * The SMS phone codes are deliberately left alone. `User.phone` is the
 * Telebirr / M-Pesa payout destination and the withdrawal-approval code is
 * money; that flow is not weakened to make signup work.
 *
 * Both routes are deliberately UNAUTHENTICATED, because the first case is
 * registration: the code is sent and checked before the account exists. The
 * answer to "is this address already registered?" is never returned, because
 * that is an account-enumeration oracle.
 */

const EmailRequest = z.object({
  email: z.string().min(3).max(254),
});

const EmailVerify = z.object({
  email: z.string().min(3).max(254),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

/**
 * Per-IP limiter on top of the per-address throttling in the service. The
 * service stops one address being spammed; this stops one host rotating
 * through many addresses from the same address.
 */
const emailSendLimiter = rateLimit({
  scope: "email-verify-send",
  windowSec: 60 * 60,
  limit: 10,
});

const emailCheckLimiter = rateLimit({
  scope: "email-verify-check",
  windowSec: 15 * 60,
  limit: 20,
});

export function handleEmailVerificationError(
  err: unknown,
  res: Response,
): boolean {
  if (err instanceof EmailAlreadyRegisteredError) {
    res.status(409).json({ error: "EMAIL_IN_USE", message: err.message });
    return true;
  }
  if (err instanceof EmailCodeRateLimitedError) {
    res.status(429).json({ error: "RATE_LIMITED", message: err.message });
    return true;
  }
  if (err instanceof EmailCodeDeliveryFailedError) {
    res.status(503).json({ error: "EMAIL_UNAVAILABLE", message: err.message });
    return true;
  }
  if (err instanceof EmailCodeExpiredError) {
    res.status(410).json({ error: "CODE_EXPIRED", message: err.message });
    return true;
  }
  if (err instanceof EmailCodeAttemptsExceededError) {
    res.status(429).json({ error: "TOO_MANY_ATTEMPTS", message: err.message });
    return true;
  }
  if (
    err instanceof EmailCodeNotFoundError ||
    err instanceof EmailCodeInvalidError
  ) {
    // One status for "no such code" and "wrong code" so the endpoint cannot be
    // used to probe which addresses have an outstanding challenge.
    res.status(400).json({ error: "INVALID_CODE", message: err.message });
    return true;
  }
  return false;
}

export function registerEmailVerificationRoutes(router: Router): void {
  /**
   * Capability discovery.
   *
   * The onboarding UI has to know which channel can actually deliver before
   * it offers it: on a host with no SMTP credentials the email step would 503,
   * and on a host with no SMS key the phone step would 503. Returning
   * booleans derived from the configuration is the same shape as
   * `GET /auth/oauth/providers` and reveals nothing about any account.
   */
  router.get("/verification/channels", (_req: AuthedRequest, res: Response) => {
    return res.json({
      email: {
        available: isEmailDeliveryConfigured(),
        label: "Email",
      },
      phone: {
        // Available when SMS is configured, OR when the Telegram bot is
        // configured (Telegram fallback delivery), OR on a developer machine /
        // in the test suite where the code is handed back to the caller that
        // asked for it. This matches the same pattern that
        // isEmailDeliveryConfigured() uses for email.
        //
        // It used to include every non-production environment, which made a
        // publicly reachable staging host claim a phone channel it could not
        // deliver to anyone without a linked Telegram chat.
        available:
          Boolean(env.SMS_ETHIOPIA_API_KEY) ||
          Boolean(env.TELEGRAM_BOT_TOKEN) ||
          isDevCodeDisclosureAllowed(),
        label: env.SMS_ETHIOPIA_API_KEY
          ? "SMS"
          : env.TELEGRAM_BOT_TOKEN
            ? "Telegram"
            : "Phone",
      },
    });
  });

  router.post(
    "/email/code",
    emailSendLimiter,
    async (req: AuthedRequest, res: Response) => {
      const parsed = EmailRequest.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
      }
      try {
        const challenge = await requestEmailCode({
          email: parsed.data.email,
          userId: (req as AuthedRequest).user?.id ?? null,
          purposeLabel: "Confirm your email address",
        });
        // devCode is only ever present on a developer machine or in the test
        // suite. It used to be present on any non-production host, which put
        // the live code in the body of this response on the public staging
        // deployment. See `isDevCodeDisclosureAllowed` in config/env.ts.
        return res.json({
          sent: true,
          expiresAt: challenge.expiresAt,
          retryAfterSec: challenge.retryAfterSec,
          ...(challenge.devCode && isDevCodeDisclosureAllowed()
            ? { devCode: challenge.devCode }
            : {}),
        });
      } catch (err) {
        if (handleEmailVerificationError(err, res)) return;
        logger.error({ err }, "Failed to issue email verification code");
        return res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    },
  );

  router.post(
    "/email/verify",
    emailCheckLimiter,
    async (req: AuthedRequest, res: Response) => {
      const parsed = EmailVerify.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
      }
      try {
        await verifyEmailCode({
          email: parsed.data.email,
          code: parsed.data.code,
          userId: (req as AuthedRequest).user?.id ?? null,
        });
        return res.json({ verified: true });
      } catch (err) {
        if (handleEmailVerificationError(err, res)) return;
        logger.error({ err }, "Failed to verify email code");
        return res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    },
  );

  // -------------------------------------------------------------------------
  // Verifying the address ALREADY on the signed-in account.
  //
  // WHY A SECOND PAIR OF ROUTES
  // The two routes above are deliberately unauthenticated: they are the
  // onboarding pair, and they run before the account exists. They therefore
  // refuse an address that is already registered ("EMAIL_ALREADY_REGISTERED")
  // — correct for signup, but exactly wrong for a member who is already
  // signed in and simply has not proved the address on their own account yet.
  //
  // The pair below is the authenticated mirror of the same proof:
  //
  //   POST /auth/email/verification/start  → send a code to the account's own
  //                                          address, the member types it in.
  //   POST /auth/email/verification/check  → redeem the code and stamp
  //                                          `User.emailVerified`.
  //
  // NOTHING ELSE CHANGES. The address being verified is read from the
  // account, never from the request body: a member cannot ask for a code to
  // somebody else's inbox, and cannot redeem a code that was issued for a
  // different address. It is a proof of control of the address that is
  // already on file — the same claim, asked of the person who now holds the
  // account.
  // -------------------------------------------------------------------------

  router.post(
    "/email/verification/start",
    requireAuth,
    emailSendLimiter,
    async (req: AuthedRequest, res: Response) => {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, email: true, emailVerified: true },
      });
      if (!user) {
        return res.status(404).json({ error: "USER_NOT_FOUND" });
      }
      if (user.emailVerified) {
        return res.status(409).json({
          error: "EMAIL_ALREADY_VERIFIED",
          message: "This address is already verified.",
        });
      }
      const email = normalizeEmail(user.email);
      if (!isDeliverableEmailShape(email)) {
        // An account created from a federated sign-in or the Mini App can
        // carry a placeholder address. There is nothing to send a code to, and
        // saying so beats pretending a code was sent.
        return res.status(409).json({
          error: "EMAIL_NOT_USABLE",
          message: "This account has no usable email address to verify.",
        });
      }
      try {
        const challenge = await requestEmailCode({
          email,
          userId: user.id,
          purposeLabel: "Verify your Yekis email address",
        });
        return res.json({
          sent: true,
          email,
          expiresAt: challenge.expiresAt,
          retryAfterSec: challenge.retryAfterSec,
          ...(challenge.devCode && isDevCodeDisclosureAllowed()
            ? { devCode: challenge.devCode }
            : {}),
        });
      } catch (err) {
        if (handleEmailVerificationError(err, res)) return;
        logger.error({ err }, "Failed to issue account email verification code");
        return res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    },
  );

  router.post(
    "/email/verification/check",
    requireAuth,
    emailCheckLimiter,
    async (req: AuthedRequest, res: Response) => {
      const parsed = z
        .object({ code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code.") })
        .safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
      }
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, email: true, emailVerified: true },
      });
      if (!user) {
        return res.status(404).json({ error: "USER_NOT_FOUND" });
      }
      if (user.emailVerified) {
        // Nothing left to prove; the answer is the same one a second attempt
        // would have got.
        return res.json({ verified: true, email: user.email });
      }
      try {
        await verifyEmailCode({
          email: normalizeEmail(user.email),
          code: parsed.data.code,
          userId: user.id,
        });
        await recordAuditEvent({
          userId: user.id,
          eventType: "ACCOUNT_EMAIL_VERIFIED",
          entityType: "User",
          entityId: user.id,
          metadata: { via: "settings_linked_accounts" },
        });
        return res.json({ verified: true, email: user.email });
      } catch (err) {
        if (handleEmailVerificationError(err, res)) return;
        logger.error({ err }, "Failed to verify the account email code");
        return res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    },
  );
}
