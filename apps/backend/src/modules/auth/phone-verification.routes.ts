// === IMPORTS ===
import type { Response } from "express";
import { z } from "zod";
import { rateLimit } from "../../lib/rateLimit.js";
import type { AuthedRequest } from "../../middleware/auth.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";
import { authRouter } from "./auth.routes.js";
import {
  requestPhoneCode,
  verifyPhoneCode,
  PhoneCodeNotFoundError,
  PhoneCodeExpiredError,
  PhoneCodeAttemptsExceededError,
  PhoneCodeRateLimitedError,
  PhoneCodeDeliveryFailedError,
  PhoneCodeInvalidError,
} from "./phone-verification.service.js";

/**
 * SMS phone verification.
 *
 * User.phone has always been collected, always been unique, accepted as a login
 * identifier and used as the payout destination for Telebirr and M-Pesa -- with
 * nothing ever proving the account holder owns it. This closes that.
 *
 * Both routes are deliberately UNAUTHENTICATED, because the first case is
 * registration: the code is sent and checked before the account exists. The
 * answer to "is this number already registered?" is never returned, because
 * that is an account-enumeration oracle.
 */

const PhoneRequest = z.object({
  phone: z.string().min(6).max(20),
});

const PhoneVerify = z.object({
  phone: z.string().min(6).max(20),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

/**
 * Per-IP limiter on top of the per-number throttling in the service. The
 * service stops one number being spammed; this stops one host rotating through
 * many numbers from the same address.
 */
const phoneSendLimiter = rateLimit({
  scope: "phone-verify-send",
  windowSec: 60 * 60,
  limit: 10,
});

const phoneCheckLimiter = rateLimit({
  scope: "phone-verify-check",
  windowSec: 15 * 60,
  limit: 20,
});

export function handlePhoneVerificationError(
  err: unknown,
  res: Response,
): boolean {
  if (err instanceof PhoneCodeRateLimitedError) {
    res.status(429).json({ error: "RATE_LIMITED", message: err.message });
    return true;
  }
  if (err instanceof PhoneCodeDeliveryFailedError) {
    res.status(503).json({ error: "SMS_UNAVAILABLE", message: err.message });
    return true;
  }
  if (err instanceof PhoneCodeExpiredError) {
    res.status(410).json({ error: "CODE_EXPIRED", message: err.message });
    return true;
  }
  if (err instanceof PhoneCodeAttemptsExceededError) {
    res.status(429).json({ error: "TOO_MANY_ATTEMPTS", message: err.message });
    return true;
  }
  if (
    err instanceof PhoneCodeNotFoundError ||
    err instanceof PhoneCodeInvalidError
  ) {
    // One status for "no such code" and "wrong code" so the endpoint cannot be
    // used to probe which numbers have an outstanding challenge.
    res.status(400).json({ error: "INVALID_CODE", message: err.message });
    return true;
  }
  return false;
}

function registerPhoneVerificationRoutes() {
  authRouter.post(
    "/phone/code",
    phoneSendLimiter,
    async (req: AuthedRequest, res: Response) => {
      const parsed = PhoneRequest.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
      }
      try {
        const challenge = await requestPhoneCode({
          phone: parsed.data.phone,
          userId: (req as AuthedRequest).user?.id ?? null,
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
        if (handlePhoneVerificationError(err, res)) return;
        logger.error({ err }, "Failed to issue phone verification code");
        return res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    },
  );

  authRouter.post(
    "/phone/verify",
    phoneCheckLimiter,
    async (req: AuthedRequest, res: Response) => {
      const parsed = PhoneVerify.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
      }
      try {
        await verifyPhoneCode({
          phone: parsed.data.phone,
          code: parsed.data.code,
          userId: (req as AuthedRequest).user?.id ?? null,
        });
        return res.json({ verified: true });
      } catch (err) {
        if (handlePhoneVerificationError(err, res)) return;
        logger.error({ err }, "Failed to verify phone code");
        return res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    },
  );
}
registerPhoneVerificationRoutes();
