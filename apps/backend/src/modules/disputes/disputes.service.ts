// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { DisputeCategory, DisputeStage, EscrowState } from "@prisma/client";

// === MAIN FUNCTIONS ===
export class DisputesService {
  static async raiseDispute(params: {
    contractId: string;
    milestoneId: string;
    raisedByUserId: string;
    category: DisputeCategory;
    description: string;
  }) {
    const contract = await prisma.contract.findUnique({
      where: { id: params.contractId },
      include: { milestones: true },
    });

    if (!contract) throw new Error("CONTRACT_NOT_FOUND");
    if (
      contract.clientId !== params.raisedByUserId &&
      contract.freelancerId !== params.raisedByUserId
    ) {
      throw new Error("UNAUTHORIZED_PARTY_FOR_DISPUTE");
    }

    // Freeze contract milestones to DISPUTED state
    await prisma.milestone.updateMany({
      where: {
        contractId: params.contractId,
        escrowState: {
          in: [EscrowState.ESCROW_HELD, EscrowState.SUBMITTED_FOR_REVIEW],
        },
      },
      data: { escrowState: EscrowState.DISPUTED },
    });

    const dispute = await prisma.dispute.create({
      data: {
        contractId: params.contractId,
        milestoneId: params.milestoneId,
        raisedByUserId: params.raisedByUserId,
        category: params.category,
        stage: DisputeStage.STAGE_1_NEGOTIATION,
        description: params.description,
      },
    });

    await recordAuditEvent({
      userId: params.raisedByUserId,
      eventType: "DISPUTE_RAISED",
      entityType: "Dispute",
      entityId: dispute.id,
      metadata: {
        category: params.category,
        stage: DisputeStage.STAGE_1_NEGOTIATION,
      },
    });

    return dispute;
  }

  static async advanceDisputeStage(params: {
    disputeId: string;
    nextStage: DisputeStage;
    actorUserId: string;
    evidenceBundlePath?: string;
    mediatorRecommendation?: string;
  }) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: params.disputeId },
    });
    if (!dispute) throw new Error("DISPUTE_NOT_FOUND");

    const updateData: Record<string, unknown> = { stage: params.nextStage };

    if (params.nextStage === DisputeStage.STAGE_2_EVIDENCE) {
      updateData.evidenceBundlePath =
        params.evidenceBundlePath ||
        `evidence/${dispute.contractId}/bundle-v1.json`;
    }

    if (
      params.nextStage === DisputeStage.STAGE_3_MEDIATION &&
      params.mediatorRecommendation
    ) {
      updateData.mediatorRecommendation = params.mediatorRecommendation;
    }

    if (params.nextStage === DisputeStage.RESOLVED) {
      updateData.resolvedAt = new Date();
    }

    const updated = await prisma.dispute.update({
      where: { id: params.disputeId },
      data: updateData,
    });

    await recordAuditEvent({
      userId: params.actorUserId,
      eventType: "DISPUTE_STAGE_ADVANCED",
      entityType: "Dispute",
      entityId: params.disputeId,
      metadata: { previousStage: dispute.stage, newStage: params.nextStage },
    });

    return updated;
  }

  static async getDisputeByContract(contractId: string) {
    const dispute = await prisma.dispute.findFirst({
      where: { contractId },
      include: {
        contract: {
          include: {
            job: true,
            client: { select: { id: true, email: true, ucid: true } },
            freelancer: { select: { id: true, email: true, ucid: true } },
            milestones: true,
          },
        },
      },
    });

    return dispute;
  }

  static async listMediatorQueue() {
    return prisma.dispute.findMany({
      where: {
        stage: {
          in: [DisputeStage.STAGE_2_EVIDENCE, DisputeStage.STAGE_3_MEDIATION],
        },
      },
      include: {
        contract: {
          include: {
            client: { select: { id: true, email: true } },
            freelancer: { select: { id: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }
}
