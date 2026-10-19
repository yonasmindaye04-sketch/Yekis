// === GUEST SUPPORT ACCESS TOKENS ===
//
// A visitor who messages support from the marketing site has no account and no
// session, so they cannot read or reply to their own ticket: `requireAuth`
// rejects them and the chat widget becomes a one-way dead end — the ticket is
// created but the guest never sees a staff response.
//
// This issues a narrow token that grants access to exactly ONE conversation and
// nothing else. F-01 is the reason it is shaped this way:
//
//   * It is signed with GUEST_SUPPORT_JWT_SECRET, a key distinct from
//     JWT_ACCESS_SECRET. That is the load-bearing control. It was previously
//     signed with the access key, so a guest token verified as a session and
//     `requireAuth` accepted it — meaning anyone who typed a real member's email
//     into the support widget got a full session as that member. A separate key
//     makes that structurally impossible rather than a check that can be
//     forgotten.
//   * `typ` and `aud` mark it as a guest token; requireAuth refuses both,
//     independently of the key, as defence in depth.
//   * `conversationId` pins it to a single thread, and the verifier only lives
//     on support-chat routes that carry that id in the path, so a stolen guest
//     token cannot be walked across threads.
//   * No refresh token, so it cannot be renewed into a session.
//   * Short TTL so a leaked token expires on its own.
//   * Carries no role/staff claims, so it can never be mistaken for a session.

import { SignJWT, jwtVerify } from "jose";
import { env } from "../../config/env.js";

/**
 * Dedicated signing key. Falls back to a clearly-marked, non-secret dev value so
 * local development and tests work without configuration, while production
 * refuses to boot without a real key (see assertProductionSafety). The fallback
 * is deliberately not derived from JWT_ACCESS_SECRET — deriving it would
 * reintroduce exactly the F-01 vulnerability for anyone who shipped with the
 * default in place.
 */
const DEV_GUEST_SECRET = "yekis-dev-only-guest-support-secret-not-for-prod";
const guestSecret = new TextEncoder().encode(
  env.GUEST_SUPPORT_JWT_SECRET || DEV_GUEST_SECRET,
);

/** Lifetime of a guest support token. Long enough to finish a conversation. */
export const GUEST_SUPPORT_TOKEN_TTL = "12h";

/** Discriminator present on every guest support token. */
export const GUEST_SUPPORT_TOKEN_TYPE = "guest_support";

/** Audience marker. A real access token never carries this. */
export const GUEST_SUPPORT_TOKEN_AUDIENCE = "guest-support";

export interface GuestSupportTokenClaims {
  /** The guest User id (the conversation creator). */
  sub: string;
  typ: typeof GUEST_SUPPORT_TOKEN_TYPE;
  aud: typeof GUEST_SUPPORT_TOKEN_AUDIENCE;
  /** The single conversation this token may access. */
  conversationId: string;
}

/**
 * True when a verified payload is a guest-support token, by claim rather than
 * by key. Both markers are checked so a token minted with the wrong key but the
 * right claims is still refused.
 */
export function isGuestSupportToken(payload: Record<string, unknown>): boolean {
  return (
    payload.typ === GUEST_SUPPORT_TOKEN_TYPE ||
    payload.aud === GUEST_SUPPORT_TOKEN_AUDIENCE
  );
}

/**
 * Issues a single-conversation access token for a guest support thread.
 */
export async function issueGuestSupportToken(params: {
  userId: string;
  conversationId: string;
}): Promise<string> {
  return new SignJWT({
    typ: GUEST_SUPPORT_TOKEN_TYPE,
    aud: GUEST_SUPPORT_TOKEN_AUDIENCE,
    conversationId: params.conversationId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(params.userId)
    .setExpirationTime(GUEST_SUPPORT_TOKEN_TTL)
    .sign(guestSecret);
}

/**
 * Verifies a guest-support token against the GUEST key only.
 *
 * Deliberately never accepts an access-token signature: a real session must not
 * reach a guest-only code path, and a guest token must not be able to satisfy a
 * session-only check. Returns null for anything that is not a well-formed guest
 * token for this exact conversation.
 */
export async function verifyGuestSupportToken(
  token: string,
  expectedConversationId: string,
): Promise<{ userId: string; conversationId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, guestSecret, {
      audience: GUEST_SUPPORT_TOKEN_AUDIENCE,
    });
    if (!isGuestSupportToken(payload as Record<string, unknown>)) return null;
    const conversationId = payload.conversationId;
    if (
      typeof conversationId !== "string" ||
      conversationId !== expectedConversationId
    ) {
      return null;
    }
    const sub = payload.sub;
    if (typeof sub !== "string" || sub.length === 0) return null;
    return { userId: sub, conversationId };
  } catch {
    return null;
  }
}