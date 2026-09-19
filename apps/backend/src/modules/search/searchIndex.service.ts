// === IMPORTS ===
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

/**
 * OpenSearch integration — deliberately dependency-free: OpenSearch exposes a
 * complete REST API, so plain fetch avoids adding a client package.
 *
 * Behavior:
 *  - OPENSEARCH_URL unset → all functions no-op / report unavailable, and the
 *    existing Postgres search paths remain the single source of results.
 *  - OPENSEARCH_URL set → indexGig/indexJob upsert documents on create/update;
 *    search returns OpenSearch hits (with typo tolerance and scoring).
 *  - Any transport error → callers fall back to Postgres. Search must never
 *    hard-fail because the search cluster is down.
 */

const GIG_INDEX = "yekis-gigs";
const JOB_INDEX = "yekis-jobs";

export function isSearchConfigured(): boolean {
  return Boolean(env.OPENSEARCH_URL);
}

async function opensearchFetch(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  if (!env.OPENSEARCH_URL) throw new Error("OPENSEARCH_URL not configured");
  const res = await fetch(`${env.OPENSEARCH_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`OpenSearch ${path} responded ${res.status}`);
  }
  return res.json();
}

// ---------- Indexing ----------

export async function indexGig(gig: {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: unknown;
  status: string;
  freelancerId: string;
  ratingAverage: number;
  ratingCount: number;
}): Promise<void> {
  if (!isSearchConfigured()) return;
  try {
    await opensearchFetch(`/${GIG_INDEX}/_doc/${gig.id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: gig.title,
        description: gig.description,
        category: gig.category,
        tags: gig.tags,
        status: gig.status,
        freelancerId: gig.freelancerId,
        ratingAverage: gig.ratingAverage,
        ratingCount: gig.ratingCount,
      }),
    });
  } catch (err) {
    logger.warn({ err, gigId: gig.id }, "OpenSearch gig indexing failed");
  }
}

export async function indexJob(job: {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  clientId: string;
}): Promise<void> {
  if (!isSearchConfigured()) return;
  try {
    await opensearchFetch(`/${JOB_INDEX}/_doc/${job.id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: job.title,
        description: job.description,
        category: job.category,
        status: job.status,
        clientId: job.clientId,
      }),
    });
  } catch (err) {
    logger.warn({ err, jobId: job.id }, "OpenSearch job indexing failed");
  }
}

// ---------- Search ----------

export interface SearchHit {
  id: string;
  score: number;
}

/**
 * Multi-match text search across an index. Returns null when OpenSearch is
 * unconfigured or unreachable — callers must fall back to Postgres in that
 * case so the user always gets results.
 */
export async function searchText(
  index: "gigs" | "jobs",
  q: string,
  limit = 50,
): Promise<SearchHit[] | null> {
  if (!isSearchConfigured() || !q.trim()) return null;
  const indexName = index === "gigs" ? GIG_INDEX : JOB_INDEX;
  try {
    const body = (await opensearchFetch(`/${indexName}/_search`, {
      method: "POST",
      body: JSON.stringify({
        size: limit,
        query: {
          multi_match: {
            query: q,
            fields:
              index === "gigs"
                ? ["title^3", "description", "tags"]
                : ["title^3", "description"],
            fuzziness: "AUTO", // typo tolerance
          },
        },
      }),
    })) as {
      hits?: { hits?: { _id: string; _score: number }[] };
    };
    return (
      body.hits?.hits?.map((h) => ({ id: h._id, score: h._score })) ?? []
    );
  } catch (err) {
    logger.warn({ err, index, q }, "OpenSearch query failed — falling back to Postgres");
    return null;
  }
}
