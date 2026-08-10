// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { uploadPrivateDocument } from "../../lib/objectStore.js";
import { logger } from "../../lib/logger.js";
import type { PaymentProvider } from "@prisma/client";


// === MAIN FUNCTIONS ===
export class TopUpNotFoundError extends Error {}
export class TopUpAlreadyProcessedError extends Error {}


// === INTERFACES & TYPES ===
export type TopUpRail = PaymentProvider;

export interface CreateTopUpRequestInput {
  userId: string;
  amountMinor: number;
  rail: TopUpRail;
  senderName: string;
  senderReference: string;
  receiptBuffer: Buffer;
  receiptContentType: string;
  receiptFileName: string;
}

export interface TopUpRequestResponse {
  id: string;
  userId: string;
  amountMinor: number;
  rail: TopUpRail;
  senderName: string;
  senderReference: string;
  receiptPath: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  createdAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
}

async function uploadReceipt(
  userId: string,
  buffer: Buffer,
  contentType: string,
  _fileName: string
): Promise<string> {
  return uploadPrivateDocument({
    folder: "topup-receipts",
    userId,
    fileBuffer: buffer,
    contentType,
  });
}

export async function createTopUpRequest(input: CreateTopUpRequestInput): Promise<TopUpRequestResponse> {
  const receiptPath = await uploadReceipt(input.userId, input.receiptBuffer, input.receiptContentType, input.receiptFileName);

  const topUp = await prisma.topUpRequest.create({
    data: {
      userId: input.userId,
      amountMinor: input.amountMinor,
      rail: input.rail,
      senderName: input.senderName,
      senderReference: input.senderReference,
      receiptPath,
      status: "PENDING_REVIEW",
    },
  });

  await recordAuditEvent({
    userId: input.userId,
    eventType: "TOPUP_REQUEST_CREATED",
    entityType: "TopUpRequest",
    entityId: topUp.id,
    metadata: {
      amountMinor: input.amountMinor,
      rail: input.rail,
      senderReference: input.senderReference,
    },
  });

  return {
    id: topUp.id,
    userId: topUp.userId,
    amountMinor: topUp.amountMinor,
    rail: topUp.rail,
    senderName: topUp.senderName,
    senderReference: topUp.senderReference,
    receiptPath: topUp.receiptPath,
    status: topUp.status as TopUpRequestResponse["status"],
    createdAt: topUp.createdAt,
    reviewedAt: topUp.reviewedAt,
    reviewedBy: topUp.reviewedBy,
    rejectionReason: topUp.rejectionReason,
  };
}

export async function getTopUpRequests(userId: string): Promise<TopUpRequestResponse[]> {
  const requests = await prisma.topUpRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((r) => ({
    id: r.id,
    userId: r.userId,
    amountMinor: r.amountMinor,
    rail: r.rail,
    senderName: r.senderName,
    senderReference: r.senderReference,
    receiptPath: r.receiptPath,
    status: r.status as TopUpRequestResponse["status"],
    createdAt: r.createdAt,
    reviewedAt: r.reviewedAt,
    reviewedBy: r.reviewedBy,
    rejectionReason: r.rejectionReason,
  }));
}

export async function getTopUpRequestById(topUpId: string): Promise<TopUpRequestResponse | null> {
  const topUp = await prisma.topUpRequest.findUnique({ where: { id: topUpId } });
  if (!topUp) return null;

  return {
    id: topUp.id,
    userId: topUp.userId,
    amountMinor: topUp.amountMinor,
    rail: topUp.rail,
    senderName: topUp.senderName,
    senderReference: topUp.senderReference,
    receiptPath: topUp.receiptPath,
    status: topUp.status as TopUpRequestResponse["status"],
    createdAt: topUp.createdAt,
    reviewedAt: topUp.reviewedAt,
    reviewedBy: topUp.reviewedBy,
    rejectionReason: topUp.rejectionReason,
  };
}

