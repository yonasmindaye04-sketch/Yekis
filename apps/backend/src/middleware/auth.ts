// === IMPORTS ===
import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import {
  isGuestSupportToken,
  verifyGuestSupportToken,
} from "../modules/chat/guestSupportToken.js";
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

    // F-01 defence in depth. A guest-support token is now signed with a
    // different key, so it cannot verify here at all. This claim check is the
    // belt to that braces: if a guest token is ever minted with the access key
    // again, or the two keys are configured identically, a token carrying the
    // guest discriminator is still refused rather than silently becoming a
    // session.
    if (isGuestSupportToken(payload as Record<string, unknown>)) {
      return res
        .status(401)
        .json({ error: "Guest support tokens cannot be used as a session" });
    }

    // Suspension re-check: JWTs are stateless with a 15m TTL — without this
    // DB lookup, a suspended user keeps FULL access until their token
    // expires. One indexed primary-key read per request is the price of
    // immediate enforcement.
    //
    // F-01 defence in depth #2: a guest identity is never a routable account,
    // so requireAuth refuses it even if a token for one somehow verified.
    const user = await prisma.user.findUnique({
      where: { id },
      select: { isSuspended: true, isGuestContact: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (user.isGuestContact) {
      return res.status(401).json({
        error: "Guest contact accounts cannot authenticate as a member",
      });
    }

    if (user.isSuspended) {
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
    const requested = req.params.conversationId as string | undefined;

    // F-01: the guest verifier accepts ONLY the dedicated guest key and ONLY a
    // token whose conversationId matches this route. It runs first so a guest
    // token is never even parsed as an access token.
    if (requested) {
      const guest = await verifyGuestSupportToken(token, requested);
      if (guest) {
        const user = await prisma.user.findUnique({
          where: { id: guest.userId },
          select: { isSuspended: true, isGuestContact: true },
        });
        if (!user || !user.isGuestContact) {
          return res
            .status(401)
            .json({ error: "Invalid or expired token" });
        }
        if (user.isSuspended) {
          return res.status(403).json({ error: "ACCOUNT_SUSPENDED" });
        }
        applyGuestClaims(req, guest.userId, guest.conversationId);
        return next();
      }
    }

    const { payload } = await jwtVerify(token, accessSecret);
    const id = payload.sub as string;
    if (!id) return res.status(401).json({ error: "Invalid or expired token" });

    // A guest token must never fall through to the session path here.
    if (isGuestSupportToken(payload as Record<string, unknown>)) {
      return res
        .status(401)
        .json({ error: "Guest support tokens cannot be used as a session" });
    }

    // Regular session token — same checks as requireAuth.
    const user = await prisma.user.findUnique({
      where: { id },
      select: { isSuspended: true, isGuestContact: true },
    });
    if (!user) return res.status(401).json({ error: "Invalid or expired token" });
    if (user.isGuestContact) {
      return res.status(401).json({
        error: "Guest contact accounts cannot authenticate as a member",
      });
    }
    if (user.isSuspended) {
      return res.status(403).json({ error: "ACCOUNT_SUSPENDED" });
    }

    applyAuthClaims(req, payload as Record<string, unknown>);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Accepts a normal session token ONLY, for endpoints that carry no conversation
 * id in the path (currently attachment upload and attachment read).
 *
 * F-01: this used to be `requireAuthAllowingGuest`, which accepted a guest
 * token with no conversation scoping at all. A guest token is now confined to
 * the single conversation named in its `conversationId` claim, and there is no
 * way to express that constraint on a route like `/chat/upload`. Rather than
 * keep a loosely-scoped guest grant alive for two routes, guests are refused
 * here: attachment upload for a signed-out visitor is a nice-to-have, whereas an
 * unscoped guest token is the class of bug this batch exists to remove. Guests
 * keep the support thread itself, via requireGuestChatAccess.
 */
export async function requireMemberSession(
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
      return res
        .status(401)
        .json({ error: "Guest support tokens cannot be used as a session" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { isSuspended: true, isGuestContact: true },
    });
    if (!user) return res.status(401).json({ error: "Invalid or expired token" });
    if (user.isGuestContact) {
      return res.status(401).json({
        error: "Guest contact accounts cannot authenticate as a member",
      });
    }
    if (user.isSuspended) {
      return res.status(403).json({ error: "ACCOUNT_SUSPENDED" });
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
    // F-01: a guest token carries no member identity. optionalAuth must not
    // promote it into req.user, because two routes use req.user to widen access
    // (own-profile detail, and staff-tier gig inspection).
    if (isGuestSupportToken(payload as Record<string, unknown>)) {
      req.user = undefined;
      req.auth = undefined;
      return next();
    }
    applyAuthClaims(req, payload as Record<string, unknown>);
  } catch {
    req.user = undefined;
    req.auth = undefined;
  }
  next();
}
