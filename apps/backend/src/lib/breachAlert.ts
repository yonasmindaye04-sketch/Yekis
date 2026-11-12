// === IMPORTS ===
import { logger } from "./logger.js";
import { prisma } from "./prisma.js";
import { recordAuditEvent } from "./audit.js";
import { notifyStaffOfEvent } from "./staffAlerts.js";
import { notificationQueue } from "../queue/queues.js";

/**
 * TIER 3: Real-Time Data Breach Reporting to ECA.
 *
 * The Master Design Document requires reporting significant data breaches to the
 * Ethiopian Communications Authority (ECA) within 72 hours (PDPP No. 1321/2024).
 *
 * There is NO automated API or webhook provided by the ECA. The ECA filing is
 * therefore a human step, but everything AROUND that filing is automatable and
 * was not: the previous version of this file wrote a single `logger.fatal`
 * line and stopped. The SMS/Telegram dispatch was commented out, there was no
 * containment step, no user notification, and no report template. In practice
 * that meant a breach was a log line nobody was guaranteed to read.
 *
 * What this module does now, in the order the law expects:
 *
 *   1. DETECT  — the incident is opened (staff-confirmed; see admin.routes.ts).
 *   2. CONTAIN — every active session belonging to an affected user is
 *                 revoked by bumping `sessionVersion`, which invalidates their
 *                 access tokens immediately without deleting the account or
 *                 touching financial records.
 *   3. NOTIFY STAFF — compliance and support staff are alerted in-app, by
 *                 SMS and by Telegram, so a human starts the ECA filing inside
 *                 the 72-hour window.
 *   4. NOTIFY USERS — affected users are told, without being told anything
 *                 about other users.
 *   5. FILE    — a structured ECA notification template is produced, with the
 *                 PDPP-required fields filled in and the ones that need a
 *                 human signature left clearly marked. The platform cannot
 *                 file it; a human submits it and records the reference.
 */

// === TYPES ===
export type BreachSeverity = "HIGH" | "CRITICAL";

export interface BreachNotificationParams {
  severity: BreachSeverity;
  /** What happened. Written into the audit trail and the user notice. */
  description: string;
  /** Which systems were involved — API, database, object store, etc. */
  affectedSystems: string[];
  /** Best estimate of how many people are affected. */
  estimatedUsersImpacted?: number;
  /**
   * The users whose data was exposed. Drives both containment and the direct
   * user notification. Empty means "system-wide, not user-specific" — the
   * staff alert still fires, no individual notice is sent.
   */
  affectedUserIds?: string[];
  /** PDPP data categories involved — e.g. "identity", "financial", "chat". */
  dataCategories?: string[];
  /** The staff member opening the incident, for the audit trail. */
  openedByStaffId?: string;
}

export interface BreachOutcome {
  breachId: string;
  severity: BreachSeverity;
  detectedAt: string;
  /** PDPP No. 1321/2024 — 72 hours from detection. */
  ecaNotificationDeadline: string;
  containedUserCount: number;
  notifiedStaffCount: number;
  notifiedUserCount: number;
  /** Pre-filled ECA notification text. A human still has to submit it. */
  ecaReportTemplate: string;
}

/** PDPP No. 1321/2024: notify the ECA within 72 hours of becoming aware. */
const ECA_NOTIFICATION_WINDOW_HOURS = 72;

// === MAIN FUNCTIONS ===

/**
 * Revokes every active session for the given users.
 *
 * `sessionVersion` is already the revocation lever the auth middleware
 * checks on each request (middleware/auth.ts compares the value baked into
 * the token against the row). Incrementing it invalidates every token already
 * issued to that user without touching the account, the wallet, or any AML
 * record — which is what containment is supposed to do: cut off access, do
 * not destroy evidence.
 *
 * Returns the number of users whose sessions were revoked.
 */
export async function containBreach(params: {
  affectedUserIds: string[];
}): Promise<number> {
  const ids = [...new Set(params.affectedUserIds)];
  if (ids.length === 0) return 0;

  const revoked = await prisma.user.updateMany({
    where: { id: { in: ids } },
    data: { sessionVersion: { increment: 1 } },
  });

  logger.error(
    { affectedUserCount: revoked.count, requestedCount: ids.length },
    "Containment: revoked active sessions for affected users",
  );

  return revoked.count;
}

/**
 * Builds the ECA notification text with the fields the platform knows and
 * the ones only a human can supply clearly marked.
 *
 * The point is not to produce a filing-ready document — it cannot be, because
 * the platform has no ECA channel and has no DPO appointed — but to make sure
 * the human doing the filing starts from a complete list of questions instead
 * of a blank page with a 72-hour clock running.
 */
