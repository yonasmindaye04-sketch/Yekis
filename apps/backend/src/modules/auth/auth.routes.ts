// === IMPORTS ===
import { Router } from "express";
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
} from "./auth.service.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { loginWithTelegram, TelegramAuthError, TelegramNotConfiguredError } from "./telegram.service.js";
import { z } from "zod";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = RegisterInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }

  try {
    const user = await registerUser(parsed.data);
    return res.status(201).json({ id: user.id, ucid: user.ucid });
  } catch (err) {
    if (err instanceof AgeRestrictionError) {
      return res.status(403).json({ error: "AGE_RESTRICTED", message: err.message });
    }
    if (err instanceof DuplicateUserError) {
      return res.status(409).json({ error: "DUPLICATE_USER", message: err.message });
    }
    logger.error({ err }, "Unexpected error during registration");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = LoginInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
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
  const initData = typeof req.body?.initData === "string" ? req.body.initData : "";
  const role = typeof req.body?.role === "string" ? req.body.role : undefined;
  if (!initData) return res.status(400).json({ error: "MISSING_INIT_DATA" });

  try {
    return res.json(await loginWithTelegram(initData, role));
  } catch (err) {
    if (err instanceof TelegramNotConfiguredError) return res.status(503).json({ error: "TELEGRAM_NOT_CONFIGURED", message: err.message });
    if (err instanceof TelegramAuthError) return res.status(401).json({ error: "TELEGRAM_AUTH_FAILED", message: err.message });
    logger.error({ err }, "Unexpected error during Telegram login");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.post("/reset-password-request", async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
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
  const parsed = z.object({ token: z.string(), newPassword: z.string().min(10) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
  }

  try {
    await resetPassword(parsed.data.token, parsed.data.newPassword);
    return res.json({ success: true });
  } catch (err) {
    if (err instanceof InvalidTokenError) {
      return res.status(400).json({ error: "INVALID_TOKEN", message: err.message });
    }
    logger.error({ err }, "Unexpected error during password reset");
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, ucid: true, email: true, phone: true, role: true, staffRole: true, languagePreference: true,
      kyc: { select: { tier: true, status: true } },
      wallet: { select: { balanceMinor: true } },
    },
  });
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });
  return res.json(user);
});
