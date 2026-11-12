// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";

// === TYPES ===

/**
 * One SLA clock: a deadline, the moment the clock stopped (if it has), and
 * whether it was missed.
 */
export interface SlaClock {
  /** When the clock expires. */
  dueAt: string;
  /** When the obligation was met, or null if it is still running. */
  metAt: string | null;
  /** True when the clock expired without being met. */
  breached: boolean;
  /** Minutes left, negative once the clock is overdue. */
  remainingMinutes: number;
}

export interface SlaState {
  firstResponse: SlaClock;
  resolution: SlaClock;
  /** True when either clock has been breached and the item is still open. */
  breached: boolean;
}

export interface SlaSummary {
  support: {
    open: number;
    firstResponseBreached: number;
    resolutionBreached: number;
    withinSla: number;
  };
  disputes: {
    open: number;
    firstResponseBreached: number;
    resolutionBreached: number;
    withinSla: number;
  };
  generatedAt: string;
}

// === HELPERS ===

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/**
 * Adds N business days to a date.
 *
 * A business day is Monday to Saturday. Sunday is the only excluded day,
 * which is the Ethiopian weekend. Public holidays are not excluded: there is
 * no holiday calendar in the system, and inventing one would silently drift
 * from reality.
 *
 * The clock runs on calendar hours, not business hours -- a deadline that
 * lands on a Sunday is still a Sunday. Only the day COUNT is filtered.
 */
export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from.getTime());
  let remaining = Math.max(0, Math.floor(days));
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    // getDay(): 0 = Sunday. Sunday is not a business day.
    if (result.getDay() !== 0) remaining -= 1;
  }
  return result;
}

function clock(
  dueAt: Date,
  metAt: Date | null | undefined,
  now: Date,
): SlaClock {
  const dueMs = dueAt.getTime();
  const met = metAt ?? null;
  const reference = met ? met.getTime() : now.getTime();
  return {
    dueAt: dueAt.toISOString(),
    metAt: met ? met.toISOString() : null,
    breached: reference > dueMs,
    remainingMinutes: Math.round((dueMs - reference) / MS_PER_MINUTE),
  };
}

function state(first: SlaClock, resolution: SlaClock): SlaState {
  return {
    firstResponse: first,
    resolution,
    breached: first.breached || resolution.breached,
  };
}

/**
 * Support SLA for a conversation.
 *
 * Two clocks, as agreed:
 *   - first response: the clock stops when staff first reply
 *   - resolution:   the clock stops when the conversation is closed
 *
 * The Roadmap's helpdesk SLA is "general support within 24 hours", which is
 * the first-response clock. The resolution clock is a separate, configurable
 * target (default 72 hours) because the Roadmap does not state one.
 */
export function supportSla(
  conversation: {
    createdAt: Date;
    firstRespondedAt?: Date | null;
    resolvedAt?: Date | null;
  },
  now: Date = new Date(),
): SlaState {
  const firstResponseDue = new Date(
    conversation.createdAt.getTime() +
      env.SUPPORT_FIRST_RESPONSE_SLA_HOURS * MS_PER_HOUR,
  );
  const resolutionDue = new Date(
    conversation.createdAt.getTime() + env.SUPPORT_RESOLUTION_SLA_HOURS * MS_PER_HOUR,
  );
  return state(
    clock(firstResponseDue, conversation.firstRespondedAt, now),
    clock(resolutionDue, conversation.resolvedAt, now),
  );
}

/**
 * Dispute SLA.
 *
 * Two clocks, as agreed:
 *   - first response: the mediator records a recommendation. This is the
 *     substantive answer to the dispute, and it is what the Roadmap's
 *     "disputes within 3 business days" refers to. Counting it from the
 *     raise would be breached by the 7-day Stage 1 negotiation window alone.
 *   - resolution: the dispute reaches RESOLVED.
 */
export function disputeSla(
  dispute: {
    createdAt: Date;
    firstRespondedAt?: Date | null;
    resolvedAt?: Date | null;
  },
  now: Date = new Date(),
): SlaState {
  const firstResponseDue = addBusinessDays(
    dispute.createdAt,
    env.DISPUTE_FIRST_RESPONSE_SLA_BUSINESS_DAYS,
  );
  const resolutionDue = addBusinessDays(
    dispute.createdAt,
    env.DISPUTE_RESOLUTION_SLA_BUSINESS_DAYS,
  );
  return state(
    clock(firstResponseDue, dispute.firstRespondedAt, now),
    clock(resolutionDue, dispute.resolvedAt, now),
  );
}

// === REPORTING ===

/**
 * Counts the open queues by SLA state, so a breach is reportable rather
 * than something a staff member has to notice by eye.
 */
export async function slaSummary(now: Date = new Date()): Promise<SlaSummary> {
  const [conversations, disputes] = await Promise.all([
    prisma.conversation.findMany({
      where: { status: "OPEN" },
      select: { createdAt: true, firstRespondedAt: true, resolvedAt: true },
    }),
    prisma.dispute.findMany({
      where: { resolvedAt: null },
      select: { createdAt: true, firstRespondedAt: true, resolvedAt: true },
    }),
  ]);

  const support = conversations.map((c) => supportSla(c, now));
  const disputeStates = disputes.map((d) => disputeSla(d, now));

  const countBreached = (states: SlaState[]) =>
    states.filter((s) => s.breached).length;

  return {
    support: {
      open: conversations.length,
      firstResponseBreached: support.filter((s) => s.firstResponse.breached).length,
      resolutionBreached: support.filter((s) => s.resolution.breached).length,
      withinSla: support.filter((s) => !s.breached).length,
    },
    disputes: {
      open: disputes.length,
      firstResponseBreached: disputeStates.filter((s) => s.firstResponse.breached)
        .length,
      resolutionBreached: disputeStates.filter((s) => s.resolution.breached).length,
      withinSla: disputeStates.filter((s) => !s.breached).length,
    },
    generatedAt: now.toISOString(),
  };
}

export { MS_PER_DAY };
