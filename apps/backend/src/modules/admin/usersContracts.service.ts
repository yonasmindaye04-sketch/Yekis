// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";

// === MAIN FUNCTIONS ===
/**
 * List users with common operational filters — clients and freelancers,
 * with optional search across email, phone, display name, and UCID.
 */
export async function listUsers(params: {
  page: number;
  limit: number;
  role?: string;
  q?: string;
}) {
  const { page, limit, role, q } = params;
  const where: Record<string, unknown> = {};
  if (role && role !== "ALL") {
    where.role = role;
  }
  if (q && q.length >= 2) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { displayName: { contains: q, mode: "insensitive" } },
      { ucid: { contains: q, mode: "insensitive" } },
    ];
  }
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        ucid: true,
        email: true,
        phone: true,
        displayName: true,
        role: true,
        staffRole: true,
        isSuspended: true,
        cachedKycTier: true,
        cachedKycStatus: true,
        createdAt: true,
        profileCompleteness: true,
        profileViewCount: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, pageSize: limit };
}

/**
 * Full user profile with activity rollup — used by the Admin user detail view.
 */
export async function getUserSummary(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      kyc: { select: { tier: true, status: true, nextReviewDueAt: true } },
      wallet: { select: { balanceMinor: true } },
      _count: {
        select: {
          jobsPosted: true,
          proposals: true,
          contractsAsClient: true,
          contractsAsFreelancer: true,
          gigsOwned: true,
          gigOrders: true,
        },
      },
    },
  });
  if (!user) return null;
  const [recentConversations, recentAudit] = await Promise.all([
    prisma.conversation.findMany({
      where: { creatorId: userId },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, subject: true, status: true, updatedAt: true },
    }),
    prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, eventType: true, entityType: true, entityId: true, createdAt: true, actorRole: true },
    }),
  ]);

  return {
    user: {
      id: user.id,
      ucid: user.ucid,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      role: user.role,
      staffRole: user.staffRole,
      isSuspended: user.isSuspended,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      createdAtIso: user.createdAt.toISOString(),
      profileCompleteness: user.profileCompleteness,
      profileViews: user.profileViewCount,
    },
    kyc: user.kyc
      ? {
          tier: user.kyc.tier,
          status: user.kyc.status,
          nextReviewDueAt: user.kyc.nextReviewDueAt,
        }
      : null,
    walletBalance: user.wallet?.balanceMinor ?? 0,
    activity: {
      jobsPosted: user._count.jobsPosted,
      proposalsSubmitted: user._count.proposals,
      contractsAsClient: user._count.contractsAsClient,
      contractsAsFreelancer: user._count.contractsAsFreelancer,
      gigsOwned: user._count.gigsOwned,
      gigOrders: user._count.gigOrders,
    },
    recentConversations,
    recentAudit,
  };
}

/**
 * List contracts with pagination, filters, and party names.
 */
export async function listContracts(params: {
  page: number;
  limit: number;
  status?: string;
  q?: string;
}) {
  const { page, limit, status, q } = params;
  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") {
    where.status = status;
  }
  if (q && q.length >= 2) {
    where.OR = [
      { client: { displayName: { contains: q, mode: "insensitive" } } },
      { freelancer: { displayName: { contains: q, mode: "insensitive" } } },
      { job: { title: { contains: q, mode: "insensitive" } } },
      { id: { contains: q, mode: "insensitive" } },
    ];
  }
  const [items, total] = await prisma.$transaction([
    prisma.contract.findMany({
      where,
      select: {
        id: true,
        status: true,
        createdAt: true,
        clientAcceptedAt: true,
        freelancerAcceptedAt: true,
        cancellableUntil: true,
        client: {
          select: { id: true, email: true, displayName: true, role: true },
        },
        freelancer: {
          select: { id: true, email: true, displayName: true, role: true },
        },
        job: {
          select: { id: true, title: true, category: true, status: true },
        },
        _count: { select: { milestones: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contract.count({ where }),
  ]);
  return { items, total, page, pageSize: limit };
}

/**
 * Contract detail including milestones, payments, disputes, and audit trail.
 */
export async function getContractDetail(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      client: {
        select: { id: true, email: true, phone: true, displayName: true },
      },
      freelancer: {
        select: { id: true, email: true, phone: true, displayName: true },
      },
      job: { select: { id: true, title: true, category: true, status: true, description: true } },
      milestones: true,
      disputes: { select: { id: true, stage: true, category: true } },
      review: true,
    },
  });
  if (!contract) return null;

  const milestoneIds = contract.milestones.map((m) => m.id);
  const [payments, audits] = await Promise.all([
    prisma.paymentTransaction.findMany({
      where: { milestoneId: { in: milestoneIds } },
      include: { milestone: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "Contract", entityId: contractId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const totalEscrowMinor = contract.milestones
    .filter((m) =>
      ["ESCROW_HELD", "SUBMITTED_FOR_REVIEW", "WORK_IN_PROGRESS"].includes(
        m.escrowState,
      ),
    )
    .reduce((sum, m) => sum + m.amountMinor, 0);

  return {
    contract: {
      id: contract.id,
      status: contract.status,
      cancellableUntil: contract.cancellableUntil,
      createdAt: contract.createdAt,
      jobTitle: contract.job.title,
      jobCategory: contract.job.category,
      clientAcceptedAt: contract.clientAcceptedAt,
      freelancerAcceptedAt: contract.freelancerAcceptedAt,
    },
    parties: {
      client: contract.client,
      freelancer: contract.freelancer,
    },
    job: contract.job,
    milestones: contract.milestones,
    payments,
    disputes: contract.disputes,
    review: contract.review ?? null,
    audits,
    totals: {
      escrowHeldMinor: totalEscrowMinor,
      milestoneCount: contract.milestones.length,
    },
  };
}
