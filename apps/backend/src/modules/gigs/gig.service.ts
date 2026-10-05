// === IMPORTS ===
import type {
  CreateGigInput,
  CreateGigOrderInput,
  CreateGigReviewInput,
  GigSearchQuery,
  UpdateGigInput,
} from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { calculateFees, type FeeBreakdown } from "../escrow/fees.js";
import { env } from "../../config/env.js";
import { notificationQueue, gigAutoReleaseQueue } from "../../queue/queues.js";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  isSearchConfigured,
  indexGig,
  searchText,
} from "../search/searchIndex.service.js";

// === ERRORS ===
export class GigForbiddenError extends Error {}
export class GigNotFoundError extends Error {}
export class GigPackageNotFoundError extends Error {}
export class GigOrderNotFoundError extends Error {}
export class GigInvalidStateError extends Error {}
export class GigNotPartyError extends Error {}
export class GigInsufficientBalanceError extends Error {}

// === HELPERS ===
function autoReleaseDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + env.AUTO_RELEASE_WINDOW_DAYS);
  return d;
}

/** Upsert platform revenue + create an append-only fee credit for a gig order
 * release. Mirrors escrow.service.ts recordPlatformEarnings but keys the
 * PlatformFeeCredit by gigOrderId instead of milestoneId. Exported for the
 * gig-dispute resolution path (gigDispute.service.ts). */
export async function recordGigPlatformEarnings(
  fees: FeeBreakdown,
  gigOrderId: string,
) {
  const totalFeeMinor =
    fees.platformFeeFromFreelancerMinor + fees.platformFeeFromClientMinor;
  await prisma.$transaction([
    prisma.platformOperatingAccount.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        accumulatedFeeMinor: totalFeeMinor,
        accumulatedWithholdingMinor: fees.withholdingTaxMinor,
      },
      update: {
        accumulatedFeeMinor: { increment: totalFeeMinor },
        accumulatedWithholdingMinor: { increment: fees.withholdingTaxMinor },
      },
    }),
    prisma.platformFeeCredit.create({
      data: {
        gigOrderId,
        feeFromFreelancerMinor: fees.platformFeeFromFreelancerMinor,
        feeFromClientMinor: fees.platformFeeFromClientMinor,
        withholdingMinor: fees.withholdingTaxMinor,
      },
    }),
  ]);
}

// === GIG CRUD ===
export async function createGig(params: {
  freelancerId: string;
  freelancerRole: string;
  input: CreateGigInput;
}) {
  if (params.freelancerRole !== "FREELANCER" && params.freelancerRole !== "BOTH") {
    throw new GigForbiddenError("Only freelancer accounts can publish gigs.");
  }

  const gig = await prisma.gig.create({
    data: {
      freelancerId: params.freelancerId,
      title: params.input.title,
      category: params.input.category,
      description: params.input.description,
      tags: params.input.tags,
      requirements: params.input.requirements,
      faqJson: params.input.faqJson ?? Prisma.JsonNull,
      thumbnailUrl: params.input.thumbnailUrl ?? null,
      mediaUrls: params.input.mediaUrls ?? [],
      autoAcceptOrders: params.input.autoAcceptOrders,
      maxRevisions: params.input.maxRevisions,
      packages: {
        create: params.input.packages.map((p) => ({
          tier: p.tier,
          title: p.title,
          description: p.description,
          deliveryDays: p.deliveryDays,
          revisionsIncluded: p.revisionsIncluded,
          priceMinor: p.priceMinor,
          addOns: p.addOns ?? Prisma.JsonNull,
        })),
      },
    },
    include: { packages: true },
  });

  await recordAuditEvent({
    userId: params.freelancerId,
    eventType: "GIG_CREATED",
    entityType: "Gig",
    entityId: gig.id,
    metadata: { category: gig.category, status: gig.status },
  });

  // Search index upsert — no-op unless OPENSEARCH_URL is configured.
  await indexGig(gig);

  return gig;
}

