// === IMPORTS ===
import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { isGuestSupportToken } from "../modules/chat/guestSupportToken.js";
import {
  AUTH_ERROR_CODES,
  isStrongMethod,
} from "../modules/auth/auth-methods.js";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

// === INTERFACES & TYPES ===
export interface AuthedRequest extends Request {
  user?: { id: string; role: string; staffRole?: string | null };
  /**
   * The verified claims of the bearer token, including `auth_time` and `amr`.
   * `auth_time` is the credential-entry timestamp and is the ONLY value a
   * step-up check may read — never `iat`, which moves on every refresh.
   */
  auth?: {
    sub: string;
    role: string;
    staffRole: string | null;
    sid?: string;
    iat?: number;
    auth_time?: number;
    amr?: string[];
  };
  /**
   * Set when the caller authenticated with a guest support token. Carries the
   * single conversation that token is allowed to touch.
   */
  guestSupportConversationId?: string;
}

// === MAIN FUNCTIONS ===

/**
 * Copies the verified JWT claims onto the request. Single place where token
 * shape is interpreted, so every middleware agrees on what `req.auth` means.
 *
 * `auth_time` and `amr` are typed defensively: a token minted before those
 * claims existed yields `undefined`, which requireFreshAuth treats as
 * "infinitely stale" and therefore fails closed.
 */
function applyAuthClaims(req: AuthedRequest, payload: Record<string, unknown>) {
  const id = payload.sub as string;
  const role = payload.role as string;
  const staffRole = (payload.staffRole as string | null) ?? null;

  req.user = { id, role, staffRole };
  req.auth = {
    sub: id,
    role,
    staffRole,
    sid: typeof payload.sid === "string" ? payload.sid : undefined,
    iat: typeof payload.iat === "number" ? payload.iat : undefined,
    auth_time: typeof payload.auth_time === "number" ? payload.auth_time : undefined,
    amr: Array.isArray(payload.amr) ? (payload.amr as string[]) : undefined,
  };
}

/**
 * Claims for a guest support token, which carries NO role claims by design.
 * `amr` is left undefined so a guest can never satisfy requireFreshAuth.
 */
function applyGuestClaims(
  req: AuthedRequest,
  id: string,
  conversationId?: string,
) {
  req.user = { id, role: "CLIENT", staffRole: null };
  req.auth = { sub: id, role: "CLIENT", staffRole: null };
  if (conversationId) req.guestSupportConversationId = conversationId;
}

/**
 * Step-up gate: the caller must have presented a STRONG credential recently.
 *
 * Two distinct failures, deliberately different status codes so the client can
 * tell them apart:
 *   401 REAUTH_REQUIRED  — the credential is too old (or absent). Sign in again.
 *   403 STEP_UP_REQUIRED — it is recent but weak (Telegram/OAuth only). Add a
 *                          password, TOTP or email code.
 *
 * A token minted before auth_time existed has no credential timestamp and is
 * treated as infinitely old, so it must re-authenticate. That fails closed.
 *
 * Mount AFTER requireAuth.
 */
