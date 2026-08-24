// === IMPORTS ===
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { createAuthTokens } from "./auth.service.js";

const TelegramUser = z.object({
  id: z.number().int().positive(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
  photo_url: z.string().url().optional(),
});


// === MAIN FUNCTIONS ===
export class TelegramAuthError extends Error {}
export class TelegramNotConfiguredError extends Error {}


// === INTERFACES & TYPES ===
export type TelegramUser = z.infer<typeof TelegramUser>;

function buildDataCheckString(params: URLSearchParams) {
  return [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function verifyTelegramHash(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    throw new TelegramAuthError("Telegram initData is missing hash.");
  }

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const dataCheckString = buildDataCheckString(params);
  const calculatedHash = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  const received = Buffer.from(hash, "hex");
  const calculated = Buffer.from(calculatedHash, "hex");

  if (received.length !== calculated.length || !timingSafeEqual(received, calculated)) {
    throw new TelegramAuthError("Telegram initData signature is invalid.");
  }

  return params;
}

function parseAndCheckFreshness(params: URLSearchParams) {
  const authDateRaw = params.get("auth_date");
  const userRaw = params.get("user");

  if (!authDateRaw || !userRaw) {
    throw new TelegramAuthError("Telegram initData is missing auth_date or user.");
  }

  const authDateSeconds = Number(authDateRaw);
  if (!Number.isFinite(authDateSeconds)) {
    throw new TelegramAuthError("Telegram auth_date is invalid.");
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - authDateSeconds;
  if (ageSeconds < 0 || ageSeconds > env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS) {
    throw new TelegramAuthError("Telegram initData is stale.");
  }

  let userJson: unknown;
  try {
    userJson = JSON.parse(userRaw);
  } catch {
    throw new TelegramAuthError("Telegram user payload is not valid JSON.");
  }

  const parsedUser = TelegramUser.safeParse(userJson);
  if (!parsedUser.success) {
    throw new TelegramAuthError("Telegram user payload is invalid.");
  }

  return parsedUser.data;
}

function telegramEmail(telegramId: number) {
  return `telegram+${telegramId}@yekis.local`;
}

function telegramPhone(telegramId: number) {
  return `+251${String(telegramId).slice(-9).padStart(9, "0")}`;
}

export async function loginWithTelegram(initData: string, role?: string) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new TelegramNotConfiguredError("TELEGRAM_BOT_TOKEN is not configured.");
  }

  const params = verifyTelegramHash(initData, env.TELEGRAM_BOT_TOKEN);
  const telegram = parseAndCheckFreshness(params);
  const email = telegramEmail(telegram.id);

  const selectedRole = role === "FREELANCER" || role === "BOTH" ? role : "CLIENT";
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      languagePreference: telegram.language_code === "am" ? "am" : "en",
      firstName: telegram.first_name || undefined,
      lastName: telegram.last_name || undefined,
      displayName: telegram.first_name ? `${telegram.first_name}${telegram.last_name ? " " + telegram.last_name : ""}` : undefined,
      avatarUrl: telegram.photo_url || undefined,
      ...(role ? { role: selectedRole } : {}),
    },
    create: {
      email,
      phone: telegramPhone(telegram.id),
      passwordHash: await argon2.hash(randomBytes(32).toString("hex")),
      role: selectedRole,
      firstName: telegram.first_name || "",
      lastName: telegram.last_name || "",
      displayName: telegram.first_name ? `${telegram.first_name}${telegram.last_name ? " " + telegram.last_name : ""}` : "Telegram Member",
      avatarUrl: telegram.photo_url || null,
      languagePreference: telegram.language_code === "am" ? "am" : "en",
      // No fabricated DOB - AML data integrity. Real DOB captured at Tier-2 Fayda.
      kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 0 } },
      consents: {
        create: [
          { purpose: "kyc_data_processing", granted: true },
          { purpose: "telegram_account_linking", granted: true },
          { purpose: "marketing_communications", granted: false },
          { purpose: "analytics", granted: false },
        ],
      },
    },
  });

  await recordAuditEvent({
    userId: user.id,
    eventType: "TELEGRAM_LOGIN",
    entityType: "User",
    entityId: user.id,
    metadata: {
      telegramId: telegram.id,
      username: telegram.username ?? null,
      firstName: telegram.first_name ?? null,
      lastName: telegram.last_name ?? null,
    },
  });

  return {
    ...(await createAuthTokens(user)),
    user: {
      id: user.id,
      ucid: user.ucid,
      role: user.role,
      email: user.email,
      phone: user.phone,
      languagePreference: user.languagePreference,
    },
    telegram: {
      id: telegram.id,
      username: telegram.username ?? null,
      firstName: telegram.first_name ?? null,
      lastName: telegram.last_name ?? null,
      photoUrl: telegram.photo_url ?? null,
    },
  };
}
