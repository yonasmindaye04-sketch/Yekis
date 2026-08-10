import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";
import { env } from "../config/env.js";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export interface AuthedRequest extends Request {
  user?: { id: string; role: string };
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  try {
    const token = header.slice("Bearer ".length);
    const { payload } = await jwtVerify(token, accessSecret);
    req.user = { id: payload.sub as string, role: payload.role as string };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
