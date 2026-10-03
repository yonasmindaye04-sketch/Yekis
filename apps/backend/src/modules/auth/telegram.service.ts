// === IMPORTS ===
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { createAuthTokens } from "./auth.service.js";
import {
  AccountLinkRequiredError,
  accountLinkRequiredMessage,
  isPasswordOwnedAccount,
  isUniqueConstraintViolation,
  withPlaceholderPhone,
} from "./identity.js";

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
export class TelegramAccountConflictError extends Error {}

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
    throw new TelegramAuthError("Telegram auth data is missing hash.");
  }

  // Telegram Mini App uses HMAC("WebAppData", botToken)
  // Telegram Login Widget uses SHA256(botToken)
  const isWidget = params.has("id") && !params.has("user");
  const secret = isWidget
    ? createHash("sha256").update(botToken).digest()
    : createHmac("sha256", "WebAppData").update(botToken).digest();

  const dataCheckString = buildDataCheckString(params);
  const calculatedHash = createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  const received = Buffer.from(hash, "hex");
  const calculated = Buffer.from(calculatedHash, "hex");

  if (
    received.length !== calculated.length ||
    !timingSafeEqual(received, calculated)
  ) {
    throw new TelegramAuthError("Telegram authentication signature is invalid.");
  }

  return params;
}

