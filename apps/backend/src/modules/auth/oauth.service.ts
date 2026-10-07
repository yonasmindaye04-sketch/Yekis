// === IMPORTS ===
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { logger } from "../../lib/logger.js";
import argon2 from "argon2";
import { randomBytes } from "node:crypto";
import {
  AccountLinkRequiredError,
  accountLinkRequiredMessage,
  isPasswordOwnedAccount,
  withPlaceholderPhone,
} from "./identity.js";

/**
 * OAuth social sign-in: Google, Apple, Facebook.
 *
 * SECURITY CONTRACT (why the old bare-email "Google login" was deleted):
 * every provider credential is cryptographically verified against the
 * provider's own keys or server APIs BEFORE any user lookup/provisioning.
 *   - Google: RS256 id_token vs Google JWKS (issuer accounts.google.com,
 *             audience GOOGLE_CLIENT_ID)
 *   - Apple:  RS256 identity_token vs Apple JWKS (issuer appleid.apple.com,
 *             audience APPLE_CLIENT_ID)
 *   - Facebook: access token verified via Graph debug_token with
 *             APP_ID|APP_SECRET, then /me for profile fields.
 *
 * Each provider is individually env-gated; unconfigured providers throw
 * OAuthNotConfiguredError - never a fallback to unverified login.
 */

