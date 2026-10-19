// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import { auditLedgerIntegrity } from "../finance/ledger.service.js";

// === PAYMENTS ===
export async function listPayments(params: {
  page: number;
  limit: number;
  status?: string;
  provider?: string;
  q?: string;
}) {
  const { page, limit } = params;
  const where: Record<string, unknown> = {};
  if (params.status && params.status !== "ALL") where.status = params.status;
  if (params.provider && params.provider !== "ALL") where.provider = params.provider;
  if (params.q && params.q.length >= 2) {
    where.OR = [
      { providerTransactionId: { contains: params.q, mode: "insensitive" } },
      { milestone: { contract: { client: { email: { contains: params.q, mode: "insensitive" } } } } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.paymentTransaction.findMany({
      where,
      include: {
        milestone: {
          select: {
            id: true,
            title: true,
            contract: {
              select: {
                id: true,
                client: { select: { id: true, email: true, displayName: true } },
                freelancer: { select: { id: true, email: true, displayName: true } },
                job: { select: { title: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.paymentTransaction.count({ where }),
  ]);

  return { items, total, page, pageSize: limit };
}

// === ESCROW (milestone-backed) ===
export async function listEscrows(params: {
  page: number;
  limit: number;
  escrowState?: string;
  q?: string;
}) {
  const { page, limit } = params;
  const where: Record<string, unknown> = {};
  if (params.escrowState && params.escrowState !== "ALL") {
    where.escrowState = params.escrowState;
  }
  if (params.q && params.q.length >= 2) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { contract: { client: { email: { contains: params.q, mode: "insensitive" } } } },
      { contract: { freelancer: { email: { contains: params.q, mode: "insensitive" } } } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.milestone.findMany({
      where,
      include: {
        contract: {
          select: {
            id: true,
            job: { select: { title: true } },
            client: { select: { id: true, email: true, displayName: true } },
            freelancer: { select: { id: true, email: true, displayName: true } },
          },
        },
        paymentTransactions: { select: { provider: true, providerTransactionId: true, status: true } },
        escrowHolds: { where: { active: true }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, reason: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.milestone.count({ where }),
  ]);

  // Aggregate financial rollups in one pass without extra RTT.
  const rollup = await prisma.milestone.aggregate({
    where: { escrowState: { in: ["ESCROW_HELD", "SUBMITTED_FOR_REVIEW", "WORK_IN_PROGRESS"] } },
    _sum: { amountMinor: true },
  });

  return {
    items,
    total,
    page,
    pageSize: limit,
    escrowHeldMinor: rollup._sum.amountMinor ?? 0,
  };
}

// === PAYOUTS ===
export async function listPayouts(params: {
  page: number;
  limit: number;
  status?: string;
  provider?: string;
  q?: string;
}) {
  const { page, limit } = params;
  const where: Record<string, unknown> = {};
  if (params.status && params.status !== "ALL") where.status = params.status;
  if (params.provider && params.provider !== "ALL") where.provider = params.provider;
  if (params.q && params.q.length >= 2) {
    where.OR = [
      { providerPayoutId: { contains: params.q, mode: "insensitive" } },
      { payoutAccountIdentifier: { contains: params.q, mode: "insensitive" } },
      { user: { email: { contains: params.q, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.payoutTransaction.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payoutTransaction.count({ where }),
  ]);

  // Pending-payout queue count (PENDING + PROCESSING)
  const pending = await prisma.payoutTransaction.count({
    where: { status: { in: ["PENDING", "PROCESSING"] } },
  });

  return { items, total, page, pageSize: limit, pendingPayouts: pending };
}

// === LEDGER ===
export async function getLedgerSummary() {
  const [accounts, journals, integrity] = await Promise.all([
    prisma.ledgerAccount.findMany({ orderBy: { code: "asc" } }),
    prisma.ledgerJournal.count(),
    auditLedgerIntegrity(),
  ]);
  return { accounts, journalCount: journals, integrity };
}

export async function listLedgerJournals(params: {
  page: number;
  limit: number;
  referenceType?: string;
  q?: string;
}) {
  const { page, limit } = params;
  const where: Record<string, unknown> = {};
  if (params.referenceType && params.referenceType !== "ALL") {
    where.referenceType = params.referenceType;
  }
  if (params.q && params.q.length >= 2) {
    where.OR = [
      { description: { contains: params.q, mode: "insensitive" } },
      { referenceId: { contains: params.q, mode: "insensitive" } },
      { idempotencyKey: { contains: params.q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.ledgerJournal.findMany({
      where,
      include: {
        entries: {
          include: { account: { select: { code: true, name: true, type: true } } },
        },
      },
      orderBy: { postedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ledgerJournal.count({ where }),
  ]);

  return {
    items: items.map((j) => {
      let debits = 0;
      let credits = 0;
      for (const e of j.entries) {
        debits += e.debitMinor;
        credits += e.creditMinor;
      }
      return { ...j, totalDebitsMinor: debits, totalCreditsMinor: credits };
    }),
    total,
    page,
    pageSize: limit,
  };
}
