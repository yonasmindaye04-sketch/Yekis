import { z } from "zod";
import { MilestonePlanItem } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { uploadContractDocument } from "./contractStorage.js";
import {
  generateServiceAgreementPdf,
  SERVICE_AGREEMENT_TEMPLATE_VERSION,
} from "./serviceAgreement.template.js";

export class ContractNotFoundError extends Error {}
export class NotContractPartyError extends Error {}
export class AlreadyAcceptedError extends Error {}
export class ProposalNotAcceptedError extends Error {}
export class CoolingOffExpiredError extends Error {}
export class ContractWorkAlreadyStartedError extends Error {}

const MilestoneBreakdown = z.array(MilestonePlanItem).min(1);

/**
 * The handoff point referenced by the TODO in proposals.service.ts. Called
 * right after a proposal is marked ACCEPTED (same request, same logical
 * transaction boundary at the call site) — not on a queue, since the client
 * is waiting to see the generated contract immediately.
 *
 * Seeds Milestone rows from the freelancer's accepted milestoneBreakdown
 * (not the client's original proposedMilestones on the Job) — that's what
 * the two parties actually agreed to via the accepted proposal.
 */
export async function createContractFromProposal(proposalId: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { job: true, freelancer: true },
  });
  if (!proposal) throw new ContractNotFoundError("Proposal not found.");
  if (proposal.status !== "ACCEPTED") {
    throw new ProposalNotAcceptedError("Contract can only be created from an ACCEPTED proposal.");
  }

  const client = await prisma.user.findUniqueOrThrow({ where: { id: proposal.job.clientId } });

  const milestonePlan = MilestoneBreakdown.parse(proposal.milestoneBreakdown);
  const totalAmountMinor = milestonePlan.reduce((sum, m) => sum + m.amount.amountMinor, 0);

  const pdfBytes = await generateServiceAgreementPdf({
    contractId: proposal.jobId, // placeholder id in the PDF body itself; real Contract.id assigned below
    jobTitle: proposal.job.title,
    jobDescription: proposal.job.description,
    clientEmail: client.email,
    freelancerEmail: proposal.freelancer.email,
    milestones: milestonePlan.map((m) => ({
      title: m.title,
      amountMinor: m.amount.amountMinor,
      dueDate: new Date(m.dueDate),
    })),
    totalAmountMinor,
    generatedAt: new Date(),
  });

  const storagePath = await uploadContractDocument({
    jobId: proposal.jobId,
    fileBuffer: pdfBytes,
  });

  const contract = await prisma.$transaction(async (tx) => {
    const created = await tx.contract.create({
      data: {
        jobId: proposal.jobId,
        clientId: proposal.job.clientId,
        freelancerId: proposal.freelancerId,
        templateVersion: SERVICE_AGREEMENT_TEMPLATE_VERSION,
        documentStoragePath: storagePath,
        milestones: {
          create: milestonePlan.map((m) => ({
            title: m.title,
            amountMinor: m.amount.amountMinor,
            dueDate: new Date(m.dueDate),
          })),
        },
      },
      include: { milestones: true },
    });
    return created;
  });

  await recordAuditEvent({
    eventType: "CONTRACT_GENERATED",
    entityType: "Contract",
    entityId: contract.id,
    metadata: { jobId: proposal.jobId, proposalId, templateVersion: SERVICE_AGREEMENT_TEMPLATE_VERSION },
  });

  return contract;
}

export async function getContract(userId: string, contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { milestones: true, job: true },
  });
  if (!contract) throw new ContractNotFoundError();
  if (contract.clientId !== userId && contract.freelancerId !== userId) {
    throw new NotContractPartyError("Not a party to this contract.");
  }
  return contract;
}

/**
 * Digital acceptance — required from BOTH parties before escrow funding
 * can begin (enforced by the Escrow module checking both timestamps, not
 * by this function). Each acceptance is independently timestamped and
 * immutable, per the Electronic Transactions Proclamation No. 1205/2020
 * recognition of e-signatures.
 */