export interface ReviewTopUpInput {
  staffUserId: string;
  topUpId: string;
  decision: "APPROVED" | "REJECTED";
  rejectionReason?: string;
}

export async function reviewTopUpRequest(input: ReviewTopUpInput): Promise<TopUpRequestResponse> {
  const topUp = await prisma.topUpRequest.findUnique({ where: { id: input.topUpId } });
  if (!topUp) throw new TopUpNotFoundError();

  if (topUp.status !== "PENDING_REVIEW") {
    throw new TopUpAlreadyProcessedError(`Top-up request already ${topUp.status.toLowerCase()}`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedTopUp = await tx.topUpRequest.update({
      where: { id: input.topUpId },
      data: {
        status: input.decision,
        reviewedAt: new Date(),
        reviewedBy: input.staffUserId,
        rejectionReason: input.decision === "REJECTED" ? input.rejectionReason : null,
      },
    });

    if (input.decision === "APPROVED") {
      await tx.wallet.update({
        where: { userId: topUp.userId },
        data: { balanceMinor: { increment: topUp.amountMinor } },
      });

      await recordAuditEvent({
        userId: topUp.userId,
        eventType: "WALLET_CREDITED_FROM_TOPUP",
        entityType: "Wallet",
        entityId: (await tx.wallet.findUnique({ where: { userId: topUp.userId } }))?.id ?? "",
        metadata: { topUpId: topUp.id, amountMinor: topUp.amountMinor },
      });
    }

    return updatedTopUp;
  });

  await recordAuditEvent({
    userId: input.staffUserId,
    eventType: input.decision === "APPROVED" ? "TOPUP_APPROVED" : "TOPUP_REJECTED",
    entityType: "TopUpRequest",
    entityId: topUp.id,
    metadata: { reviewedBy: input.staffUserId, rejectionReason: input.rejectionReason },
  });

return {
    id: updated.id,
    userId: updated.userId,
    amountMinor: updated.amountMinor,
    rail: updated.rail,
    senderName: updated.senderName,
    senderReference: updated.senderReference,
    receiptPath: updated.receiptPath,
    status: updated.status as TopUpRequestResponse["status"],
    createdAt: updated.createdAt,
    reviewedAt: updated.reviewedAt,
    reviewedBy: updated.reviewedBy,
    rejectionReason: updated.rejectionReason,
  };
}

export async function getPendingTopUpQueue(params?: { page?: number; limit?: number; search?: string; status?: string; minAmount?: number; maxAmount?: number }) {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.max(1, Math.min(100, params?.limit || 20));

  const where: any = {};
  
  if (params?.status) {
    where.status = params.status;
  } else {
    // Default to PENDING_REVIEW if no specific status requested
    where.status = "PENDING_REVIEW";
  }

  if (params?.search) {
    where.user = {
      OR: [
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } }
      ]
    };
  }

  if (params?.minAmount || params?.maxAmount) {
    where.amountMinor = {};
    if (params.minAmount) where.amountMinor.gte = params.minAmount;
    if (params.maxAmount) where.amountMinor.lte = params.maxAmount;
  }

  const [total, requests] = await Promise.all([
    prisma.topUpRequest.count({ where }),
    prisma.topUpRequest.findMany({
      where,
      include: { user: { select: { id: true, email: true, phone: true, ucid: true } } },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    })
  ]);

  return {
    items: requests.map((r) => ({
      id: r.id,
      userId: r.userId,
      amountMinor: r.amountMinor,
      rail: r.rail,
      senderName: r.senderName,
      senderReference: r.senderReference,
      receiptPath: r.receiptPath,
      status: r.status as TopUpRequestResponse["status"],
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
      reviewedBy: r.reviewedBy,
      rejectionReason: r.rejectionReason,
      user: r.user
    })),
    total,
    page,
    pageSize: limit
  };
}
