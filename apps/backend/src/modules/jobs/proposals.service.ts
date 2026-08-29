// === IMPORTS ===
import type { CreateProposalInput } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import {
  ForbiddenRoleError,
  JobNotFoundError,
  InvalidJobStateError,
} from "./jobs.service.js";
import { createContractFromProposal } from "../contracts/contracts.service.js";

// === MAIN FUNCTIONS ===
export class ProposalNotFoundError extends Error {}
export class DuplicateProposalError extends Error {}
export class SelfBidError extends Error {}

/** Freelancers (FREELANCER or BOTH) bid. Cannot bid on your own job posting. */
export async function submitProposal(params: {
  freelancerId: string;
  freelancerRole: string;
  input: CreateProposalInput;
}) {
  if (
    params.freelancerRole !== "FREELANCER" &&
    params.freelancerRole !== "BOTH"
  ) {
    throw new ForbiddenRoleError(
      "Only freelancer accounts can submit proposals.",
    );
  }

  const job = await prisma.job.findUnique({
    where: { id: params.input.jobId },
  });
  if (!job) throw new JobNotFoundError();
  if (job.status !== "OPEN")
    throw new InvalidJobStateError(`Job is not open (status: ${job.status}).`);
  if (job.clientId === params.freelancerId)
    throw new SelfBidError("Cannot bid on your own job posting.");

  try {
    const proposal = await prisma.proposal.create({
      data: {
        jobId: params.input.jobId,
        freelancerId: params.freelancerId,
        coverLetter: params.input.coverLetter,
        quotedAmountMinor: params.input.quotedAmount.amountMinor,
        estimatedDays: params.input.estimatedDays,
        milestoneBreakdown: params.input.milestoneBreakdown,
        attachmentPaths: params.input.attachmentPaths || [],
      },
    });

    await recordAuditEvent({
      userId: params.freelancerId,
      eventType: "PROPOSAL_SUBMITTED",
      entityType: "Proposal",
      entityId: proposal.id,
      metadata: { jobId: job.id },
    });

    return proposal;
  } catch (err: unknown) {
    // Prisma unique constraint violation on [jobId, freelancerId]
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "P2002"
    ) {
      throw new DuplicateProposalError(
        "You already have an active proposal on this job.",
      );
    }
    throw err;
  }
}

export async function listProposalsForJob(params: {
  jobId: string;
  requestingUserId: string;
}) {
  const job = await prisma.job.findUnique({ where: { id: params.jobId } });
  if (!job) throw new JobNotFoundError();
  if (job.clientId !== params.requestingUserId) {
    throw new ForbiddenRoleError(
      "Only the posting client can view proposals for this job.",
    );
  }

  return prisma.proposal.findMany({
    where: { jobId: params.jobId },
    orderBy: { createdAt: "asc" },
    include: { freelancer: { select: { id: true, ucid: true, email: true } } },
  });
}

/**
 * The client's decision on a proposal. ACCEPTED is the significant branch:
 * it closes out every other proposal on the job and flips the job to
 * IN_PROGRESS. This function deliberately stops short of creating the
 * Contract itself — that's the Contract module's job (not yet built).
 * The TODO below is the explicit handoff point.
 */
export async function decideProposal(params: {
  proposalId: string;
  requestingUserId: string;
  decision: "SHORTLISTED" | "ACCEPTED" | "REJECTED";
}) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: params.proposalId },
    include: { job: true },
  });
  if (!proposal) throw new ProposalNotFoundError();
  if (proposal.job.clientId !== params.requestingUserId) {
    throw new ForbiddenRoleError(
      "Only the posting client can decide on this proposal.",
    );
  }
  if (proposal.status === "ACCEPTED" || proposal.status === "REJECTED") {
    throw new InvalidJobStateError(`Proposal is already ${proposal.status}.`);
  }

  if (params.decision !== "ACCEPTED") {
    const updated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: params.decision },
    });
    await recordAuditEvent({
      userId: params.requestingUserId,
      eventType: `PROPOSAL_${params.decision}`,
      entityType: "Proposal",
      entityId: proposal.id,
    });
    return updated;
  }

  // ACCEPTED — reject every other proposal on this job, and move the job
  // to IN_PROGRESS in the same transaction so there's never a moment where
  // two proposals could both look "accepted" under concurrent requests.
  const acceptedProposal = await prisma.$transaction(
    async (tx) => {
      const claimedJob = await tx.job.updateMany({
        where: { id: proposal.jobId, status: "OPEN" },
        data: { status: "IN_PROGRESS" },
      });
      if (claimedJob.count !== 1) {
        throw new InvalidJobStateError(
          "This job already has an accepted proposal.",
        );
      }

      const accepted = await tx.proposal.updateMany({
        where: {
          id: proposal.id,
          status: { in: ["SUBMITTED", "SHORTLISTED"] },
        },
        data: { status: "ACCEPTED" },
      });
      if (accepted.count !== 1) {
        throw new InvalidJobStateError("Proposal can no longer be accepted.");
      }

      await tx.proposal.updateMany({
        where: {
          jobId: proposal.jobId,
          id: { not: proposal.id },
          status: { in: ["SUBMITTED", "SHORTLISTED"] },
        },
        data: { status: "REJECTED" },
      });
      return tx.proposal.findUniqueOrThrow({ where: { id: proposal.id } });
    },
    { isolationLevel: "Serializable" },
  );

  await recordAuditEvent({
    userId: params.requestingUserId,
    eventType: "PROPOSAL_ACCEPTED",
    entityType: "Proposal",
    entityId: proposal.id,
    metadata: { jobId: proposal.jobId, freelancerId: proposal.freelancerId },
  });

  // Contract generation is synchronous and part of the same logical
  // operation as accepting the proposal — the client should see the
  // generated Service Agreement immediately, not poll for it. If this
  // throws, the accepted proposal still stands (contract creation is
  // idempotent-retryable via a future "regenerate contract" admin action;
  // it is not rolled back into the proposal transaction above because PDF
  // generation and object storage upload shouldn't hold that DB transaction
  // open).
  const contract = await createContractFromProposal(acceptedProposal.id);

  return { proposal: acceptedProposal, contract };
}

export async function withdrawProposal(params: {
  proposalId: string;
  requestingUserId: string;
}) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: params.proposalId },
  });
  if (!proposal) throw new ProposalNotFoundError();
  if (proposal.freelancerId !== params.requestingUserId) {
    throw new ForbiddenRoleError("Not your proposal.");
  }
  if (proposal.status !== "SUBMITTED" && proposal.status !== "SHORTLISTED") {
    throw new InvalidJobStateError(
      `Cannot withdraw a proposal in status ${proposal.status}.`,
    );
  }

  const updated = await prisma.proposal.update({
    where: { id: proposal.id },
    data: { status: "WITHDRAWN" },
  });

  await recordAuditEvent({
    userId: params.requestingUserId,
    eventType: "PROPOSAL_WITHDRAWN",
    entityType: "Proposal",
    entityId: proposal.id,
  });

  return updated;
}
