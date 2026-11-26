/**
 * Real analytics over the signed-in account's own records.
 *
 * The dashboard used to print hard-coded trend numbers ("+18.4% vs prior
 * 30d", "98.2% on-time", "+5 this week") next to genuinely live KPIs. Half
 * of each card was therefore fiction, and for a brand-new account the whole
 * card read like somebody else's business.
 *
 * Everything here is derived from data the account actually owns, and every
 * helper returns `null` rather than a guess when the account has no history
 * to compare against.
 */

import type { Job, Milestone, TopUpRequest } from "../../api/client";

const DAY_MS = 86_400_000;

export interface PeriodTotals {
  /** Sum inside the current window. */
  current: number;
  /** Sum inside the window immediately before it. */
  prior: number;
}

/**
 * Percentage change between two windows, or null when there is no baseline
 * to compare against. A brand-new account has no prior window, so it gets no
 * percentage rather than an invented one.
 */
export function periodChange(current: number, prior: number): number | null {
  if (prior <= 0) return null;
  return ((current - prior) / prior) * 100;
}

/** Approved wallet top-ups (ETB) in the current window and the one before it. */
export function topUpTotals(
  topUps: TopUpRequest[],
  windowMs: number,
  nowMs: number = Date.now(),
): PeriodTotals {
  const currentFrom = nowMs - windowMs;
  const priorFrom = nowMs - 2 * windowMs;

  let current = 0;
  let prior = 0;
  for (const t of topUps) {
    if (t.status !== "APPROVED") continue;
    const ts = new Date(t.createdAt).getTime();
    if (!Number.isFinite(ts)) continue;
    const amount = (t.amountMinor || 0) / 100;
    if (ts >= currentFrom && ts <= nowMs) current += amount;
    else if (ts >= priorFrom && ts < currentFrom) prior += amount;
  }
  return { current, prior };
}

/**
 * ETB moved into milestone escrow (ETB) in the current window and the one
 * before it, using the real funding timestamp.
 */
export function escrowFundedTotals(
  milestones: Milestone[],
  windowMs: number,
  nowMs: number = Date.now(),
): PeriodTotals {
  const currentFrom = nowMs - windowMs;
  const priorFrom = nowMs - 2 * windowMs;

  let current = 0;
  let prior = 0;
  for (const m of milestones) {
    if (!m.fundedAt) continue;
    const ts = new Date(m.fundedAt).getTime();
    if (!Number.isFinite(ts)) continue;
    const amount = (m.amountMinor || 0) / 100;
    if (ts >= currentFrom && ts <= nowMs) current += amount;
    else if (ts >= priorFrom && ts < currentFrom) prior += amount;
  }
  return { current, prior };
}

export interface OnTimeStats {
  /** Released milestones delivered on or before their due date. */
  onTime: number;
  /** Released milestones in total. */
  released: number;
  /** Percentage 0-100, or null when nothing has been released yet. */
  rate: number | null;
}

/**
 * On-time delivery rate over the milestones the account has actually had
 * released. Null (not 0%, not 100%) when nothing has settled yet.
 */
export function onTimeStats(milestones: Milestone[]): OnTimeStats {
  let onTime = 0;
  let released = 0;
  for (const m of milestones) {
    if (m.escrowState !== "RELEASED" || !m.releasedAt) continue;
    released += 1;
    const releasedAt = new Date(m.releasedAt).getTime();
    const dueAt = new Date(m.dueDate).getTime();
    if (!Number.isFinite(releasedAt) || !Number.isFinite(dueAt)) continue;
    if (releasedAt <= dueAt) onTime += 1;
  }
  return {
    onTime,
    released,
    rate: released > 0 ? (onTime / released) * 100 : null,
  };
}

/** How many briefs were published inside the window. */
export function briefsCreatedSince(
  jobs: Job[],
  windowMs: number,
  nowMs: number = Date.now(),
): number {
  const from = nowMs - windowMs;
  let count = 0;
  for (const j of jobs) {
    if (!j.createdAt) continue;
    const ts = new Date(j.createdAt).getTime();
    if (!Number.isFinite(ts)) continue;
    if (ts >= from && ts <= nowMs) count += 1;
  }
  return count;
}

export { DAY_MS };
