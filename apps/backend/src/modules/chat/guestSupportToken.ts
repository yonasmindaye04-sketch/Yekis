// === GUEST SUPPORT ACCESS TOKENS ===
//
// A visitor who messages support from the marketing site has no account and no
// session, so they cannot read or reply to their own ticket: `requireAuth`
// rejects them and the chat widget becomes a one-way dead end — the ticket is
// created but the guest never sees a staff response.
//
// This issues a narrow, signed token that grants access to exactly ONE
// conversation and nothing else. It is deliberately NOT a login token:
//
//   * no refresh token, so it cannot be renewed into a real session
//   * `typ: "guest_support"` distinguishes it everywhere it is accepted
//   * `conversationId` pins it to a single thread
//   * short TTL so a leaked token expires on its own
//   * carries no role/staff claims, so it can never be mistaken for a session
//
// The guest is already registered as a ConversationParticipant (the creator), so
// once authenticated as that user the existing chat.service access rules grant
// them their own thread and nothing more.

import { SignJWT } from "jose";
import { env } from "../../config/env.js";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

/** Lifetime of a guest support token. Long enough to finish a conversation. */
export const GUEST_SUPPORT_TOKEN_TTL = "12h";

/** Discriminator present on every guest support token. */
export const GUEST_SUPPORT_TOKEN_TYPE = "guest_support";

export interface GuestSupportTokenClaims {
  /** The guest User id (the conversation creator). */
  sub: string;
  typ: typeof GUEST_SUPPORT_TOKEN_TYPE;
  /** The single conversation this token may access. */
  conversationId: string;
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
    conversationId: params.conversationId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(params.userId)
    .setExpirationTime(GUEST_SUPPORT_TOKEN_TTL)
    .sign(accessSecret);
}

/** True when the payload carries the guest-support discriminator. */
export function isGuestSupportToken(payload: Record<string, unknown>): boolean {
  return payload.typ === GUEST_SUPPORT_TOKEN_TYPE;
}