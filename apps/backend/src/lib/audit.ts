// === IMPORTS ===
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

/**
 * Writes an append-only audit entry. Called for every event that matters for
 * AML/dispute evidence: escrow state changes, KYC status changes, dispute
 * events, withdrawal requests, admin actions.
 *
 * IMPORTANT: the AuditLog table must have UPDATE and DELETE revoked at the
 * database role level for the app's runtime user — this function being
 * insert-only in application code is a second layer, not the only layer.
 * See prisma/README.md for the exact SQL to run once in each environment.
 */

// === MAIN FUNCTIONS ===
/**
 * Writes one append-only audit row. All new fields are optional so existing
 * call sites keep compiling unchanged; new admin/financial flows should
 * populate `previousState` / `newState` / `amountMinor` where relevant.
 */
export async function recordAuditEvent(params: {
  userId?: string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  // Phase 1 hardening (ADMIN_PHASE1_PLAN.md §3) — optional fields:
  actorRole?: string | null; // staffRole the actor used for this action
  action?: string; // canonical action name; defaults to eventType
  previousState?: Record<string, unknown> | null; // before-snapshot
  newState?: Record<string, unknown> | null; // after-snapshot
  amountMinor?: number;
  requestId?: string; // pino-http request id (req.id)
  ipAddress?: string | null; // client IP (req.ip under TRUST_PROXY)
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as never,
      actorRole: params.actorRole ?? null,
      action: params.action ?? params.eventType,
      previousState: (params.previousState ?? undefined) as never,
      newState: (params.newState ?? undefined) as never,
      amountMinor: params.amountMinor ?? null,
      requestId: params.requestId ?? null,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