// === INTERFACES & TYPES ===
export interface OAuthProfile {
  provider: "GOOGLE" | "APPLE" | "FACEBOOK";
  providerId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export class OAuthNotConfiguredError extends Error {}
export class OAuthVerificationError extends Error {}

// ---- Google ----

const googleJwks = env.GOOGLE_CLIENT_ID
  ? createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"))
  : null;

export async function verifyGoogleIdToken(
  idToken: string,
): Promise<OAuthProfile> {
  if (!googleJwks || !env.GOOGLE_CLIENT_ID) {
    throw new OAuthNotConfiguredError(
      "Google sign-in is not configured on this server.",
    );
  }

  let payload: Record<string, unknown>;
  try {
    const result = await jwtVerify(idToken, googleJwks, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = result.payload as Record<string, unknown>;
  } catch (err) {
    logger.warn({ err }, "Google id_token verification failed");
    throw new OAuthVerificationError(
      "Google credential could not be verified.",
    );
  }

  const email =
    typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  // Refuse unverified mailboxes: a self-asserted email could hijack an
  // existing password account otherwise.
  if (!email || payload.email_verified !== true) {
    throw new OAuthVerificationError("Google account email is not verified.");
  }

  return {
    provider: "GOOGLE",
    providerId: String(payload.sub ?? ""),
    email,
    name: typeof payload.name === "string" ? payload.name : undefined,
    avatarUrl:
      typeof payload.picture === "string" ? payload.picture : undefined,
  };
}

// ---- Apple ----

const appleJwks = env.APPLE_CLIENT_ID
  ? createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"))
  : null;

export async function verifyAppleIdToken(
  idToken: string,
): Promise<OAuthProfile> {
  if (!appleJwks || !env.APPLE_CLIENT_ID) {
    throw new OAuthNotConfiguredError(
      "Apple sign-in is not configured on this server.",
    );
  }

  let payload: Record<string, unknown>;
  try {
    const result = await jwtVerify(idToken, appleJwks, {
      issuer: "https://appleid.apple.com",
      audience: env.APPLE_CLIENT_ID,
    });
    payload = result.payload as Record<string, unknown>;
  } catch (err) {
    logger.warn({ err }, "Apple identity_token verification failed");
    throw new OAuthVerificationError("Apple credential could not be verified.");
  }

  const email =
    typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  if (!email) {
    throw new OAuthVerificationError(
      "Apple credential did not include an email.",
    );
  }

  // Apple hides the real name behind a private relay email; use the email
  // local part as display name unless the client forwarded the name.
  return {
    provider: "APPLE",
    providerId: String(payload.sub ?? ""),
    email,
    name: email.split("@")[0]?.replace(/[._]/g, " "),
  };
}

// ---- Facebook ----

export async function verifyFacebookAccessToken(
  accessToken: string,
): Promise<OAuthProfile> {
  if (!(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET)) {
    throw new OAuthNotConfiguredError(
      "Facebook sign-in is not configured on this server.",
    );
  }

  const appToken = `${env.FACEBOOK_APP_ID}|${env.FACEBOOK_APP_SECRET}`;

  // 1. Verify the token is issued BY our app and is still valid.
  const debugRes = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`,
  );
  if (!debugRes.ok) {
    throw new OAuthVerificationError("Facebook token check failed.");
  }
  const debug = (await debugRes.json()) as {
    data?: { is_valid?: boolean; app_id?: string; user_id?: string };
  };

  if (
    !debug.data?.is_valid ||
    debug.data.app_id !== env.FACEBOOK_APP_ID ||
    !debug.data.user_id
  ) {
    throw new OAuthVerificationError(
      "Facebook credential is invalid or was issued by another app.",
    );
  }

  // 2. Fetch profile fields with the verified token (app-scoped id matches).
  const meRes = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!meRes.ok) {
    throw new OAuthVerificationError("Could not read Facebook profile.");
  }
  const me = (await meRes.json()) as {
    id?: string;
    name?: string;
    email?: string;
    picture?: { data?: { url?: string } };
  };

  const email = typeof me.email === "string" ? me.email.toLowerCase() : "";
  if (!email) {
    throw new OAuthVerificationError(
      "Facebook account did not grant email permission - required to sign in.",
    );
  }

  return {
    provider: "FACEBOOK",
    providerId: String(me.id ?? debug.data.user_id),
    email,
    name: me.name,
    avatarUrl: me.picture?.data?.url,
  };
}

// ---- Shared find-or-provision + token issuance ----

export async function loginWithOAuthProfile(
  profile: OAuthProfile,
  requestedRole?: "CLIENT" | "FREELANCER",
) {
  const providerField = `${profile.provider.toLowerCase()}Id`;

  // 1. Existing link?
  let user = await prisma.user.findFirst({
    where: { email: profile.email },
  });

  if (user && !user.emailVerified) {
    // Refuse to claim an account that has its own password. Without a verified
    // mailbox, an email match proves nothing: an attacker who pre-registers
    // this address would otherwise receive the real account (and its escrow
    // balance) the moment the owner clicks "Continue with <provider>".
    // Federated-only accounts have no password to prove, so merging another
    // provider into them stays safe.
    if (isPasswordOwnedAccount(user)) {
      logger.warn(
        { userId: user.id, provider: profile.provider },
        "Refusing OAuth merge into a password-owned account",
      );
      throw new AccountLinkRequiredError(
        accountLinkRequiredMessage(profile.email),
      );
    }

    // Federated providers verify email ownership - mark verified on first
    // OAuth login.
    user = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
  }

  if (!user) {
    // Sentinel password hash (same pattern as Telegram signup): OAuth
    // accounts have no platform password until they set one via reset flow.
    const sentinelHash = await argon2.hash(randomBytes(32).toString("hex"));

    const names = (profile.name ?? "").trim().split(" ");
    const firstName = names[0] || "Member";
    const lastName = names.slice(1).join(" ") || "";

    const userRole = requestedRole === "FREELANCER" ? "FREELANCER" : "CLIENT";

    user = await withPlaceholderPhone((phone) =>
      prisma.$transaction(async (tx) => {
        return tx.user.create({
          data: {
            email: profile.email,
            emailVerified: true,
            // Phone is collected later in onboarding; the reserved
            // +251 0xxxxxxxx placeholder satisfies the unique constraint
            // without fabricating an operator-allocated number.
            phone,
            passwordHash: sentinelHash,
            // Stays NULL: marks the account as federated-owned so a later
            // social sign-in on the same address may merge into it.
            firstName,
            lastName,
            displayName: profile.name ?? firstName,
            avatarUrl: profile.avatarUrl,
            role: userRole,
            languagePreference: "en",
            kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
            wallet: { create: { balanceMinor: 0 } },
            consents: {
              create: [
                { purpose: "kyc_data_processing", granted: true },
                {
                  purpose: `${profile.provider.toLowerCase()}_account_linking`,
                  granted: true,
                },
                { purpose: "marketing_communications", granted: false },
                { purpose: "analytics", granted: false },
              ],
            },
          },
        });
      }),
    );

    await recordAuditEvent({
      userId: user.id,
      eventType: `USER_REGISTERED_OAUTH_${profile.provider}`,
      entityType: "User",
      entityId: user.id,
      metadata: { email: profile.email, providerId: profile.providerId },
    });
  }

  // 2. Ensure the provider id is linked for future direct lookup.
  const linkData = { [providerField]: profile.providerId };
  const needsLink =
    (user as Record<string, unknown>)[providerField] !== profile.providerId;
  if (needsLink) {
    try {
      await prisma.user.update({ where: { id: user.id }, data: linkData });
    } catch (err) {
      // Provider id already bound to a DIFFERENT account - refuse rather
      // than silently merging identities.
      logger.warn({ err, provider: profile.provider }, "OAuth link conflict");
      throw new OAuthVerificationError(
        "This social account is already linked to a different Yekis account.",
      );
    }
  }

  const { createAuthTokens } = await import("./auth.service.js");
  // A federated provider session is not a strong factor: it cannot authorise a
  // withdrawal or an account change on its own.
  const result = await createAuthTokens(user, ["oauth"]);

  await recordAuditEvent({
    userId: user.id,
    eventType: `USER_LOGGED_IN_OAUTH_${profile.provider}`,
    entityType: "User",
    entityId: user.id,
  });

  return result;
}

// ---- Provider availability (drives frontend button rendering) ----

export function getOAuthProviderAvailability() {
  return {
    google: !!env.GOOGLE_CLIENT_ID,
    apple: !!env.APPLE_CLIENT_ID,
    facebook: !!(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET),
    // Telegram needs a bot token to verify a credential at all. The username
    // is served from here so the client never has to hardcode a bot handle
    // that can drift from the deployed bot.
    telegram: !!env.TELEGRAM_BOT_TOKEN,
    telegramBotUsername: env.TELEGRAM_BOT_USERNAME ?? null,
  };
}
