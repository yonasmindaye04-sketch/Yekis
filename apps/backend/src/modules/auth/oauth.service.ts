// === IMPORTS ===
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { logger } from "../../lib/logger.js";
import { hashPassword, verifyPassword } from "../../lib/password";
import { randomBytes } from "node:crypto";
import {
  AccountLinkRequiredError,
  accountLinkRequiredMessage,
  isPasswordOwnedAccount,
  withPlaceholderPhone,
} from "./identity.js";
import { normalizeEmail } from "./email-verification.service.js";

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

/**
 * The provider credential is already bound to a different account, or the
 * account cannot give it up without losing its last way in.
 */
export class OAuthLinkConflictError extends Error {}

/**
 * The provider's address is not the address of the account being linked.
 */
export class OAuthEmailMismatchError extends Error {}

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

/**
 * The Prisma filter that selects the account a provider id is bound to.
 *
 * `googleId`, `appleId` and `facebookId` are unique columns, so this resolves
 * to at most one row. The provider id is the CREDENTIAL itself — unlike the
 * email address, which is only a label the provider happens to assert about a
 * mailbox — so it is the one match that can be trusted to mean "the same
 * member".
 */
function providerIdWhere(profile: OAuthProfile): {
  googleId?: string;
  appleId?: string;
  facebookId?: string;
} {
  switch (profile.provider) {
    case "GOOGLE":
      return { googleId: profile.providerId };
    case "APPLE":
      return { appleId: profile.providerId };
    case "FACEBOOK":
      return { facebookId: profile.providerId };
  }
}

/**
 * Mints the session for a member who signed in with a provider credential.
 *
 * `oauth` is deliberately NOT a strong factor: a federated provider session
 * says nothing about who is sitting at the browser right now, so it can never
 * authorise a withdrawal or an account change on its own.
 */
async function issueOAuthSession(
  user: {
    id: string;
    role: string;
    ucid: string | null;
    staffRole?: string | null;
    sessionVersion?: number;
  },
  profile: OAuthProfile,
) {
  const { createAuthTokens } = await import("./auth.service.js");
  const result = await createAuthTokens(user, ["oauth"]);

  await recordAuditEvent({
    userId: user.id,
    eventType: `USER_LOGGED_IN_OAUTH_${profile.provider}`,
    entityType: "User",
    entityId: user.id,
  });

  return result;
}

