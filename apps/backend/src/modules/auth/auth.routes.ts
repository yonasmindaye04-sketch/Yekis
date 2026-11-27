// === IMPORTS ===
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { RegisterInput, LoginInput } from "../../schemas";
import {
  registerUser,
  loginUser,
  AgeRestrictionError,
  DuplicateUserError,
  PhoneInUseError,
  InvalidCredentialsError,
  InvalidTokenError,
  requestPasswordReset,
  resetPassword,
  refreshSession,
  logoutSession,
  changePassword,
  revokeOtherSessionsAndRefresh,
  switchUserRole,
  createAuthTokens,
  PasswordMismatchError,
  reauthenticateUser,
  NoPasswordSetError,
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
  startTelegramLink,
  getTelegramLinkStatus,
  TelegramCodeError,
  TelegramLinkError,
} from "./telegram-code.service.js";
import {
  verifyGoogleIdToken,
  verifyAppleIdToken,
  verifyFacebookAccessToken,
  loginWithOAuthProfile,
  linkGoogleToUser,
  unlinkGoogleFromUser,
  OAuthNotConfiguredError,
  OAuthVerificationError,
  OAuthLinkConflictError,
  OAuthEmailMismatchError,
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

/**
 * Limits for the remaining unauthenticated credential endpoints.
 *
 * /register, /login and the reset routes already had their own limiters, which
 * left the rest of the unauthenticated surface with only the shared per-IP API
 * limiter in app.ts â€” 2000 requests per 15 minutes, which is an availability
 * budget, not an abuse control.
 *
 * These are the endpoints where an unauthenticated caller causes real work:
 *   - /oauth/* verifies a provider-signed idToken over the network on every
 *     request, so it is an amplification vector against us and the provider.
 *   - /telegram* and /telegram/miniapp* mint a session from an HMAC-verified
 *     payload; a flood is a flood of account/session creation.
 *   - /refresh is called by every client, so its budget is generous, but
 *     without a limit a stolen refresh token can be ground against the store.
 *
 * Thresholds are deliberately generous relative to real traffic. These exist to
 * stop a flood, not to inconvenience a user who refreshes a few times.
 */
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_OAUTH_ATTEMPTS" },
});

const telegramLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_TELEGRAM_LOGIN_ATTEMPTS" },
});

// Account creation from the Mini App, so tighter than plain sign-in.
const telegramRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_REGISTRATIONS" },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_REFRESH_ATTEMPTS" },
});

