import type { CreateJobInput, JobSearchQuery } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";

export class ForbiddenRoleError extends Error {}
export class JobNotFoundError extends Error {}
export class InvalidJobStateError extends Error {}

/** Clients (CLIENT or BOTH) post jobs. Freelancer-only accounts cannot. */
export async function createJob(params: { clientId: string; clientRole: string; input: CreateJobInput }) {
  if (params.clientRole !== "CLIENT" && params.clientRole !== "BOTH") {
    throw new ForbiddenRoleError("Only client accounts can post jobs.");
  }

  const job = await prisma.job.create({
    data: {
      clientId: params.clientId,
      title: params.input.title,
      category: params.input.category,
      description: params.input.description,
      budgetMinMinor: params.input.budgetMin.amountMinor,
      budgetMaxMinor: params.input.budgetMax.amountMinor,
      deadline: new Date(params.input.deadline),
      proposedMilestones: params.input.proposedMilestones,
    },
  });

  await recordAuditEvent({
    userId: params.clientId,
    eventType: "JOB_POSTED",
    entityType: "Job",
    entityId: job.id,
    metadata: { category: job.category },
  });

  return job;
}

export async function searchJobs(query: JobSearchQuery) {
  const where = {
    ...(query.category ? { category: query.category } : {}),
    status: query.status,
  };

  const [items, total] = await prisma.$transaction([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { _count: { select: { proposals: true } } },
    }),
    prisma.job.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getJobById(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new JobNotFoundError();
  return job;
}

/** Only the posting client can cancel, and only while still OPEN (no accepted proposal yet). */
export async function cancelJob(params: { jobId: string; requestingUserId: string }) {
  const job = await prisma.job.findUnique({ where: { id: params.jobId } });
  if (!job) throw new JobNotFoundError();
  if (job.clientId !== params.requestingUserId) throw new ForbiddenRoleError("Not your job posting.");
  if (job.status !== "OPEN") {
    throw new InvalidJobStateError(`Cannot cancel a job in status ${job.status}.`);
  }

  const updated = await prisma.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } });

  await recordAuditEvent({
    userId: params.requestingUserId,
    eventType: "JOB_CANCELLED",
    entityType: "Job",
    entityId: job.id,
  });

  return updated;
}