export async function acceptContract(userId: string, contractId: string) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) throw new ContractNotFoundError();

  const isClient = contract.clientId === userId;
  const isFreelancer = contract.freelancerId === userId;
  if (!isClient && !isFreelancer) throw new NotContractPartyError("Not a party to this contract.");

  if (isClient && contract.clientAcceptedAt) throw new AlreadyAcceptedError("Client already accepted.");
  if (isFreelancer && contract.freelancerAcceptedAt) {
    throw new AlreadyAcceptedError("Freelancer already accepted.");
  }

  const updated = await prisma.contract.update({
    where: { id: contractId },
    data: isClient ? { clientAcceptedAt: new Date() } : { freelancerAcceptedAt: new Date() },
  });

  await recordAuditEvent({
    userId,
    eventType: "CONTRACT_ACCEPTED",
    entityType: "Contract",
    entityId: contractId,
    metadata: { role: isClient ? "CLIENT" : "FREELANCER" },
  });

  const fullyExecuted = !!updated.clientAcceptedAt && !!updated.freelancerAcceptedAt;
  if (fullyExecuted) {
    await recordAuditEvent({
      eventType: "CONTRACT_FULLY_EXECUTED",
      entityType: "Contract",
      entityId: contractId,
    });
    // TODO (Escrow module): this is the trigger point to notify the client
    // that escrow funding is now available — wire a notification here once
    // the Notifications module exists.
  }

  return { ...updated, fullyExecuted };
}

/**
 * Recomputes and persists Contract.status. Called from escrow.service.ts
 * whenever a milestone reaches a terminal escrow state (RELEASED, REFUNDED,
 * or PARTIAL_REFUND) — a contract is COMPLETED once every one of its
 * milestones has landed in one of those three states. This is what
 * Review.isEligible (profiles/reviews feature) should actually check
 * instead of a Contract.status field that didn't previously exist.
 */
const TERMINAL_ESCROW_STATES = ["RELEASED", "REFUNDED", "PARTIAL_REFUND"];

/**
 * T2-E: Statutory 7-day cooling-off cancellation — Electronic Transactions
 * Proclamation No. 1205/2020 grants the consumer (client) a right to cancel
 * without penalty before service begins. The auto-release worker already
 * defers to `cancellableUntil`; this is the client-side exercise path the
 * schema comment promised.
 *
 * Rules enforced here:
 *   1. Only the CLIENT party of the contract may invoke it.
 *   2. Only while cancellableUntil is in the future.
 *   3. ONLY while every milestone is still PAYMENT_PENDING — the instant any
 *      funds are held (provider or wallet funding), "service has begun" and
 *      the statutory right no longer applies.
 * No money moves: by rule 3 there is nothing in escrow to refund.
 */
export async function cancelDuringCoolingOff(params: { userId: string; contractId: string }) {
  const contract = await prisma.contract.findUnique({
    where: { id: params.contractId },
    select: {
      id: true,
      clientId: true,
      status: true,
      cancellableUntil: true,
      milestones: { select: { escrowState: true } },
    },
  });

  if (!contract) throw new ContractNotFoundError();
  if (contract.clientId !== params.userId) throw new NotContractPartyError();

  if (!contract.cancellableUntil || contract.cancellableUntil <= new Date()) {
    throw new CoolingOffExpiredError(
      "The 7-day cooling-off window for this contract has expired."
    );
  }

  const progressedMilestone = contract.milestones.find((m) => m.escrowState !== "PAYMENT_PENDING");
  if (progressedMilestone) {
    throw new ContractWorkAlreadyStartedError(
      "Cooling-off cancellation is only available before work begins (no milestone funded)."
    );
  }

  // Atomic claim so a concurrent accept/termination can't interleave.
  const claim = await prisma.contract.updateMany({
    where: { id: contract.id, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });

  if (claim.count === 0) {
    throw new AlreadyAcceptedError("Contract is no longer active.");
  }

  await recordAuditEvent({
    userId: params.userId,
    eventType: "CONTRACT_CANCELLED_COOLING_OFF",
    entityType: "Contract",
    entityId: contract.id,
    metadata: {
      cancellableUntil: contract.cancellableUntil,
      legalBasis: "Electronic Transactions Proclamation No. 1205/2020 - Art. cooling-off right",
    },
  });

  return prisma.contract.findUniqueOrThrow({ where: { id: contract.id } });
}

export async function checkAndUpdateContractCompletion(milestoneId: string) {
  const milestone = await prisma.milestone.findUniqueOrThrow({
    where: { id: milestoneId },
    select: { contractId: true },
  });

  const siblingMilestones = await prisma.milestone.findMany({
    where: { contractId: milestone.contractId },
    select: { escrowState: true },
  });

  const allTerminal = siblingMilestones.every((m) => TERMINAL_ESCROW_STATES.includes(m.escrowState));
  if (!allTerminal) return;

  await prisma.contract.update({
    where: { id: milestone.contractId },
    data: { status: "COMPLETED" },
  });

  await recordAuditEvent({
    eventType: "CONTRACT_COMPLETED",
    entityType: "Contract",
    entityId: milestone.contractId,
  });
}