function parseAndCheckFreshness(params: URLSearchParams) {
  const authDateRaw = params.get("auth_date");
  if (!authDateRaw) {
    throw new TelegramAuthError("Telegram auth data is missing auth_date.");
  }

  const authDateSeconds = Number(authDateRaw);
  if (!Number.isFinite(authDateSeconds)) {
    throw new TelegramAuthError("Telegram auth_date is invalid.");
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - authDateSeconds;
  if (ageSeconds < 0 || ageSeconds > env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS) {
    throw new TelegramAuthError("Telegram auth data is stale.");
  }

  if (params.has("user")) {
    const userRaw = params.get("user")!;
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

  if (params.has("id")) {
    const id = Number(params.get("id"));
    const parsedUser = TelegramUser.safeParse({
      id,
      first_name: params.get("first_name") || undefined,
      last_name: params.get("last_name") || undefined,
      username: params.get("username") || undefined,
      photo_url: params.get("photo_url") || undefined,
    });
    if (!parsedUser.success) {
      throw new TelegramAuthError("Telegram widget payload is invalid.");
    }
    return parsedUser.data;
  }

  throw new TelegramAuthError("Telegram auth data is missing user info.");
}

function telegramEmail(telegramId: number) {
  return `telegram+${telegramId}@yekis.local`;
}

/**
 * Verifies a signed, fresh Telegram credential and returns the claimed
 * identity. Shared by the sign-in and the account-link flows so both apply
 * exactly the same replay window and signature rules.
 */
function verifyTelegramCredential(initData: string): TelegramUser {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new TelegramNotConfiguredError(
      "TELEGRAM_BOT_TOKEN is not configured.",
    );
  }
  const params = verifyTelegramHash(initData, env.TELEGRAM_BOT_TOKEN);
  return parseAndCheckFreshness(params);
}

/**
 * A Telegram private chat id equals the user's own numeric id, so the web
 * sign-in payload is enough to give the bot a delivery target. Persisting it
 * is what makes Telegram push notifications and bot session resolution work.
 */
function telegramChatId(telegramId: number) {
  return String(telegramId);
}

function profileFields(telegram: TelegramUser) {
  const displayName = telegram.first_name
    ? `${telegram.first_name}${telegram.last_name ? " " + telegram.last_name : ""}`
    : undefined;

  return {
    firstName: telegram.first_name || undefined,
    lastName: telegram.last_name || undefined,
    displayName,
    avatarUrl: telegram.photo_url || undefined,
    languagePreference: telegram.language_code === "am" ? "am" : "en",
  };
}

/**
 * Resolves the Yekis account behind a Telegram identity.
 *
 * `telegramUserId` is the authoritative key: it is the one field Telegram
 * guarantees to be unique and stable, and it survives an email migration.
 * The synthetic email is only a fallback for accounts provisioned before the
 * column was populated.
 */
async function findUserByTelegramIdentity(telegramId: number) {
  return prisma.user.findUnique({
    where: { telegramUserId: BigInt(telegramId) },
  });
}

async function findUserBySyntheticEmail(telegramId: number) {
  return prisma.user.findUnique({ where: { email: telegramEmail(telegramId) } });
}

/**
 * Telegram sign-in: verify the credential, then resolve, backfill or
 * provision the account.
 */
export async function loginWithTelegram(initData: string, role?: string) {
  const telegram = verifyTelegramCredential(initData);
  const user = await resolveOrProvisionTelegramUser(telegram, { role });

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

/**
 * Resolves the Yekis account for an ALREADY-VERIFIED Telegram identity,
 * provisioning one if this Telegram account has never been seen.
 *
 * Shared by every Telegram entry point so they cannot drift:
 *   - Mini App / Login Widget (`loginWithTelegram`) — identity proven by a
 *     signed `initData` payload verified against the bot token.
 *   - The bot itself (handlers/commands.ts) — identity proven by Telegram
 *     delivering the update to our webhook/polling connection, which carries
 *     the same assurance and involves no client-supplied data at all.
 *
 * A requested `role` only ever applies at provisioning time, so a repeat
 * sign-in can never silently downgrade a member.
 */
export async function resolveOrProvisionTelegramUser(
  telegram: TelegramUser,
  options: { role?: string; chatId?: string | number } = {},
) {
  const chatId = String(options.chatId ?? telegramChatId(telegram.id));
  const profile = profileFields(telegram);
  const selectedRole =
    options.role === "FREELANCER" || options.role === "BOTH"
      ? options.role
      : "CLIENT";

  const existing = await findUserByTelegramIdentity(telegram.id);

  if (existing) {
    // Returning member: refresh the mutable Telegram profile fields and
    // re-assert the chat target, which the bot clears when a user blocks it.
    return prisma.user.update({
      where: { id: existing.id },
      data: { ...profile, telegramChatId: chatId },
      include: { kyc: { select: { tier: true, status: true } } },
    });
  }

  const legacy = await findUserBySyntheticEmail(telegram.id);

  if (legacy) {
    // The synthetic address is only ever issued to Telegram, so an email hit
    // is the same human on an account provisioned before telegramUserId was
    // persisted. A password-owned account is the one exception: it was created
    // through the public sign-up form and must be claimed from an
    // authenticated session instead.
    if (isPasswordOwnedAccount(legacy)) {
      throw new AccountLinkRequiredError(
        accountLinkRequiredMessage(legacy.email),
      );
    }
    return prisma.user.update({
      where: { id: legacy.id },
      data: {
        ...profile,
        telegramUserId: BigInt(telegram.id),
        telegramChatId: chatId,
      },
      include: { kyc: { select: { tier: true, status: true } } },
    });
  }

  // Sentinel hash of a random secret: the account has no platform password.
  // passwordSetAt stays NULL to mark it federated-owned, which is what lets a
  // later social sign-in on the same address merge into it safely.
  const sentinelHash = await argon2.hash(randomBytes(32).toString("hex"));

  return withPlaceholderPhone((phone) =>
    prisma.user.create({
      data: {
        email: telegramEmail(telegram.id),
        phone,
        passwordHash: sentinelHash,
        role: selectedRole,
        firstName: telegram.first_name || "",
        lastName: telegram.last_name || "",
        displayName: profile.displayName ?? "Telegram Member",
        avatarUrl: telegram.photo_url || null,
        languagePreference: profile.languagePreference,
        telegramUserId: BigInt(telegram.id),
        telegramChatId: chatId,
        // No fabricated DOB - AML data integrity. Real DOB captured at Tier-2 Fayda.
        kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
        wallet: { create: { balanceMinor: 0 } },
        consents: {
          // Mirrors the five-purpose registration model (Master Design §12.2).
          // platform_notifications is granted: the bot IS the notification
          // channel the user launched — using it is the affirmative opt-in.
          create: [
            { purpose: "kyc_data_processing", granted: true },
            { purpose: "financial_data_processing", granted: true },
            { purpose: "platform_notifications", granted: true },
            { purpose: "telegram_account_linking", granted: true },
            { purpose: "marketing_communications", granted: false },
            { purpose: "analytics", granted: false },
          ],
        },
      },
      include: { kyc: { select: { tier: true, status: true } } },
    }),
  );
}

/**
 * Binds a Telegram identity to the ALREADY authenticated account. This is the
 * only path that may attach Telegram to an account created with a password:
 * possession of a valid session proves the caller owns that account, and the
 * signed Telegram payload proves they own the Telegram identity. No email
 * match is involved.
 */
export async function linkTelegramToUser(userId: string, initData: string) {
  const telegram = verifyTelegramCredential(initData);
  const chatId = telegramChatId(telegram.id);

  const owner = await findUserByTelegramIdentity(telegram.id);
  if (owner && owner.id !== userId) {
    throw new TelegramAccountConflictError(
      "This Telegram account is already linked to a different Yekis account.",
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        telegramUserId: BigInt(telegram.id),
        telegramChatId: chatId,
      },
    });

    await recordAuditEvent({
      userId: user.id,
      eventType: "TELEGRAM_ACCOUNT_LINKED",
      entityType: "User",
      entityId: user.id,
      metadata: {
        telegramId: telegram.id,
        username: telegram.username ?? null,
      },
    });

    return {
      telegramUserId: String(telegram.id),
      telegramChatId: chatId,
    };
  } catch (err) {
    // Lost a race against a concurrent link of the same Telegram identity.
    if (isUniqueConstraintViolation(err)) {
      throw new TelegramAccountConflictError(
        "This Telegram account is already linked to a different Yekis account.",
      );
    }
    throw err;
  }
}

/**
 * Detaches Telegram from the authenticated account. Stops push delivery and
 * lets another Yekis account claim the identity.
 */
export async function unlinkTelegramFromUser(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { telegramUserId: null, telegramChatId: null },
  });

  await recordAuditEvent({
    userId,
    eventType: "TELEGRAM_ACCOUNT_UNLINKED",
    entityType: "User",
    entityId: userId,
  });

  return { unlinked: true };
}