export async function loginWithOAuthProfile(
  profile: OAuthProfile,
  requestedRole?: "CLIENT" | "FREELANCER",
) {
  const providerField = `${profile.provider.toLowerCase()}Id`;

  /**
   * 1. Existing link?
   *
   * The provider id IS the credential, so it is the one match that means "the
   * same member". It is looked up FIRST.
   *
   * The lookup used to be by email alone, which meant the link this service
   * writes — and that `POST /auth/oauth/google/link` writes — was never read
   * back: a member who linked Google from Settings was still refused with
   * ACCOUNT_LINK_REQUIRED, because their account owns a password and the
   * password check ran before anything looked at the provider id. The email
   * match below is a MERGE candidate; this one is not.
   */
  let user = await prisma.user.findFirst({
    where: providerIdWhere(profile),
  });

  if (user) {
    // The link was made deliberately — by the member, from a signed-in
    // session — so this is a sign-in, not a merge. The provider's address is
    // NOT copied onto the account: the Yekis email is the login identifier
    // and the destination of every transactional mail, and it only changes
    // when the member changes it themselves.
    if (normalizeEmail(user.email) !== profile.email) {
      logger.warn(
        { userId: user.id, provider: profile.provider },
        "OAuth provider address no longer matches the account address",
      );
    }
    return await issueOAuthSession(user, profile);
  }

  // 2. No provider link. The address the provider proved is all that is left,
  //    and this is the path where a merge could happen.
  user = await prisma.user.findFirst({
    where: { email: { equals: profile.email, mode: "insensitive" } },
  });

  /**
   * Refuse to take over an unverified password-owned account.
   *
   * An attacker could pre-register `victim@gmail.com` with a password and
   * skip email verification; if we auto-merged when `emailVerified` is false,
   * the attacker would retain password access to the victim's account.
   *
   * Conversely, when BOTH the Yekis account's email is verified
   * (`user.emailVerified === true`) AND the OAuth provider cryptographically
   * verified ownership of that same email (e.g. Google `email_verified: true`),
   * both sides have proven control of the mailbox, so we can safely link and
   * sign the user in.
   */
  const providerVerifiedEmail = profile.provider === "GOOGLE";
  if (
    user &&
    isPasswordOwnedAccount(user) &&
    !(user.emailVerified && providerVerifiedEmail)
  ) {
    logger.warn(
      { userId: user.id, provider: profile.provider, emailVerified: user.emailVerified },
      "Refusing OAuth merge into an unverified password-owned account",
    );
    throw new AccountLinkRequiredError(accountLinkRequiredMessage(profile.email));
  }

  if (user && !user.emailVerified) {
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
    const sentinelHash = await hashPassword(randomBytes(32).toString("hex"));

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
            // F-02: a Google/Apple/Facebook account is not a verified account.
            // Creating this VERIFIED with no document defeated every
            // requireKycVerified gate for the social sign-up path.
            kyc: { create: { tier: "TIER_1", status: "PENDING" } },
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

  // 3. Ensure the provider id is linked for future direct lookup.
  const linkData = { [providerField]: profile.providerId };
  const boundProviderId = (user as Record<string, unknown>)[providerField];
  const needsLink = boundProviderId !== profile.providerId;

  /**
   * The account is already bound to a DIFFERENT credential from this same
   * provider. Overwriting it would hand the account to whoever holds that
   * other credential — and the address is exactly what makes that possible:
   * a provider account can change its address, and the old address can then
   * be registered by somebody else. The account belongs to the credential it
   * was linked to, not to whoever shows up with the same address later.
   */
  if (needsLink && boundProviderId) {
    logger.warn(
      { userId: user.id, provider: profile.provider },
      "Refusing to overwrite an existing provider binding",
    );
    throw new OAuthVerificationError(
      "This Yekis account is already linked to a different account at this provider. Sign in with the one you linked.",
    );
  }

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

  return await issueOAuthSession(user, profile);
}

// ---- Linking a provider to an account the member already owns ----

/**
 * Binds a Google credential to the account of a member who is ALREADY signed
 * in.
 *
 * This is the only way a provider credential reaches a password account, and
 * it is deliberately the slow way: the caller has proved a strong credential
 * (the route requires a fresh session), so the link is an act of the account
 * holder rather than a consequence of matching an address.
 *
 * Three things are refused:
 *   1. a Google address that is not the account's own address — linking adds a
 *      credential, it must never attach a second mailbox (and with it a second
 *      destination for transactional mail and a second KYC subject) to an
 *      account that already has one;
 *   2. a Google credential that already belongs to another account — that is
 *      the merge the whole no-auto-merge rule exists to prevent;
 *   3. nothing at all is written when the credential is already this
 *      account's, so the call is idempotent.
 */
export async function linkGoogleToUser(userId: string, profile: OAuthProfile) {
  if (profile.provider !== "GOOGLE") {
    throw new OAuthVerificationError(
      "Only Google can be linked through this endpoint.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, googleId: true },
  });
  if (!user) throw new OAuthLinkConflictError("Account not found.");

  if (normalizeEmail(profile.email) !== normalizeEmail(user.email)) {
    throw new OAuthEmailMismatchError(
      "Use the Google account that matches the email address on your Yekis account.",
    );
  }

  const owner = await prisma.user.findFirst({
    where: { googleId: profile.providerId },
    select: { id: true },
  });
  if (owner && owner.id !== userId) {
    throw new OAuthLinkConflictError(
      "This Google account is already linked to a different Yekis account.",
    );
  }

  if (user.googleId === profile.providerId) {
    return { linked: true, alreadyLinked: true };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { googleId: profile.providerId },
  });

  await recordAuditEvent({
    userId,
    eventType: "USER_LINKED_GOOGLE",
    entityType: "User",
    entityId: userId,
    metadata: { provider: "GOOGLE", providerId: profile.providerId },
  });

  return { linked: true, alreadyLinked: false };
}

/**
 * Removes the Google credential from the signed-in member's account.
 *
 * The last-method guard (F-10 / S-12): an account must always keep one way
 * in. A platform password, or a verified address that can receive a
 * password-reset mail, is what remains once Google is removed — and a member
 * with neither is refused, because unlinking would be the last thing standing
 * between them and their own account.
 */
export async function unlinkGoogleFromUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      passwordSetAt: true,
      emailVerified: true,
      googleId: true,
    },
  });
  if (!user) throw new OAuthLinkConflictError("Account not found.");
  if (!user.googleId) return { unlinked: false };

  const hasOtherCredential = !!user.passwordSetAt || !!user.emailVerified;
  if (!hasOtherCredential) {
    throw new OAuthLinkConflictError(
      "Set a password or verify your email before unlinking Google.",
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { googleId: null },
  });

  await recordAuditEvent({
    userId,
    eventType: "USER_UNLINKED_GOOGLE",
    entityType: "User",
    entityId: userId,
  });

  return { unlinked: true };
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