authRouter.post("/register", registrationLimiter, async (req, res) => {
  const parsed = RegisterInput.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }

  // Registration must not answer the question "does this email/phone already
  // exist?" New and duplicate requests therefore return the same 202 body.
  // The client signs in afterwards; a wrong password fails exactly like any
  // other login and does not reveal whether the account was just created.
  const accepted = {
    ok: true,
    message: "If these details are valid, you can sign in to continue.",
  } as const;

  try {
    await registerUser(parsed.data);
    return res.status(202).json(accepted);
  } catch (err) {
    if (err instanceof AgeRestrictionError) {
      return res
        .status(403)
        .json({ error: "AGE_RESTRICTED", message: err.message });
    }
    if (err instanceof DuplicateUserError) {
      return res.status(409).json({
        error: "EMAIL_IN_USE",
        message:
          "An account with this email already exists. Please sign in instead.",
      });
    }
    if (err instanceof PhoneInUseError) {
      // The number is on file and the address is not, so no account can be
      // created for this registration. Answering 202 here is what made the
      // signup a dead end: the person was told to sign in with an address
      // that had no account. This says what is true and names the action.
      return res.status(409).json({
        error: "PHONE_IN_USE",
        message:
          "That phone number is already registered to another account. " +
          "Use a different number, or sign in to the account that has it.",
      });
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
      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Invalid email/phone or password. Please check your credentials and try again.",
      });
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
 * The verifier is chosen by payload SHAPE â€” a URL-encoded string is Mini App
 * initData, a flat object is a Login Widget payload. Never try one and fall
 * back to the other: a payload that fails its own scheme's check must be
 * rejected, not retried against the other algorithm.
 */
authRouter.post("/telegram", telegramLoginLimiter, async (req, res) => {
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

authRouter.post("/telegram/miniapp", telegramLoginLimiter, async (req, res) => {
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

authRouter.post("/telegram/miniapp/register", telegramRegisterLimiter, async (req, res) => {
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

authRouter.post("/telegram/widget", telegramLoginLimiter, async (req, res) => {
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
// works when the Login Widget cannot render â€” the domain is not registered
// with @BotFather, or telegram.org is blocked by the network/ad blocker.
//
// The code is a bearer credential, so this endpoint is rate limited far more
// tightly than the generic /api limiter: 10 attempts per 15 minutes. Codes are
// single-use, expire in 10 minutes, and only their SHA-256 is stored, so the
// attempt budget is comfortably above legitimate typo rates while keeping a
// brute force infeasible (32^8 â‰ˆ 1.1e12 candidates).
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

// ---------------------------------------------------------------------------
// Settings → "Connect Telegram" deep-link flow.
//
// Shape mirrors `/telegram/web-login/*`: the authed web member gets a fresh
// session id; the bot, when it sees `/start lk_{sid}`, calls
// `completeTelegramLink` to bind the Telegram chat to the account; the
// dashboard polls `/telegram/link/:sid/status` until the status flips.
//
// The endpoints here are guarded by requireAuth (the member IS already
// signed in to the dashboard). requireFreshAuth is intentionally NOT mounted
// because the user's existing session is sufficient — this is a "stub a
// second way in" action, not a destructive state change.
// ---------------------------------------------------------------------------

authRouter.post(
  "/telegram/link/start",
  requireAuth,
  telegramCodeLimiter,
  async (req: AuthedRequest, res) => {
    try {
      const result = await startTelegramLink(req.user!.id);
      return res.json(result);
    } catch (err) {
      if (err instanceof TelegramLinkError && err.message === "TELEGRAM_NOT_CONFIGURED") {
        return res.status(503).json({ error: "TELEGRAM_NOT_CONFIGURED" });
      }
      logger.error({ err }, "Error starting telegram link flow");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

authRouter.get(
  "/telegram/link/:sid/status",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const sid = String(req.params.sid || "");
    if (sid.length < 10 || sid.length > 80) {
      return res.status(400).json({ error: "INVALID_SID" });
    }
    try {
      return res.json(await getTelegramLinkStatus(req.user!.id, sid));
    } catch (err) {
      logger.error({ err }, "Error reading telegram link status");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

// NOTE: A previous "/google" endpoint accepted a bare email and issued full
// JWTs without verifying any Google credential â€” an authentication bypass.
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

authRouter.post("/oauth/google", oauthLimiter, async (req, res) => {
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

/**
 * Links a Google credential to the account of a member who is ALREADY signed
 * in.
 *
 * This is the answer to `409 ACCOUNT_LINK_REQUIRED`. A member whose account
 * owns a password is never merged into by a Google sign-in — the address is
 * only a label, and matching it would be an account-takeover primitive — so
 * they sign in with their password first and attach Google here, from the
 * Account security screen.
 *
 * The session must be FRESH and STRONG (`requireFreshAuth`): linking changes
 * how a member gets into their account, so it must not be reachable from a
 * session opened with a weak factor or left open for hours. The Google
 * credential is verified against Google's JWKS before anything is written, and
 * the service refuses an address that is not the account's own.
 */
authRouter.post(
  "/oauth/google/link",
  requireAuth,
  requireFreshAuth(300),
  oauthLimiter,
  async (req: AuthedRequest, res) => {
    const parsed = z
      .object({ idToken: z.string().min(20) })
      .safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }

    try {
      const profile = await verifyGoogleIdToken(parsed.data.idToken);
      return res.json(await linkGoogleToUser(req.user!.id, profile));
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
      if (err instanceof OAuthEmailMismatchError) {
        return res
          .status(409)
          .json({ error: "EMAIL_MISMATCH", message: err.message });
      }
      if (err instanceof OAuthLinkConflictError) {
        return res
          .status(409)
          .json({ error: "PROVIDER_LINK_CONFLICT", message: err.message });
      }
      logger.error({ err }, "Unexpected error while linking Google account");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

/**
 * Removes the Google credential from the signed-in member's account. The
 * service refuses when Google would be the last way into the account (the
 * last-method guard, F-10 / S-12).
 */
authRouter.delete(
  "/oauth/google/link",
  requireAuth,
  requireFreshAuth(300),
  async (req: AuthedRequest, res) => {
    try {
      return res.json(await unlinkGoogleFromUser(req.user!.id));
    } catch (err) {
      if (err instanceof OAuthLinkConflictError) {
        return res
          .status(409)
          .json({ error: "LAST_CREDENTIAL", message: err.message });
      }
      logger.error({ err }, "Unexpected error while unlinking Google account");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

authRouter.post("/oauth/apple", oauthLimiter, async (req, res) => {
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

authRouter.post("/oauth/facebook", oauthLimiter, async (req, res) => {
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
authRouter.post("/refresh", refreshLimiter, async (req, res) => {
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

authRouter.post("/logout", requireAuth, async (req: AuthedRequest, res) => {
  // Until this existed, "log out" was a client-side deletion of two
  // localStorage keys. The tokens themselves stayed valid until they expired,
  // so a token lifted from the machine â€” or from a shared browser's history â€”
  // kept working for the remaining JWT_REFRESH_TTL (default 30 days). Bumping
  // sessionVersion is what actually ends the session server-side.
  await logoutSession(req.user!.id);
  return res.status(200).json({ success: true });
});

authRouter.post(
  "/reauth",
  requireAuth,
  loginLimiter,
  async (req: AuthedRequest, res) => {
    const parsed = z
      .object({ password: z.string().min(1) })
      .safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
    }
    try {
      const result = await reauthenticateUser(
        req.user!.id,
        parsed.data.password,
      );
      return res.json(result);
    } catch (err) {
      if (err instanceof NoPasswordSetError) {
        return res
          .status(403)
          .json({ error: "STEP_UP_REQUIRED", message: err.message });
      }
      if (err instanceof InvalidCredentialsError) {
        return res.status(401).json({
          error: "INVALID_CREDENTIALS",
          message: "Incorrect password. Your current session remains active.",
        });
      }
      logger.error({ err }, "Unexpected error during reauthentication");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

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
      firstName: true,
      lastName: true,
      displayName: true,
      avatarUrl: true,
      profileCompleteness: true,
      kyc: { select: { tier: true, status: true } },
      wallet: { select: { balanceMinor: true } },
    },
  });
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });
  return res.json(user);
});

/**
 * What this account can sign in with — the first thing a support agent asks
 * and the thing the Account security screen renders.
 *
 * BOOLEANS ONLY. The provider ids themselves are never sent to the browser:
 * they are the handle a member is impersonated by at Google or Telegram, so a
 * leaked response must not carry them. "Linked" is all the screen needs.
 */
authRouter.get("/identities", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      email: true,
      emailVerified: true,
      passwordSetAt: true,
      googleId: true,
      appleId: true,
      facebookId: true,
      telegramUserId: true,
      phoneVerifiedAt: true,
    },
  });
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });

  return res.json({
    email: user.email,
    emailVerified: user.emailVerified,
    passwordSet: user.passwordSetAt !== null,
    google: user.googleId !== null,
    apple: user.appleId !== null,
    facebook: user.facebookId !== null,
    telegram: user.telegramUserId !== null,
    phoneVerified: user.phoneVerifiedAt !== null,
  });
});

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_PASSWORD_CHANGE_ATTEMPTS" },
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
  revokeOtherSessions: z.boolean().optional().default(true),
});

authRouter.post(
  "/change-password",
  requireAuth,
  changePasswordLimiter,
  async (req: AuthedRequest, res) => {
    try {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "VALIDATION_FAILED", details: parsed.error.issues });
      }

      const { currentPassword, newPassword, revokeOtherSessions } = parsed.data;
      const result = await changePassword(
        req.user!.id,
        currentPassword,
        newPassword,
        revokeOtherSessions,
      );

      return res.json({
        ok: true,
        message: "Password changed successfully",
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (err) {
      if (err instanceof PasswordMismatchError) {
        return res
          .status(400)
          .json({ error: "PASSWORD_MISMATCH", message: err.message });
      }
      if (err instanceof Error) {
        return res
          .status(400)
          .json({ error: "PASSWORD_CHANGE_FAILED", message: err.message });
      }
      logger.error({ err }, "Unexpected error in /change-password");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

authRouter.post(
  "/revoke-sessions",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const result = await revokeOtherSessionsAndRefresh(req.user!.id);
      return res.json({
        ok: true,
        message: "All other sessions revoked successfully",
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (err) {
      logger.error({ err }, "Unexpected error in /revoke-sessions");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

/**
 * Switches the caller's account type (CLIENT / FREELANCER / BOTH).
 *
 * A member who signed up as a client because they had one job to post should not
 * have to abandon the account to take work the next month. The same row is
 * used; only `User.role` changes. The route is mounted behind
 * `requireFreshAuth(180)` so a tab left open on a shared machine cannot change
 * the account type in passing.
 *
 * Returns a fresh access/refresh pair stamped with the new role, so the very
 * next request reads the right value from the JWT. Historical contracts and
 * jobs are NOT moved between roles — they keep the role the member held when
 * they were created.
 */
const switchRoleLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_ROLE_CHANGES", message: "Too many role changes. Try again later." },
});

const switchRoleSchema = z.object({
  role: z.enum(["CLIENT", "FREELANCER", "BOTH"]),
});

authRouter.post(
  "/role",
  requireAuth,
  requireFreshAuth(180),
  switchRoleLimiter,
  async (req: AuthedRequest, res) => {
    try {
      const parsed = switchRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
      }
      const { role } = parsed.data;

      // One read covers both branches (no-op vs actual switch) and stamps the
      // new role on the JWT no matter what path we took.
      const before = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { role: true, ucid: true, staffRole: true, isSuspended: true },
      });
      if (!before) return res.status(404).json({ error: "USER_NOT_FOUND" });
      if (before.isSuspended) {
        return res.status(403).json({ error: "ACCOUNT_SUSPENDED" });
      }

      const { from, to } = await switchUserRole(req.user!.id, role);

      // Re-mint tokens so the very next call already reads the new role from
      // the JWT. No sessionVersion bump: it's the same session, just a new tag
      // for what it is allowed to do.
      //
      // The credential event is CARRIED OVER, not re-created. Minting with a
      // fresh `auth_time` and a hard-coded `["pwd"]` would hand a stolen
      // session token a brand-new "strong, recent" window the moment the role
      // changed — which is exactly what the step-up gate exists to prevent.
      // Carrying `auth_time`, `amr` and the session start keeps the new token
      // exactly as fresh (and as strong) as the one that was presented.
      const carriedAmr = (req.auth?.amr ?? []) as AuthMethod[];
      const tokens = await createAuthTokens(
        {
          id: req.user!.id,
          role: to,
          ucid: before.ucid,
          staffRole: before.staffRole,
        },
        carriedAmr,
        {
          authTime: req.auth?.auth_time,
          sessionIat: req.auth?.iat,
        },
      );
      return res.json({
        role: to,
        from,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (err) {
      logger.error({ err }, "Unexpected error in /role");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  },
);

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

// Mounts POST /auth/email/code, POST /auth/email/verify and
// GET /auth/verification/channels onto authRouter.
//
// The email channel is the onboarding OTP: the SMS provider has no key on a
// hosted testing environment, so the signup step could not be completed at
// all. The phone routes above are untouched — they are the money-safety
// control on the payout number and on withdrawal approval.
//
// The router is passed in explicitly rather than imported, which breaks the
// import cycle by construction (the same reason the phone routes do it).
import { registerEmailVerificationRoutes } from "./email-verification.routes.js";
registerEmailVerificationRoutes(authRouter);