// === IMPORTS ===
import type { NextFunction, Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "./auth.js";

// === MAIN FUNCTIONS ===
export function requireStaffRole(
  // Typed as plain strings: the StaffRole enum grows over time (Phase 1 RBAC)
  // and guards should never need a type edit when a new role is added.
  ...allowedRoles: string[]
) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { staffRole: true },
    });

    if (!user?.staffRole || !allowedRoles.includes(user.staffRole)) {
      return res
        .status(403)
        .json({ error: "STAFF_ROLE_REQUIRED", required: allowedRoles });
    }

    next();
  };
}