export function buildEcaNotificationTemplate(params: {
  breachId: string;
  severity: BreachSeverity;
  description: string;
  affectedSystems: string[];
  estimatedUsersImpacted?: number;
  dataCategories?: string[];
  detectedAt: Date;
  deadline: Date;
  containedUserCount: number;
}): string {
  const lines = [
    "ETHIOPIAN COMMUNICATIONS AUTHORITY — DATA BREACH NOTIFICATION",
    "Legal basis: Personal Data Protection Proclamation No. 1321/2024",
    "",
    `Incident reference:   ${params.breachId}`,
    `Severity:             ${params.severity}`,
    `Detected at:          ${params.detectedAt.toISOString()}`,
    `Filing deadline:      ${params.deadline.toISOString()} (72 hours from detection)`,
    `Systems affected:     ${params.affectedSystems.join(", ") || "unspecified"}`,
    `Users affected:       ${params.estimatedUsersImpacted ?? "unknown"}`,
    `Data categories:      ${params.dataCategories?.join(", ") || "unspecified"}`,
    "",
    "1. NATURE OF THE BREACH",
    `   ${params.description}`,
    "",
    "2. CONTAINMENT ACTIONS TAKEN",
    `   Active sessions revoked for ${params.containedUserCount} affected user(s).`,
    "   Affected parties notified in-app, by SMS and by Telegram.",
    "   [TO COMPLETE: further technical containment steps taken, with timestamps]",
    "",
    "3. DATA SUBJECTS AFFECTED",
    "   [TO COMPLETE: categories of data subjects (client / freelancer / both) and count]",
    "",
    "4. LIKELY CONSEQUENCES",
    "   [TO COMPLETE: assessment of consequences for the data subjects' rights and freedoms]",
    "",
    "5. MEASURES TAKEN OR PROPOSED TO ADDRESS THE BREACH",
    "   [TO COMPLETE: prevention, containment and mitigation measures]",
    "",
    "6. CONTACT POINT",
    "   [TO COMPLETE: name, title and contact details of the appointed DPO or",
    "    incident contact — PDPP Art. 37 requires a DPO to be appointed]",
    "",
    "7. SIGNATURE",
    "   [TO COMPLETE: name, signature, date]",
  ];
  return lines.join("\n");
}

/**
 * Opens a breach incident and runs the whole response chain.
 *
 * Detection is human-confirmed (a staff member opens the incident once they
 * have confirmed a breach actually happened) — automated anomaly detection
 * is not built, and pretending otherwise would be worse than saying so. Every
 * step AFTER detection is automated here, and the 72-hour clock starts the
 * moment this function runs.
 */
export async function triggerBreachAlert(
  params: BreachNotificationParams,
): Promise<BreachOutcome> {
  const detectedAt = new Date();
  const deadline = new Date(
    detectedAt.getTime() + ECA_NOTIFICATION_WINDOW_HOURS * 60 * 60 * 1000,
  );
  const affectedUserIds = params.affectedUserIds ?? [];

  logger.fatal(
    {
      breachAlert: true,
      severity: params.severity,
      affectedSystems: params.affectedSystems,
      estimatedUsersImpacted: params.estimatedUsersImpacted,
    },
    `DATA BREACH ALERT: ${params.description}`,
  );

  // The audit row is the incident record, and its id is the incident
  // reference that every downstream artefact quotes.
  const incident = await recordAuditEvent({
    userId: params.openedByStaffId,
    eventType: "SECURITY_BREACH_OPENED",
    entityType: "SecurityIncident",
    entityId: `breach-${detectedAt.getTime()}`,
    actorRole: "SECURITY",
    metadata: {
      severity: params.severity,
      description: params.description,
      affectedSystems: params.affectedSystems,
      dataCategories: params.dataCategories ?? [],
      estimatedUsersImpacted: params.estimatedUsersImpacted ?? null,
      affectedUserIds,
      detectedAt: detectedAt.toISOString(),
      ecaNotificationDeadline: deadline.toISOString(),
    },
  });

  // 2. Contain.
  const containedUserCount = await containBreach({ affectedUserIds });

  // 3. Notify staff. `notifyStaffOfEvent` fans out one notification job per
  //    staff user; "security-breach" is a critical type so it also goes out
  //    over SMS.
  const notifiedStaffCount = await notifyStaffOfEvent({
    eventType: "security-breach",
    message:
      `SECURITY BREACH (${params.severity}) — ${params.description}. ` +
      `Affected systems: ${params.affectedSystems.join(", ") || "unspecified"}. ` +
      `The ECA notification deadline is ${deadline.toISOString()}. ` +
      `Start the filing now.`,
    metadata: {
      breachId: incident.id,
      severity: params.severity,
      affectedSystems: params.affectedSystems,
      dataCategories: params.dataCategories ?? [],
      estimatedUsersImpacted: params.estimatedUsersImpacted ?? null,
      containedUserCount,
      ecaNotificationDeadline: deadline.toISOString(),
    },
  });

  // 4. Notify affected users — one message each, saying only what applies to
  //    that user. A shared message naming the incident is fine; a message
  //    saying "you were one of N" with the others' identities is not, and
  //    never will be.
  let notifiedUserCount = 0;
  for (const userId of affectedUserIds) {
    await notificationQueue.add("security-breach", {
      userId,
      message:
        `Security notice: we identified a security incident affecting your ` +
        `account data (${params.dataCategories?.join(", ") || "personal data"}). ` +
        `Your session has been signed out as a precaution and you will need to ` +
        `sign in again. Details: ${params.description}`,
      metadata: {
        breachId: incident.id,
        severity: params.severity,
        detectedAt: detectedAt.toISOString(),
      },
    });
    notifiedUserCount++;
  }

  // 5. Prepare the filing.
  const ecaReportTemplate = buildEcaNotificationTemplate({
    breachId: incident.id,
    severity: params.severity,
    description: params.description,
    affectedSystems: params.affectedSystems,
    estimatedUsersImpacted: params.estimatedUsersImpacted,
    dataCategories: params.dataCategories,
    detectedAt,
    deadline,
    containedUserCount,
  });

  logger.error(
    {
      breachId: incident.id,
      severity: params.severity,
      containedUserCount,
      notifiedStaffCount,
      notifiedUserCount,
      ecaNotificationDeadline: deadline.toISOString(),
    },
    "Security breach incident opened — ECA filing required within 72 hours",
  );

  return {
    breachId: incident.id,
    severity: params.severity,
    detectedAt: detectedAt.toISOString(),
    ecaNotificationDeadline: deadline.toISOString(),
    containedUserCount,
    notifiedStaffCount,
    notifiedUserCount,
    ecaReportTemplate,
  };
}
