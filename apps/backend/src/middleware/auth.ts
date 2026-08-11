// === IMPORTS ===
import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";
import { env } from "../config/env.js";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);


// === INTERFACES & TYPES ===
export interface AuthedRequest extends Request {
  user?: { id: string; role: string; staffRole?: string | null };
}


// === MAIN FUNCTIONS ===
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  try {
    const token = header.slice("Bearer ".length);
    const { payload } = await jwtVerify(token, accessSecret);
    req.user = { id: payload.sub as string, role: payload.role as string, staffRole: (payload.staffRole as string | null) ?? null };
    next();
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
export async function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    req.user = undefined;
    return next();
  }

  try {
    const token = header.slice("Bearer ".length);
    const { payload } = await jwtVerify(token, accessSecret);
    req.user = { id: payload.sub as string, role: payload.role as string, staffRole: (payload.staffRole as string | null) ?? null };
  } catch {
    req.user = undefined;
  }
  next();
}
