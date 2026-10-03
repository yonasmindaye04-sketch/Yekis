// === IMPORTS ===
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { RegisterInput, LoginInput } from "@marketplace/schemas";
import {
  registerUser,
  loginUser,
  AgeRestrictionError,
  DuplicateUserError,
  InvalidCredentialsError,
  InvalidTokenError,
  requestPasswordReset,
  resetPassword,
  refreshSession,
} from "./auth.service.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import {
  loginWithTelegram,
  linkTelegramToUser,
  unlinkTelegramFromUser,
  TelegramAuthError,
  TelegramNotConfiguredError,
  TelegramAccountConflictError,
} from "./telegram.service.js";
import { AccountLinkRequiredError } from "./identity.js";
import {
  redeemTelegramLoginCode,
  TelegramCodeError,
} from "./telegram-code.service.js";
import {
  verifyGoogleIdToken,
  verifyAppleIdToken,
  verifyFacebookAccessToken,
  loginWithOAuthProfile,
  OAuthNotConfiguredError,
  OAuthVerificationError,
  getOAuthProviderAvailability,
} from "./oauth.service.js";
import { z } from "zod";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = RegisterInput.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }

  try {
    const user = await registerUser(parsed.data);
    return res.status(201).json({ id: user.id, ucid: user.ucid });
  } catch (err) {
    if (err instanceof AgeRestrictionError) {
      return res
        .status(403)
        .json({ error: "AGE_RESTRICTED", message: err.message });
    }
    if (err instanceof DuplicateUserError) {
      return res
        .status(409)
        .json({ error: "DUPLICATE_USER", message: err.message });
    }
    logger.error({ err }, "Unexpected error during registration");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = LoginInput.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }

  try {
    const result = await loginUser(parsed.data);
    return res.json(result);
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }
    logger.error({ err }, "Unexpected error during login");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.post("/telegram", async (req, res) => {
  let initData = "";
  if (typeof req.body?.initData === "string") {
    initData = req.body.initData;
  } else if (req.body && typeof req.body === "object" && req.body.hash) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(req.body)) {
      if (k !== "role" && v !== undefined && v !== null) {
        params.set(k, String(v));
      }
    }
    initData = params.toString();
  }
  const role = typeof req.body?.role === "string" ? req.body.role : undefined;
  if (!initData) return res.status(400).json({ error: "MISSING_INIT_DATA" });

  try {
    return res.json(await loginWithTelegram(initData, role));
  } catch (err) {
    if (err instanceof TelegramNotConfiguredError)
      return res
        .status(503)
        .json({ error: "TELEGRAM_NOT_CONFIGURED", message: err.message });
    if (err instanceof TelegramAuthError)
      return res
        .status(401)
        .json({ error: "TELEGRAM_AUTH_FAILED", message: err.message });
    if (err instanceof AccountLinkRequiredError)
      return res
        .status(409)
        .json({ error: "ACCOUNT_LINK_REQUIRED", message: err.message });
    logger.error({ err }, "Unexpected error during Telegram login");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// Binding Telegram to an account that already exists under a different
// identity (password signup, Google, Apple) cannot be done on an email match:
// Telegram discloses no email. It requires a live session for the account
// being linked PLUS a freshly signed Telegram credential.

const TelegramCredentialInput = z.object({ initData: z.string().min(1) });

authRouter.post("/telegram/link", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = TelegramCredentialInput.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }
  try {
    return res.json(await linkTelegramToUser(req.user!.id, parsed.data.initData));
  } catch (err) {
    if (err instanceof TelegramNotConfiguredError)
      return res
        .status(503)
        .json({ error: "TELEGRAM_NOT_CONFIGURED", message: err.message });
    if (err instanceof TelegramAuthError)
      return res
        .status(401)
        .json({ error: "TELEGRAM_AUTH_FAILED", message: err.message });
    if (err instanceof TelegramAccountConflictError)
      return res
        .status(409)
        .json({ error: "TELEGRAM_ALREADY_LINKED", message: err.message });
    logger.error({ err }, "Unexpected error while linking Telegram account");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.delete("/telegram/link", requireAuth, async (req: AuthedRequest, res) => {
  try {
    return res.json(await unlinkTelegramFromUser(req.user!.id));
  } catch (err) {
    logger.error({ err }, "Unexpected error while unlinking Telegram account");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// Redeems the one-time code the bot mints via /login. This is the path that
// works when the Login Widget cannot render — the domain is not registered
// with @BotFather, or telegram.org is blocked by the network/ad blocker.
//
// The code is a bearer credential, so this endpoint is rate limited far more
// tightly than the generic /api limiter: 10 attempts per 15 minutes. Codes are
// single-use, expire in 10 minutes, and only their SHA-256 is stored, so the
// attempt budget is comfortably above legitimate typo rates while keeping a
// brute force infeasible (32^8 ≈ 1.1e12 candidates).
const telegramCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "TOO_MANY_ATTEMPTS",
    message: "Too many code attempts. Send /login to the bot for a fresh code.",
  },
});

authRouter.post("/telegram/code", telegramCodeLimiter, async (req, res) => {
  const parsed = z
    .object({ code: z.string().min(4).max(32) })
    .safeParse(req.body);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }

  try {
    return res.json(await redeemTelegramLoginCode(parsed.data.code));
  } catch (err) {
    if (err instanceof TelegramCodeError) {
      return res.status(401).json({ error: "INVALID_CODE", message: err.message });
    }
    logger.error({ err }, "Unexpected error redeeming Telegram login code");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// NOTE: A previous "/google" endpoint accepted a bare email and issued full
// JWTs without verifying any Google credential — an authentication bypass.
// It was removed. Reintroduce Google sign-in ONLY behind real ID-token
// verification (e.g. google-auth-library verifying the id_token against
// Google's JWKS), never on client-supplied profile fields.

// ---------- Social sign-in (real provider verification) ----------
// Each endpoint takes the provider-issued credential and verifies it
// server-side before any account access. Unconfigured providers return
// 503 NOT_CONFIGURED - there is deliberately no unverified fallback.

authRouter.get("/oauth/providers", (_req, res) => {
  return res.json(getOAuthProviderAvailability());
});

authRouter.post("/oauth/google", async (req, res) => {
  const parsed = z
    .object({
      idToken: z.string().min(20),
      role: z.enum(["CLIENT", "FREELANCER"]).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }
  try {
    const profile = await verifyGoogleIdToken(parsed.data.idToken);
    const result = await loginWithOAuthProfile(profile, parsed.data.role);
    return res.json(result);
  } catch (err) {
    if (err instanceof OAuthNotConfiguredError) {
      return res
        .status(503)
        .json({ error: "NOT_CONFIGURED", message: err.message });
    }
    if (err instanceof OAuthVerificationError) {
      return res
        .status(401)
        .json({ error: "OAUTH_VERIFICATION_FAILED", message: err.message });
    }
    if (err instanceof AccountLinkRequiredError) {
      return res
        .status(409)
        .json({ error: "ACCOUNT_LINK_REQUIRED", message: err.message });
    }
    logger.error({ err }, "Unexpected error during Google OAuth login");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.post("/oauth/apple", async (req, res) => {
  const parsed = z
    .object({
      idToken: z.string().min(20),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      role: z.enum(["CLIENT", "FREELANCER"]).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }
  try {
    const profile = await verifyAppleIdToken(parsed.data.idToken);
    if (parsed.data.firstName) {
      profile.name = [parsed.data.firstName, parsed.data.lastName]
        .filter(Boolean)
        .join(" ");
    }
    const result = await loginWithOAuthProfile(profile, parsed.data.role);
    return res.json(result);
  } catch (err) {
    if (err instanceof OAuthNotConfiguredError) {
      return res
        .status(503)
        .json({ error: "NOT_CONFIGURED", message: err.message });
    }
    if (err instanceof OAuthVerificationError) {
      return res
        .status(401)
        .json({ error: "OAUTH_VERIFICATION_FAILED", message: err.message });
    }
    if (err instanceof AccountLinkRequiredError) {
      return res
        .status(409)
        .json({ error: "ACCOUNT_LINK_REQUIRED", message: err.message });
    }
    logger.error({ err }, "Unexpected error during Apple OAuth login");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.post("/oauth/facebook", async (req, res) => {
  const parsed = z
    .object({ accessToken: z.string().min(10) })
    .safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }
  try {
    const profile = await verifyFacebookAccessToken(parsed.data.accessToken);
    const result = await loginWithOAuthProfile(profile);
    return res.json(result);
  } catch (err) {
    if (err instanceof OAuthNotConfiguredError) {
      return res
        .status(503)
        .json({ error: "NOT_CONFIGURED", message: err.message });
    }
    if (err instanceof OAuthVerificationError) {
      return res
        .status(401)
        .json({ error: "OAUTH_VERIFICATION_FAILED", message: err.message });
    }
    if (err instanceof AccountLinkRequiredError) {
      return res
        .status(409)
        .json({ error: "ACCOUNT_LINK_REQUIRED", message: err.message });
    }
    logger.error({ err }, "Unexpected error during Facebook OAuth login");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.post("/reset-password-request", async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }

  try {
    await requestPasswordReset(parsed.data.email);
    // Always return success to prevent email enumeration
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Unexpected error during password reset request");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.post("/reset-password", async (req, res) => {
  const parsed = z
    .object({ token: z.string(), newPassword: z.string().min(10) })
    .safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }

  try {
    await resetPassword(parsed.data.token, parsed.data.newPassword);
    return res.json({ success: true });
  } catch (err) {
    if (err instanceof InvalidTokenError) {
      return res
        .status(400)
        .json({ error: "INVALID_TOKEN", message: err.message });
    }
    logger.error({ err }, "Unexpected error during password reset");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/**
 * Exchanges a valid refresh token for a fresh access/refresh pair.
 * This endpoint is the reason sessions can outlive the short access-token TTL:
 * previously the refresh token was issued at login but had no consumer, so
 * every user was silently logged out every JWT_ACCESS_TTL (default 15m).
 */
authRouter.post("/refresh", async (req, res) => {
  const parsed = z
    .object({ refreshToken: z.string().min(20) })
    .safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }
  try {
    const result = await refreshSession(parsed.data.refreshToken);
    return res.json(result);
  } catch (err) {
    if (err instanceof InvalidTokenError) {
      return res
        .status(401)
        .json({ error: "INVALID_REFRESH_TOKEN", message: err.message });
    }
    logger.error({ err }, "Unexpected error during session refresh");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      ucid: true,
      email: true,
      phone: true,
      role: true,
      staffRole: true,
      languagePreference: true,
      kyc: { select: { tier: true, status: true } },
      wallet: { select: { balanceMinor: true } },
    },
  });
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });
  return res.json(user);
});
