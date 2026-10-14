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
import { env } from "../../config/env.js";
import { requireAuth, requireFreshAuth, type AuthedRequest } from "../../middleware/auth.js";
import {
  loginWithTelegram,
  resolveOrProvisionTelegramUser,
  registerTelegramUser,
  buildAuthResponse,
  linkTelegramToUser,
  unlinkTelegramFromUser,
  TelegramAuthError,
  TelegramNotConfiguredError,
  TelegramAccountConflictError,
} from "./telegram.service.js";
import type { AuthMethod } from "./auth-methods.js";
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

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_REGISTRATIONS" },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_LOGIN_ATTEMPTS" },
});

const passwordResetRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_RESET_REQUESTS" },
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_RESET_ATTEMPTS" },
});

authRouter.post("/register", registrationLimiter, async (req, res) => {
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

authRouter.post("/login", loginLimiter, async (req, res) => {
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

import {
  verifyMiniAppInitData,
  verifyLoginWidget,
  NeedsOnboardingError,
  AuthError,
} from "./telegram.service.js";

/**
 * LEGACY compatibility entry point. Retained because the frontend's
 * `loginWithTelegram()` still posts here from both the Mini App shell
 * (`initData` string) and the Login Widget (flat object). New work goes to
 * /telegram/miniapp, /telegram/widget or /telegram/web-login.
 *
 * The verifier is chosen by payload SHAPE — a URL-encoded string is Mini App
 * initData, a flat object is a Login Widget payload. Never try one and fall
 * back to the other: a payload that fails its own scheme's check must be
 * rejected, not retried against the other algorithm.
 */
authRouter.post("/telegram", async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ error: "MISSING_PAYLOAD" });
  }
  if (!env.TELEGRAM_BOT_TOKEN) {
    return res.status(503).json({ error: "TELEGRAM_NOT_CONFIGURED" });
  }

  try {
    let telegram;
    let method: AuthMethod;
    if (typeof payload.initData === "string") {
      telegram = verifyMiniAppInitData(
        payload.initData,
        env.TELEGRAM_BOT_TOKEN,
        env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS,
      );
      method = "tg_miniapp";
    } else if (payload.hash) {
      telegram = verifyLoginWidget(payload, env.TELEGRAM_BOT_TOKEN);
      method = "tg_widget";
    } else {
      return res.status(400).json({ error: "INVALID_PAYLOAD" });
    }

    // `role` is honoured ONLY when provisioning a brand-new account; an
    // existing member's role is never rewritten from a client-supplied value.
    const user = await resolveOrProvisionTelegramUser(telegram, {
      role: payload.role,
    });
    return res.json(await buildAuthResponse(user, telegram, method));
  } catch (err) {
    if (err instanceof AccountLinkRequiredError) {
      return res.status(409).json({ error: "ACCOUNT_LINK_REQUIRED", message: err.message });
    }
    if (err instanceof AuthError) {
      return res.status(401).json({ error: "TELEGRAM_AUTH_FAILED", message: err.message });
    }
    logger.error({ err }, "Unexpected error during Telegram login");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.post("/telegram/miniapp", async (req, res) => {
  const { initData } = req.body;
  if (!initData || typeof initData !== "string") return res.status(400).json({ error: "MISSING_INIT_DATA" });
  if (!env.TELEGRAM_BOT_TOKEN) return res.status(503).json({ error: "TELEGRAM_NOT_CONFIGURED" });

  try {
    const telegram = verifyMiniAppInitData(initData, env.TELEGRAM_BOT_TOKEN);
    return res.json(await loginWithTelegram(telegram));
  } catch (err) {
    if (err instanceof NeedsOnboardingError) return res.status(409).json({ error: "NEEDS_ONBOARDING", message: err.message });
    if (err instanceof AuthError) return res.status(401).json({ error: "TELEGRAM_AUTH_FAILED", message: err.message });
    if (err instanceof AccountLinkRequiredError) return res.status(409).json({ error: "ACCOUNT_LINK_REQUIRED", message: err.message });
    logger.error({ err }, "Unexpected error during Mini App login");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.post("/telegram/miniapp/register", async (req, res) => {
  const { initData, role, termsVersion } = req.body;
  if (!initData || typeof initData !== "string") return res.status(400).json({ error: "MISSING_INIT_DATA" });
  if (!role || (role !== "CLIENT" && role !== "FREELANCER")) return res.status(400).json({ error: "INVALID_ROLE" });
  if (!env.TELEGRAM_BOT_TOKEN) return res.status(503).json({ error: "TELEGRAM_NOT_CONFIGURED" });

  try {
    const telegram = verifyMiniAppInitData(initData, env.TELEGRAM_BOT_TOKEN, 600); // 10 min max age for registration
    return res.json(await registerTelegramUser(telegram, role));
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: "TELEGRAM_AUTH_FAILED", message: err.message });
    logger.error({ err }, "Unexpected error during Mini App registration");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.post("/telegram/widget", async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object" || !payload.hash) return res.status(400).json({ error: "MISSING_WIDGET_DATA" });
  if (!env.TELEGRAM_BOT_TOKEN) return res.status(503).json({ error: "TELEGRAM_NOT_CONFIGURED" });

  try {
    const telegram = verifyLoginWidget(payload, env.TELEGRAM_BOT_TOKEN);
    return res.json(await loginWithTelegram(telegram, "tg_widget"));
  } catch (err) {
    if (err instanceof NeedsOnboardingError) return res.status(409).json({ error: "NEEDS_ONBOARDING", message: err.message });
    if (err instanceof AuthError) return res.status(401).json({ error: "TELEGRAM_AUTH_FAILED", message: err.message });
    if (err instanceof AccountLinkRequiredError) return res.status(409).json({ error: "ACCOUNT_LINK_REQUIRED", message: err.message });
    logger.error({ err }, "Unexpected error during Telegram widget login");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.post("/telegram/link", requireAuth, requireFreshAuth(300), async (req: AuthedRequest, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object") return res.status(400).json({ error: "MISSING_PAYLOAD" });
  if (!env.TELEGRAM_BOT_TOKEN) return res.status(503).json({ error: "TELEGRAM_NOT_CONFIGURED" });

  try {
    let telegram;
    if (payload.initData) {
      telegram = verifyMiniAppInitData(payload.initData, env.TELEGRAM_BOT_TOKEN, 300);
    } else if (payload.hash) {
      telegram = verifyLoginWidget(payload, env.TELEGRAM_BOT_TOKEN, 300);
    } else {
      return res.status(400).json({ error: "INVALID_PAYLOAD" });
    }
    
    return res.json(await linkTelegramToUser(req.user!.id, telegram));
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: "TELEGRAM_AUTH_FAILED", message: err.message });
    if (err instanceof TelegramAccountConflictError) return res.status(409).json({ error: "TELEGRAM_ALREADY_LINKED", message: err.message });
    logger.error({ err }, "Unexpected error while linking Telegram account");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.delete("/telegram/link", requireAuth, requireFreshAuth(300), async (req: AuthedRequest, res) => {
  // Enforce that Telegram isn't the ONLY credential before unlinking
  const userDetails = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { passwordSetAt: true, email: true, emailVerified: true } });
  const hasOtherCredential = !!userDetails?.passwordSetAt || !!userDetails?.emailVerified;
  if (!hasOtherCredential) {
    return res.status(400).json({ error: "CANNOT_UNLINK_ONLY_CREDENTIAL", message: "Set a password or verify your email before unlinking Telegram." });
  }

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

/**
 * Redeems the one-time code the bot mints via /login. Legacy path, kept alive
 * until the PKCE web-login flow is proven; see telegram-code.service.ts.
 */
authRouter.post("/telegram/code", telegramCodeLimiter, async (req, res) => {
  const parsed = z.object({ code: z.string().min(1).max(64) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR" });
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

import { startWebLogin, getWebLoginStatus, redeemWebLogin } from "./telegram-code.service.js";

authRouter.post("/telegram/web-login/start", telegramCodeLimiter, async (req, res) => {
  const parsed = z.object({ challenge: z.string().min(20).max(100) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

  try {
    return res.json(await startWebLogin(parsed.data.challenge, req.ip || "0.0.0.0", req.get("User-Agent") || "Unknown"));
  } catch (err) {
    logger.error({ err }, "Error starting web login");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.get("/telegram/web-login/:sid/status", async (req, res) => {
  const sid = req.params.sid;
  if (!sid) return res.status(400).json({ error: "MISSING_SID" });
  try {
    return res.json(await getWebLoginStatus(sid));
  } catch (err) {
    logger.error({ err }, "Error getting web login status");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.post("/telegram/web-login/redeem", telegramCodeLimiter, async (req, res) => {
  const parsed = z.object({ sid: z.string().min(10), verifier: z.string().min(20).max(200) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

  try {
    return res.json(await redeemWebLogin(parsed.data.sid, parsed.data.verifier));
  } catch (err: any) {
    if (err.name === "AuthError") return res.status(401).json({ error: "AUTH_FAILED", message: err.message });
    logger.error({ err }, "Error redeeming web login");
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

authRouter.post("/reset-password-request", passwordResetRequestLimiter, async (req, res) => {
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

authRouter.post("/reset-password", passwordResetLimiter, async (req, res) => {
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

// Mounts POST /auth/phone/code and /auth/phone/verify onto authRouter.
//
// Two bugs fixed here at once, both caught by tests/e2e-app.test.ts.
//
// 1. The module was never imported, so its self-registration never ran and both
//    endpoints 404'd in production -- while the service, the unit tests and the
//    commit that added them all reported success. The unit tests called the
//    service module directly and could not have seen it.
// 2. Importing it for a side effect while it imports authRouter back created a
//    cycle, and the registration then ran before authRouter was initialised
//    ("Cannot read properties of undefined"). The router is therefore passed in
//    explicitly rather than imported, which breaks the cycle by construction.
import { registerPhoneVerificationRoutes } from "./phone-verification.routes.js";
registerPhoneVerificationRoutes(authRouter);