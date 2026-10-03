// === IMPORTS ===
import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { isGuestSupportToken } from "../modules/chat/guestSupportToken.js";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

// === INTERFACES & TYPES ===
export interface AuthedRequest extends Request {
  user?: { id: string; role: string; staffRole?: string | null };
  /**
   * Set when the caller authenticated with a guest support token. Carries the
   * single conversation that token is allowed to touch.
   */
  guestSupportConversationId?: string;
}

// === MAIN FUNCTIONS ===
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

    req.user = {
      id,
      role: payload.role as string,
      staffRole: (payload.staffRole as string | null) ?? null,
    };
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

      req.user = { id, role: "CLIENT", staffRole: null };
      req.guestSupportConversationId = scopedTo;
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

    req.user = {
      id,
      role: payload.role as string,
      staffRole: (payload.staffRole as string | null) ?? null,
    };
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
    return next();
  }

  try {
    const token = header.slice("Bearer ".length);
    const { payload } = await jwtVerify(token, accessSecret);
    req.user = {
      id: payload.sub as string,
      role: payload.role as string,
      staffRole: (payload.staffRole as string | null) ?? null,
    };
  } catch {
    req.user = undefined;
  }
  next();
}
