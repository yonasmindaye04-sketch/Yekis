import { z } from "zod";
import { MilestonePlanItem } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { uploadContractDocument } from "./contractStorage.js";
import {
  generateServiceAgreementPdf,
  SERVICE_AGREEMENT_TEMPLATE_VERSION,
} from "./serviceAgreement.template.js";
import { calculateFees } from "../escrow/fees.js";
import { notificationQueue } from "../../queue/queues.js";
import { logger } from "../../lib/logger.js";

export class ContractNotFoundError extends Error {}
export class NotContractPartyError extends Error {}
export class AlreadyAcceptedError extends Error {}
export class ProposalNotAcceptedError extends Error {}

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
    // T2-E: 7-day cooling-off right — Electronic Transactions Proclamation No. 1205/2020.
    // Client may cancel the contract within 7 days of creation, but ONLY if no milestone
    // has progressed past PAYMENT_PENDING (i.e. no work has started yet).
    // See contracts.service.ts cancelDuringCoolingOff() and autoRelease.worker.ts guard.
    const coolingOffWindowDays = 7;
    const cancellableUntil = new Date();
    cancellableUntil.setDate(cancellableUntil.getDate() + coolingOffWindowDays);

    const created = await tx.contract.create({
      data: {
        jobId: proposal.jobId,
        clientId: proposal.job.clientId,
        freelancerId: proposal.freelancerId,
        templateVersion: SERVICE_AGREEMENT_TEMPLATE_VERSION,
        documentStoragePath: storagePath,
        cancellableUntil,
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

    // Auto-fund all PAYMENT_PENDING milestones from the client's wallet.
    // This makes the flow seamless: once both parties sign, work can begin
    // immediately without a separate "Fund" click.
    try {
      const milestones = await prisma.milestone.findMany({
        where: { contractId, escrowState: "PAYMENT_PENDING" },
      });

      if (milestones.length > 0) {
        const freelancerKyc = await prisma.kycRecord.findUnique({
          where: { userId: updated.freelancerId },
        });

        // Calculate total charge across all milestones
        const totalChargeMinor = milestones.reduce((sum, m) => {
          const fees = calculateFees({
            milestoneAmountMinor: m.amountMinor,
            freelancerHasTin: !!freelancerKyc?.tin,
          });
          return sum + fees.clientTotalChargeMinor;
        }, 0);

        const clientWallet = await prisma.wallet.findUnique({
          where: { userId: updated.clientId },
        });

        if (!clientWallet || clientWallet.balanceMinor < totalChargeMinor) {
          // Insufficient balance — notify client to top up rather than blocking signature
          await notificationQueue.add("topup-required", {
            userId: updated.clientId,
            contractId,
            message: `Contract fully signed! Please top up your wallet with at least ETB ${
              (totalChargeMinor / 100).toFixed(2)
            } to fund the project escrow and allow work to begin.`,
          });
          logger.warn(
            { contractId, requiredMinor: totalChargeMinor, availableMinor: clientWallet?.balanceMinor ?? 0 },
            "Contract fully executed but client has insufficient wallet balance — notified to top up"
          );
        } else {
          // Sufficient balance — atomically debit wallet and lock all milestones
          await prisma.$transaction([
            prisma.wallet.update({
              where: { userId: updated.clientId },
              data: { balanceMinor: { decrement: totalChargeMinor } },
            }),
            ...milestones.map((m) =>
              prisma.milestone.update({
                where: { id: m.id },
                data: { escrowState: "ESCROW_HELD" },
              })
            ),
          ]);

          for (const m of milestones) {
            const fees = calculateFees({
              milestoneAmountMinor: m.amountMinor,
              freelancerHasTin: !!freelancerKyc?.tin,
            });
            await recordAuditEvent({
              userId: updated.clientId,
              eventType: "ESCROW_FUNDED_FROM_WALLET",
              entityType: "Milestone",
              entityId: m.id,
              metadata: {
                chargedMinor: fees.clientTotalChargeMinor,
                grossMinor: fees.grossAmountMinor,
                platformFeeMinor: fees.platformFeeFromClientMinor,
                source: "auto_on_contract_execution",
              },
            });
          }

          await notificationQueue.add("escrow-funded", {
            userId: updated.freelancerId,
            contractId,
            message: "Contract fully signed and escrow funded — work can begin!",
          });

          logger.info(
            { contractId, milestonesCount: milestones.length, totalChargeMinor },
            "Escrow auto-funded from client wallet on contract full execution"
          );
        }
      }
    } catch (err) {
      // Auto-funding failure must NOT block the contract acceptance response —
      // the signature itself is valid and legally binding regardless. The client
      // can manually fund from the Contracts page in the rare failure case.
      logger.error({ err, contractId }, "Auto-fund on contract execution failed — client must fund manually");
    }
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

export class CoolingOffWindowExpiredError extends Error {}
export class CoolingOffCancellationBlockedByWorkError extends Error {}

/**
 * T2-E: Allows the client to cancel a contract within the 7-day cooling-off
 * window mandated by the Electronic Transactions Proclamation No. 1205/2020,
 * but ONLY if no milestone has progressed past PAYMENT_PENDING — i.e. no
 * work has actually started yet.
 *
 * ⚠️ Conflict note: AUTO_RELEASE_WINDOW_DAYS (default 5) is shorter than
 * the 7-day cooling-off window. The autoRelease.worker guards against firing
 * during the cooling-off period, but this creates an edge case: if a freelancer
 * submits work on day 1 and the cooling-off window is still open on day 6, the
 * auto-release is blocked AND cancellation is also blocked (because a milestone
 * is past PAYMENT_PENDING). This is the correct behavior — once work is submitted,
 * the cooling-off right is extinguished and the normal dispute path applies.
 */
export async function cancelDuringCoolingOff(userId: string, contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { milestones: true },
  });
  if (!contract) throw new ContractNotFoundError();
  if (contract.clientId !== userId) throw new NotContractPartyError("Only the client can cancel during cooling-off.");

  const now = new Date();
  if (!contract.cancellableUntil || contract.cancellableUntil <= now) {
    throw new CoolingOffWindowExpiredError(
      `The 7-day cooling-off window expired at ${contract.cancellableUntil?.toISOString() ?? "unknown"}. ` +
      `Use the dispute flow if you have a disagreement about work quality.`
    );
  }

  // Check that no milestone has progressed past PAYMENT_PENDING.
  // ESCROW_HELD means funds are locked; anything beyond that means work is in flight.
  const workStarted = contract.milestones.some((m) => m.escrowState !== "PAYMENT_PENDING");
  if (workStarted) {
    throw new CoolingOffCancellationBlockedByWorkError(
      "Cannot cancel: one or more milestones have progressed past PAYMENT_PENDING. " +
      "Work has started — the cooling-off cancellation right only applies before any escrow is funded."
    );
  }

  await prisma.contract.update({
    where: { id: contractId },
    data: { status: "TERMINATED" },
  });

  await recordAuditEvent({
    userId,
    eventType: "CONTRACT_CANCELLED_COOLING_OFF",
    entityType: "Contract",
    entityId: contractId,
    metadata: { cancellableUntil: contract.cancellableUntil },
  });

  return { cancelled: true, contractId };
}