export async function searchGigs(query: GigSearchQuery) {
  // OpenSearch path: typo-tolerant scored search when configured & reachable.
  // Falls through to Postgres whenever OpenSearch is absent or errors, so
  // search never hard-fails.
  if (isSearchConfigured() && query.q) {
    const hits = await searchText("gigs", query.q, 100);
    if (hits) {
      const ids = hits.map((h) => h.id);
      const byId = new Map(hits.map((h) => [h.id, h.score]));
      const rows = await prisma.gig.findMany({
        where: {
          id: { in: ids },
          // Hard-coded, never caller-supplied: search is unauthenticated, so a
          // request-controlled status filter would expose unpublished gigs.
          status: "ACTIVE",
          ...(query.category ? { category: query.category } : {}),
        },
        include: {
          packages: { orderBy: { priceMinor: "asc" } },
          freelancer: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      });
      // Preserve OpenSearch relevance order, then slice the page.
      const sorted = rows
        .sort((a, b) => (byId.get(b.id) ?? 0) - (byId.get(a.id) ?? 0))
        .slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
      const total = rows.length;
      return { items: sorted, total, page: query.page, pageSize: query.pageSize };
    }
  }

  const where = {
    // Hard-coded, never caller-supplied — see the note in the OpenSearch branch
    // above. GigSearchQuery has no `status` field for the same reason.
    status: "ACTIVE" as const,
    ...(query.category ? { category: query.category } : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: "insensitive" as const } },
            { description: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.gig.findMany({
      where,
      orderBy: [{ ratingAverage: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        packages: { orderBy: { priceMinor: "asc" } },
        freelancer: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    }),
    prisma.gig.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

/**
 * Staff moderation decision on a gig listing — the only path to ACTIVE.
 *
 * Split from the owner-driven setGigStatus so the audit trail records who
 * published or rejected the gig. Deliberately available now, before the ops
 * console moderation page (plan Phase 3): owners cannot self-publish, so
 * without this endpoint every gig would sit in DRAFT forever.
 */
export async function moderateGigStatus(params: {
  staffUserId: string;
  gigId: string;
  status: "ACTIVE" | "REJECTED" | "PAUSED" | "ARCHIVED";
  reason?: string;
}) {
  const gig = await prisma.gig.findUnique({ where: { id: params.gigId } });
  if (!gig) throw new GigNotFoundError();

  const updated = await prisma.gig.update({
    where: { id: params.gigId },
    data: { status: params.status },
  });

  await recordAuditEvent({
    userId: params.staffUserId,
    eventType: "GIG_STATUS_CHANGED",
    entityType: "Gig",
    entityId: params.gigId,
    metadata: {
      status: params.status,
      previousStatus: gig.status,
      decidedByStaffId: params.staffUserId,
      reason: params.reason,
    },
  });

  // Keep the search index aligned with the visibility state, so an approved gig
  // is discoverable immediately (indexGig is also called on create).
  await indexGig(updated);

  return updated;
}

/**
 * Owner-driven status changes.
 *
 * ACTIVE and REJECTED are deliberately NOT owner-settable: publication is a
 * staff moderation decision (GIG_MODEL_PLAN.md §8 decision 3), and letting a
 * seller self-approve or self-reject defeats it. `status` is narrowed by the
 * route's allow-list, and this guard re-checks so a future caller cannot widen
 * it by passing a cast value straight to the service.
 */
const OWNER_SETTABLE_STATUS = ["PAUSED", "ARCHIVED"] as const;

/**
 * A gig is public only once ACTIVE. DRAFT / REJECTED / ARCHIVED listings stay
 * visible to their owner (so they can edit or resubmit) and to staff, and are
 * reported as not-found to everyone else — 404 rather than 403, because
 * confirming that a draft id exists is itself a disclosure.
 */
export async function getGigById(gigId: string, viewer?: { userId?: string | null; staffRole?: string | null }) {
  const gig = await prisma.gig.findUnique({
    where: { id: gigId },
    include: {
      packages: { orderBy: { priceMinor: "asc" } },
      freelancer: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          profileCompleteness: true,
        },
      },
    },
  });
  if (!gig) throw new GigNotFoundError();

  if (gig.status !== "ACTIVE") {
    const isOwner = !!viewer?.userId && viewer.userId === gig.freelancerId;
    if (!isOwner && !viewer?.staffRole) throw new GigNotFoundError();
  }

  return gig;
}

export async function updateGig(params: {
  ownerId: string;
  gigId: string;
  input: UpdateGigInput;
}) {
  const gig = await prisma.gig.findUnique({ where: { id: params.gigId } });
  if (!gig) throw new GigNotFoundError();
  if (gig.freelancerId !== params.ownerId)
    throw new GigForbiddenError("Not your gig.");

  const updated = await prisma.gig.update({
    where: { id: params.gigId },
    data: {
      title: params.input.title,
      category: params.input.category,
      description: params.input.description,
      tags: params.input.tags,
      requirements: params.input.requirements,
      faqJson: params.input.faqJson,
      thumbnailUrl: params.input.thumbnailUrl,
      mediaUrls: params.input.mediaUrls,
      autoAcceptOrders: params.input.autoAcceptOrders,
      maxRevisions: params.input.maxRevisions,
    },
  });

  await recordAuditEvent({
    userId: params.ownerId,
    eventType: "GIG_UPDATED",
    entityType: "Gig",
    entityId: params.gigId,
  });
  return updated;
}

export async function setGigStatus(params: {
  ownerId: string;
  gigId: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "REJECTED";
}) {
  const gig = await prisma.gig.findUnique({ where: { id: params.gigId } });
  if (!gig) throw new GigNotFoundError();
  if (gig.freelancerId !== params.ownerId)
    throw new GigForbiddenError("Not your gig.");

  if (!(OWNER_SETTABLE_STATUS as readonly string[]).includes(params.status)) {
    throw new GigForbiddenError(
      "Only PAUSED and ARCHIVED can be set by the gig owner. Publishing and rejection are staff decisions.",
    );
  }

  const updated = await prisma.gig.update({
    where: { id: params.gigId },
    data: { status: params.status },
  });

  await recordAuditEvent({
    userId: params.ownerId,
    eventType: "GIG_STATUS_CHANGED",
    entityType: "Gig",
    entityId: params.gigId,
    metadata: { status: params.status },
  });

  // Keep the search index current with the visibility state.
  await indexGig(updated);

  return updated;
}

export async function listMyGigs(ownerId: string) {
  return prisma.gig.findMany({
    where: { freelancerId: ownerId },
    include: {
      packages: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// === GIG ORDERS ===
export async function createGigOrder(params: {
  clientId: string;
  input: CreateGigOrderInput;
}) {
  const packageItem = await prisma.gigPackage.findUnique({
    where: { id: params.input.packageId },
    include: { gig: true },
  });
  if (!packageItem) throw new GigPackageNotFoundError();
  if (packageItem.gig.status !== "ACTIVE")
    throw new GigInvalidStateError("This gig is not currently accepting orders.");
  if (packageItem.gig.freelancerId === params.clientId)
    throw new GigForbiddenError("You cannot order your own gig.");

  const order = await prisma.gigOrder.create({
    data: {
      gigId: packageItem.gigId,
      packageId: packageItem.id,
      clientId: params.clientId,
      requirementsAnswer: params.input.requirementsAnswer ?? Prisma.JsonNull,
      totalChargeMinor: packageItem.priceMinor, // gross; client fee added at funding
      status: "PENDING_PAYMENT",
    },
  });

  await recordAuditEvent({
    userId: params.clientId,
    eventType: "GIG_ORDER_CREATED",
    entityType: "GigOrder",
    entityId: order.id,
    metadata: { gigId: packageItem.gigId, packageId: packageItem.id },
  });

  return order;
}

export async function fundGigOrderFromWallet(params: {
  clientId: string;
  orderId: string;
}) {
  const order = await prisma.gigOrder.findUnique({
    where: { id: params.orderId },
    include: { package: true, gig: true },
  });
  if (!order) throw new GigOrderNotFoundError();
  if (order.clientId !== params.clientId) throw new GigNotPartyError();

  if (order.escrowState !== "PAYMENT_PENDING" || order.status !== "PENDING_PAYMENT") {
    throw new GigInvalidStateError(
      `Cannot fund an order in state ${order.status}/${order.escrowState}.`,
    );
  }

  const freelancerKyc = await prisma.kycRecord.findUnique({
    where: { userId: order.gig.freelancerId },
  });
  const fees = calculateFees({
    milestoneAmountMinor: order.package.priceMinor,
    freelancerHasTin: !!freelancerKyc?.tin,
  });

  const wallet = await prisma.wallet.findUnique({
    where: { userId: params.clientId },
  });
  if (!wallet || wallet.balanceMinor < fees.clientTotalChargeMinor) {
    throw new GigInsufficientBalanceError(
      `Insufficient wallet balance. Required: ${fees.clientTotalChargeMinor}, available: ${wallet?.balanceMinor ?? 0}.`,
    );
  }

  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId: params.clientId },
      data: { balanceMinor: { decrement: fees.clientTotalChargeMinor } },
    }),
    prisma.gigOrder.update({
      where: { id: order.id },
      data: {
        totalChargeMinor: fees.clientTotalChargeMinor,
        escrowState: "ESCROW_HELD",
        status: "ESCROW_HELD",
      },
    }),
  ]);

  await recordAuditEvent({
    userId: params.clientId,
    eventType: "GIG_ORDER_FUNDED",
    entityType: "GigOrder",
    entityId: order.id,
    metadata: { chargedMinor: fees.clientTotalChargeMinor },
  });

  await notificationQueue.add("gig-order-funded", {
    userId: order.gig.freelancerId,
    gigOrderId: order.id,
    message: "A gig order has been funded — you can begin work.",
  });

  return prisma.gigOrder.findUniqueOrThrow({ where: { id: order.id } });
}

export async function submitGigDelivery(params: {
  freelancerId: string;
  orderId: string;
  deliverableUrl?: string;
}) {
  const order = await prisma.gigOrder.findUnique({
    where: { id: params.orderId },
    include: { gig: true },
  });
  if (!order) throw new GigOrderNotFoundError();
  if (order.gig.freelancerId !== params.freelancerId)
    throw new GigNotPartyError();

  if (order.escrowState !== "ESCROW_HELD" && order.escrowState !== "WORK_IN_PROGRESS") {
    throw new GigInvalidStateError(`Cannot deliver in state ${order.escrowState}.`);
  }

  const releaseAt = autoReleaseDate();

  const updated = await prisma.gigOrder.update({
    where: { id: order.id },
    data: {
      escrowState: "SUBMITTED_FOR_REVIEW",
      status: "SUBMITTED_FOR_REVIEW",
      submittedAt: new Date(),
      autoReleaseAt: releaseAt,
      deliverableUrl: params.deliverableUrl ?? order.deliverableUrl,
      revisionStatus: "SUBMITTED",
    },
  });

  await gigAutoReleaseQueue.add(
    "release",
    { gigOrderId: order.id },
    {
      jobId: `release-${order.id}`,
      delay: releaseAt.getTime() - Date.now(),
    },
  );

  await recordAuditEvent({
    userId: params.freelancerId,
    eventType: "GIG_DELIVERY_SUBMITTED",
    entityType: "GigOrder",
    entityId: order.id,
    metadata: { autoReleaseAt: releaseAt },
  });

  await notificationQueue.add("gig-delivery-submitted", {
    userId: order.clientId,
    gigOrderId: order.id,
    message: "Your gig delivery is ready for review.",
  });

  return updated;
}

export async function requestGigRevision(params: {
  clientId: string;
  orderId: string;
  note: string;
}) {
  const order = await prisma.gigOrder.findUnique({
    where: { id: params.orderId },
    include: { gig: true },
  });
  if (!order) throw new GigOrderNotFoundError();
  if (order.clientId !== params.clientId) throw new GigNotPartyError();
  if (order.escrowState !== "SUBMITTED_FOR_REVIEW")
    throw new GigInvalidStateError(`Cannot request revision in state ${order.escrowState}.`);

  if (order.revisionsUsed >= order.gig.maxRevisions) {
    throw new GigInvalidStateError("Revision limit reached.");
  }

  // Return the order to in-progress so the freelancer can resubmit.
  const updated = await prisma.gigOrder.update({
    where: { id: order.id },
    data: {
      escrowState: "WORK_IN_PROGRESS",
      status: "WORK_IN_PROGRESS",
      revisionStatus: "REQUESTED",
      revisionRequestNote: params.note,
      revisionsUsed: { increment: 1 },
      autoReleaseAt: null,
    },
  });

  await gigAutoReleaseQueue.remove(`release-${order.id}`);

  await recordAuditEvent({
    userId: params.clientId,
    eventType: "GIG_REVISION_REQUESTED",
    entityType: "GigOrder",
    entityId: order.id,
  });

  await notificationQueue.add("gig-revision-requested", {
    userId: order.gig.freelancerId,
    gigOrderId: order.id,
    message: "The client requested a revision.",
  });

  return updated;
}

/** Explicit client acceptance — releases funds minus fees/withholding. */
export async function acceptGigOrder(params: {
  clientId: string;
  orderId: string;
}) {
  const order = await prisma.gigOrder.findUnique({
    where: { id: params.orderId },
    include: { gig: true, package: true },
  });
  if (!order) throw new GigOrderNotFoundError();
  if (order.clientId !== params.clientId) throw new GigNotPartyError();
  if (order.escrowState !== "SUBMITTED_FOR_REVIEW")
    throw new GigInvalidStateError(`Cannot accept an order in state ${order.escrowState}.`);

  const freelancerKyc = await prisma.kycRecord.findUnique({
    where: { userId: order.gig.freelancerId },
  });
  const fees = calculateFees({
    milestoneAmountMinor: order.package.priceMinor,
    freelancerHasTin: !!freelancerKyc?.tin,
  });

  await prisma.$transaction(async (tx) => {
    const claim = await tx.gigOrder.updateMany({
      where: { id: order.id, escrowState: "SUBMITTED_FOR_REVIEW" },
      data: { escrowState: "RELEASED", status: "COMPLETED", releasedAt: new Date() },
    });
    if (claim.count === 0) return;

    await tx.wallet.update({
      where: { userId: order.gig.freelancerId },
      data: { balanceMinor: { increment: fees.freelancerNetMinor } },
    });
    await tx.user.update({
      where: { id: order.gig.freelancerId },
      data: { totalEarnedNetMinor: { increment: fees.freelancerNetMinor } },
    });
  });

  await recordGigPlatformEarnings(fees, order.id);

  await gigAutoReleaseQueue.remove(`release-${order.id}`);

  await recordAuditEvent({
    userId: params.clientId,
    eventType: "GIG_ORDER_ACCEPTED",
    entityType: "GigOrder",
    entityId: order.id,
  });

  await notificationQueue.add("gig-order-completed", {
    userId: order.gig.freelancerId,
    gigOrderId: order.id,
    message: "A gig order was accepted and funds were released.",
  });

  return prisma.gigOrder.findUniqueOrThrow({ where: { id: order.id } });
}

// === GIG REVIEWS ===
export async function createGigReview(params: {
  authorId: string;
  orderId: string;
  input: CreateGigReviewInput;
}) {
  const order = await prisma.gigOrder.findUnique({
    where: { id: params.orderId },
    include: { gig: true },
  });
  if (!order) throw new GigOrderNotFoundError();
  if (order.clientId !== params.authorId) throw new GigNotPartyError();
  if (order.status !== "COMPLETED")
    throw new GigInvalidStateError("Only completed orders can be reviewed.");

  const existing = await prisma.gigReview.findUnique({
    where: { orderId: order.id },
  });
  if (existing) throw new GigInvalidStateError("This order was already reviewed.");

  const review = await prisma.gigReview.create({
    data: {
      orderId: order.id,
      authorId: params.authorId,
      targetUserId: order.gig.freelancerId,
      rating: params.input.rating,
      categoryRatings: params.input.categoryRatings,
      comment: params.input.comment ?? null,
      isBlind: true,
    },
  });

  await recordAuditEvent({
    userId: params.authorId,
    eventType: "GIG_REVIEWED",
    entityType: "GigOrder",
    entityId: order.id,
  });

  return review;
}