export function requireFreshAuth(maxAgeSec = 300) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) {
      return res
        .status(401)
        .json({ error: AUTH_ERROR_CODES.REAUTH_REQUIRED, code: AUTH_ERROR_CODES.REAUTH_REQUIRED });
    }

    const age = Math.floor(Date.now() / 1000) - (auth.auth_time ?? 0);
    if (age > maxAgeSec) {
      return res
        .status(401)
        .json({ error: AUTH_ERROR_CODES.REAUTH_REQUIRED, code: AUTH_ERROR_CODES.REAUTH_REQUIRED });
    }

    if (!isStrongMethod(auth.amr)) {
      return res
        .status(403)
        .json({ error: AUTH_ERROR_CODES.STEP_UP_REQUIRED, code: AUTH_ERROR_CODES.STEP_UP_REQUIRED });
    }

    return next();
  };
}
export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or malformed Authorization header" });
  }

  try {
    const token = header.slice("Bearer ".length);
    const { payload } = await jwtVerify(token, accessSecret);
    const id = payload.sub as string;

    // Suspension re-check: JWTs are stateless with a 15m TTL — without this
    // DB lookup, a suspended user keeps FULL access until their token
    // expires. One indexed primary-key read per request is the price of
    // immediate enforcement.
    const user = await prisma.user.findUnique({
      where: { id },
      select: { isSuspended: true },
    });

    if (user?.isSuspended) {
      return res.status(403).json({ error: "ACCOUNT_SUSPENDED" });
    }

    const tokenVersion = (payload as Record<string, unknown>).session_version;
    if (typeof tokenVersion === "number" && user) {
      try {
        const rows = await prisma.$queryRaw<Array<{ sessionVersion: number }>>`
          SELECT "sessionVersion" FROM "User" WHERE id = ${id}
        `;
        if (tokenVersion !== (rows[0]?.sessionVersion ?? 0)) {
          return res.status(401).json({ error: "SESSION_REVOKED" });
        }
      } catch {
        // The session-version migration is additive and may be applied after
        // the app starts. Do not make existing sessions unavailable mid-rollout.
      }
    }

    applyAuthClaims(req, payload as Record<string, unknown>);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Authenticates a guest support token and pins it to one conversation.
 *
 * Accepts either a normal session token or a guest support token. When a guest
 * token is used the request is confined to `req.params.conversationId`; asking
 * for any other conversation is rejected outright rather than relying on
 * downstream checks, so a stolen guest token cannot be walked across threads.
 *
 * A guest token carries no role claims, so it can never reach staff routes.
 */
export async function requireGuestChatAccess(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or malformed Authorization header" });
  }

  try {
    const token = header.slice("Bearer ".length);
    const { payload } = await jwtVerify(token, accessSecret);
    const id = payload.sub as string;
    if (!id) return res.status(401).json({ error: "Invalid or expired token" });

    if (isGuestSupportToken(payload as Record<string, unknown>)) {
      const scopedTo = payload.conversationId as string | undefined;
      const requested = req.params.conversationId as string | undefined;

      if (!scopedTo || !requested || scopedTo !== requested) {
        return res.status(403).json({ error: "TOKEN_SCOPE_MISMATCH" });
      }

      // The guest is a real User (created with the ticket) and is a participant
      // on the conversation, so chat.service's access rules allow exactly this.
      const user = await prisma.user.findUnique({
        where: { id },
        select: { isSuspended: true },
      });
      if (!user) return res.status(401).json({ error: "Invalid or expired token" });
      if (user.isSuspended) {
        return res.status(403).json({ error: "ACCOUNT_SUSPENDED" });
      }

applyGuestClaims(req, id, scopedTo);
      return next();
    }

    // Regular session token — same suspension re-check as requireAuth.
    const user = await prisma.user.findUnique({
      where: { id },
      select: { isSuspended: true },
    });
    if (user?.isSuspended) {
      return res.status(403).json({ error: "ACCOUNT_SUSPENDED" });
    }

    applyAuthClaims(req, payload as Record<string, unknown>);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Accepts either a normal session token or a guest support token, WITHOUT
 * pinning the guest to a conversation.
 *
 * Used for endpoints a scoped guest legitimately needs but that carry no
 * conversation in the path — currently attachment upload. The guest is still a
 * real, server-side User id, so anything they create is attributed to them and
 * reachable only through the scoped routes. Per-conversation confinement is
 * enforced by `requireGuestChatAccess` on the message routes; do not use this
 * middleware where a `conversationId` is available.
 */
export async function requireAuthAllowingGuest(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or malformed Authorization header" });
  }

  try {
    const token = header.slice("Bearer ".length);
    const { payload } = await jwtVerify(token, accessSecret);
    const id = payload.sub as string;
    if (!id) return res.status(401).json({ error: "Invalid or expired token" });

    const user = await prisma.user.findUnique({
      where: { id },
      select: { isSuspended: true },
    });
    if (!user) return res.status(401).json({ error: "Invalid or expired token" });
    if (user.isSuspended) {
      return res.status(403).json({ error: "ACCOUNT_SUSPENDED" });
    }

    if (isGuestSupportToken(payload as Record<string, unknown>)) {
      // No role claims are honoured for guest tokens.
      applyGuestClaims(req, id);
      return next();
    }

    applyAuthClaims(req, payload as Record<string, unknown>);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Optional authentication — same as requireAuth but does NOT reject
 * unauthenticated requests. If a valid token is present, req.user is
 * populated; otherwise req.user stays undefined and the request proceeds.
 * Used for public endpoints where auth provides extra context (e.g. profile views).
 */
export async function optionalAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    req.user = undefined;
    req.auth = undefined;
    return next();
  }

  try {
    const token = header.slice("Bearer ".length);
    const { payload } = await jwtVerify(token, accessSecret);
    applyAuthClaims(req, payload as Record<string, unknown>);
  } catch {
    req.user = undefined;
    req.auth = undefined;
  }
  next();
}
