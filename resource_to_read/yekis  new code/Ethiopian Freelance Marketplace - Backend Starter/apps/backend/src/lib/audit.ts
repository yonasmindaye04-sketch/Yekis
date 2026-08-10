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
export async function recordAuditEvent(params: {
  userId?: string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as never,
    },
  });
}
