// === IMPORTS ===
import type { Response, Router } from "express";
import { z } from "zod";
import { rateLimit } from "../../lib/rateLimit.js";
import type { AuthedRequest } from "../../middleware/auth.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";
import {
  requestEmailCode,
  verifyEmailCode,
  isEmailDeliveryConfigured,
  EmailCodeNotFoundError,
  EmailCodeExpiredError,
  EmailCodeAttemptsExceededError,
  EmailCodeRateLimitedError,
  EmailCodeDeliveryFailedError,
  EmailCodeInvalidError,
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
        // Available when SMS is configured, OR in non-production (devCode
        // path keeps the flow working), OR when the Telegram bot is
        // configured (Telegram fallback delivery). This matches the same
        // pattern that isEmailDeliveryConfigured() uses for email.
        available:
          Boolean(env.SMS_ETHIOPIA_API_KEY) ||
          env.NODE_ENV !== "production" ||
          Boolean(env.TELEGRAM_BOT_TOKEN),
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
        // devCode is stripped by the service in production, so this cannot leak
        // a live code even if a caller ignores that.
        return res.json({
          sent: true,
          expiresAt: challenge.expiresAt,
          retryAfterSec: challenge.retryAfterSec,
          ...(challenge.devCode && env.NODE_ENV !== "production"
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
}
