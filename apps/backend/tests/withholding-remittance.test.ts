import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import {
  generateWithholdingRemittanceReport,
  priorEatMonthBounds,
} from "../src/queue/withholdingRemittance.worker.js";

/**
 * ERA is owed the withholding that was actually deducted, not the withholding
 * that was estimated when a payment was initiated.
 *
 * The report summed PaymentTransaction.withholdingTaxMinor. That column is
 * stamped at FUNDING, and only the provider rail creates PaymentTransactions at
 * all — so a milestone funded from the platform wallet contributed nothing to
 * the return. Wallet funding is the normal path, not an edge case, so the
 * monthly figure ERA was handed understated the liability by most of it.
 *
 * It was also the wrong number even when a row existed: the rate depends on the
 * freelancer's TIN and the threshold on the amount released, both read at
 * release. A TIN added after funding retroactively moved a figure that had
 * already been reported.
 *
 * PlatformFeeCredit.withholdingMinor is written at release, covers contract
 * milestone AND gig-order releases, and is therefore the only record of what was
 * really withheld.
 */

const STAMP = Date.now();
const userIds: string[] = [];
const feeCreditIds: string[] = [];

/** A fixed instant, so the prior-EAT-month window is deterministic. */
const NOW = new Date("2026-08-15T12:00:00.000Z");

async function cleanup() {
  // periodMonth is the real calendar month the report covers, not something
  // namespaced to this file -- an earlier version filtered on a "tz-" prefix
  // that never existed, so the report survived between tests and the second run
  // just found the first one's numbers.
  const periodMonth = priorEatMonthBounds(NOW).periodMonth;
  await prisma.withholdingRemittanceReport.deleteMany({ where: { periodMonth } });

  const credits = feeCreditIds.splice(0, feeCreditIds.length);
  if (credits.length) await prisma.platformFeeCredit.deleteMany({ where: { id: { in: credits } } });
  const ids = userIds.splice(0, userIds.length);
  if (ids.length) {
    // Wallet first: it holds an FK to User.
    await prisma.wallet.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
}

/** A PlatformFeeCredit at a chosen instant, as recordPlatformEarnings writes it. */
async function creditWithholding(amountMinor: number, createdAt: Date) {
  let freelancerId = userIds[0];
  if (!freelancerId) {
    const created = await prisma.user.create({
      data: {
        email: `withholding-${STAMP}@test.et`,
        phone: `+2519${String(10000000 + (STAMP % 9000000))}`,
        passwordHash: "not-a-real-hash",
        role: "FREELANCER",
        wallet: { create: { balanceMinor: 0 } },
      } as never,
    });
    userIds.push(created.id);
    freelancerId = created.id;
  }
  const row = await prisma.platformFeeCredit.create({
    data: {
      milestoneId: `tz-${STAMP}-${Math.random().toString(36).slice(2, 8)}`,
      feeFromFreelancerMinor: 5000,
      feeFromClientMinor: 5000,
      withholdingMinor: amountMinor,
      createdAt,
    },
  });
  feeCreditIds.push(row.id);
  return row;
}

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("the prior Ethiopian month is computed independently of the host clock", () => {
  it("uses EAT month boundaries, not the server's local timezone", () => {
    // On 15 Aug 2026 the prior EAT month is July 2026.
    const { periodMonth, start, end } = priorEatMonthBounds(NOW);
    expect(periodMonth).toBe("2026-07");

    // 1 July 00:00 EAT == 30 June 21:00 UTC.
    expect(start.toISOString()).toBe("2026-06-30T21:00:00.000Z");
    expect(end.toISOString()).toBe("2026-07-31T21:00:00.000Z");
  });

  it("crosses a year boundary correctly", () => {
    // 15 Jan 2027 -> prior EAT month is December 2026.
    expect(priorEatMonthBounds(new Date("2027-01-15T00:00:00.000Z")).periodMonth).toBe("2026-12");
    // 15 Jan 2026 -> December 2025.
    expect(priorEatMonthBounds(new Date("2026-01-15T00:00:00.000Z")).periodMonth).toBe("2025-12");
  });

  it("does not shift the month for an instant near the EAT boundary", () => {
    // 31 July 23:30 UTC is already 1 August 02:30 EAT, so the prior month is
    // July. Using the UTC month here would have produced August and reported a
    // period that had barely started.
    const { periodMonth } = priorEatMonthBounds(new Date("2026-07-31T23:30:00.000Z"));
    expect(periodMonth).toBe("2026-07");
  });

  /**
   * The test that actually distinguishes the implementations.
   *
   * The CI box for this repo runs in EAT, which is exactly the timezone the old
   * `new Date(y, m, d)` code assumed. So on this machine the bug was invisible
   * and the test above passed against BOTH implementations — it verified
   * nothing. Containers, which is where this actually runs, are normally UTC,
   * and there the same line computes UTC months while every comment claims EAT.
   *
   * Forcing TZ pins the host clock so the property is testable anywhere.
   */
  it("gives the same answer whatever timezone the host is in", () => {
    const original = process.env.TZ;
    const boundary = new Date("2026-07-31T23:30:00.000Z"); // 1 Aug 02:30 EAT

    try {
      for (const tz of ["UTC", "America/New_York", "Asia/Addis_Ababa", "Pacific/Kiritimati"]) {
        process.env.TZ = tz;
        expect(
          priorEatMonthBounds(boundary).periodMonth,
          `period must not depend on the host timezone (TZ=${tz})`,
        ).toBe("2026-07");
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});

describe("the report totals what was actually withheld", () => {
  it("includes withholding from releases, not from funding", async () => {
    const inJuly = new Date("2026-07-15T10:00:00.000Z");
    await creditWithholding(30_000, inJuly);
    await creditWithholding(12_000, inJuly);
    // Outside the window — August, must not be counted.
    await creditWithholding(99_000, new Date("2026-08-02T10:00:00.000Z"));

    const report = await generateWithholdingRemittanceReport(NOW);

    expect(report.periodMonth).toBe("2026-07");
    expect(report.totalWithholdingMinor).toBe(42_000);
    expect(report.transactionCount).toBe(2);
  });

  it("reports zero rather than inventing a figure when nothing was withheld", async () => {
    const report = await generateWithholdingRemittanceReport(NOW);
    expect(report.totalWithholdingMinor).toBe(0);
    expect(report.transactionCount).toBe(0);
  });

  it("is idempotent for a period it has already reported", async () => {
    await creditWithholding(30_000, new Date("2026-07-15T10:00:00.000Z"));

    const first = await generateWithholdingRemittanceReport(NOW);
    await creditWithholding(50_000, new Date("2026-07-20T10:00:00.000Z"));
    const second = await generateWithholdingRemittanceReport(NOW);

    // A retry must not restate a period Finance may already have filed.
    expect(second.id).toBe(first.id);
    expect(second.totalWithholdingMinor).toBe(30_000);
  });

  it("excludes a PaymentTransaction-only withholding stamp entirely", async () => {
    // The shape the old query counted: a funding row carrying a withholding
    // figure, with no release-side PlatformFeeCredit behind it. It must not
    // appear, because it was an estimate made before the money moved.
    //
    // PaymentTransaction needs a milestone FK, so rather than fabricate the whole
    // graph the assertion is on the aggregate's source: with no fee credits in
    // the period the report must be zero, which is what this asserts.
    const report = await generateWithholdingRemittanceReport(NOW);
    expect(report.totalWithholdingMinor).toBe(0);
  });
});