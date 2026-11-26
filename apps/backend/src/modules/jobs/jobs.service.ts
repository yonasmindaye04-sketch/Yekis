// === IMPORTS ===
import type { CreateJobInput, JobSearchQuery } from "../../schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import {
  isSearchConfigured,
  indexJob,
  searchText,
} from "../search/searchIndex.service.js";

// === MAIN FUNCTIONS ===
export class ForbiddenRoleError extends Error {}
export class JobNotFoundError extends Error {}
export class InvalidJobStateError extends Error {}

/** Clients (CLIENT or BOTH) post jobs. Freelancer-only accounts cannot. */
export async function createJob(params: {
  clientId: string;
  clientRole: string;
  input: CreateJobInput;
}) {
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

  // Search index upsert â€” no-op unless OPENSEARCH_URL is configured.
  await indexJob(job);

  return job;
}

export async function searchJobs(query: JobSearchQuery & { q?: string }) {
  // OpenSearch path (typo-tolerant, relevance-scored) when configured; the
  // Postgres path below remains the fallback so search never hard-fails.
  if (isSearchConfigured() && query.q) {
    const hits = await searchText("jobs", query.q, 100);
    if (hits) {
      const ids = hits.map((h) => h.id);
      const byId = new Map(hits.map((h) => [h.id, h.score]));
      const rows = await prisma.job.findMany({
        where: {
          id: { in: ids },
          status: query.status,
          ...(query.category ? { category: query.category } : {}),
        },
        include: { _count: { select: { proposals: true } } },
      });
      const sorted = rows
        .sort((a, b) => (byId.get(b.id) ?? 0) - (byId.get(a.id) ?? 0))
        .slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
      return {
        items: sorted,
        total: rows.length,
        page: query.page,
        pageSize: query.pageSize,
      };
    }
  }

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

/**
 * Which freelancer skill categories are relevant to each job category.
 * A freelancer matches a brief when one of their skills falls in one of these.
 */
const JOB_TO_SKILL_CATEGORIES: Record<string, string[]> = {
  WEB_APP_DEVELOPMENT: ["DEVELOPMENT", "ENGINEERING"],
  GRAPHIC_DESIGN: ["DESIGN"],
  DIGITAL_MARKETING: ["MARKETING"],
  CONTENT_WRITING: ["WRITING"],
  TRANSLATION: ["TRANSLATION"],
  DATA_ENTRY: ["DATA_ENTRY"],
  VIDEO_PRODUCTION: ["VIDEO_AUDIO"],
  ACCOUNTING_BOOKKEEPING: ["BUSINESS"],
  LEGAL_RESEARCH: ["OTHER"],
  DATA_ANALYTICS: ["DATA_ENTRY", "ENGINEERING"],
};

/** Freelancers at or above this profile completeness also see briefs outside their skills. */
export const HIGH_COMPLETENESS_THRESHOLD = 80;

const FEED_CANDIDATE_LIMIT = 200;

/**
 * Personalised open-brief feed for a freelancer.
 *
 * 1. Briefs whose category matches the freelancer's skills come first, ranked by
 *    skill strength (primary skill counts double), profile completeness and recency.
 * 2. Freelancers with a high profile completeness (>= HIGH_COMPLETENESS_THRESHOLD)
 *    then see the remaining open briefs, after the matches.
 * 3. A freelancer with no skills yet gets the plain recent list, flagged
 *    `matchingAvailable: false` so the UI can prompt them to add skills.
 */
export async function getFreelancerFeed(params: {
  userId: string;
  page: number;
  pageSize: number;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      profileCompleteness: true,
      primarySkillId: true,
      primarySkill: { select: { category: true } },
      skills: { select: { skill: { select: { id: true, category: true } } } },
    },
  });
  if (!user) throw new JobNotFoundError();

  const completeness = user.profileCompleteness ?? 0;
  const isHighCompleteness = completeness >= HIGH_COMPLETENESS_THRESHOLD;

  // Skill count per category; the primary skill's category counts double.
  const skillCountByCategory = new Map<string, number>();
  for (const { skill } of user.skills) {
    skillCountByCategory.set(
      skill.category,
      (skillCountByCategory.get(skill.category) ?? 0) + 1,
    );
  }
  if (user.primarySkill) {
    const cat = user.primarySkill.category;
    skillCountByCategory.set(cat, (skillCountByCategory.get(cat) ?? 0) + 2);
  }
  const hasSkills = skillCountByCategory.size > 0;

  const candidates = await prisma.job.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: FEED_CANDIDATE_LIMIT,
    include: { _count: { select: { proposals: true } } },
  });

  const now = Date.now();
  const scored = candidates.map((job) => {
    const relevantCategories = JOB_TO_SKILL_CATEGORIES[job.category] ?? [];
    let skillStrength = 0;
    for (const cat of relevantCategories) {
      skillStrength += skillCountByCategory.get(cat) ?? 0;
    }
    const matched = skillStrength > 0;
    const ageDays = (now - job.createdAt.getTime()) / 86_400_000;
    const recencyScore = Math.max(0, 10 - ageDays); // up to 10, decays over 10 days
    const score =
      (matched ? 100 + Math.min(skillStrength, 10) * 5 : 0) +
      completeness * 0.2 + // up to +20 for a complete profile
      recencyScore;
    return { job, matched, score };
  });

  let visible = scored;
  if (hasSkills) {
    visible = scored.filter(
      (s) => s.matched || isHighCompleteness,
    );
  }

  visible.sort((a, b) => {
    if (a.matched !== b.matched) return a.matched ? -1 : 1;
    return b.score - a.score;
  });

  const start = (params.page - 1) * params.pageSize;
  const pageItems = visible.slice(start, start + params.pageSize);

  return {
    items: pageItems.map(({ job, matched, score }) => ({
      ...job,
      matchScore: Math.round(score),
      matchedSkills: matched,
    })),
    total: visible.length,
    page: params.page,
    pageSize: params.pageSize,
    matchingAvailable: hasSkills,
  };
}

export async function getJobById(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new JobNotFoundError();
  return job;
}

/** Only the posting client can cancel, and only while still OPEN (no accepted proposal yet). */
export async function cancelJob(params: {
  jobId: string;
  requestingUserId: string;
}) {
  const job = await prisma.job.findUnique({ where: { id: params.jobId } });
  if (!job) throw new JobNotFoundError();
  if (job.clientId !== params.requestingUserId)
    throw new ForbiddenRoleError("Not your job posting.");
  if (job.status !== "OPEN") {
    throw new InvalidJobStateError(
      `Cannot cancel a job in status ${job.status}.`,
    );
  }

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: { status: "CANCELLED" },
  });

  await recordAuditEvent({
    userId: params.requestingUserId,
    eventType: "JOB_CANCELLED",
    entityType: "Job",
    entityId: job.id,
  });

  return updated;
}
