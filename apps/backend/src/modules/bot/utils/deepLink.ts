import { env } from "../../../config/env.js";

/**
 * Build a Mini App deep link URL
 */
export function buildWebAppUrl(path: string, params: Record<string, string> = {}): string {
  const search = new URLSearchParams(params).toString();
  let base = env.FRONTEND_URL || "https://yekis.io";
  // Telegram strictly validates inline button URLs and rejects localhost or http://
  if (base.includes("localhost") || base.startsWith("http://")) {
    base = "https://yekis.io";
  }
  return `${base}${path}${search ? `?${search}` : ""}`;
}

/**
 * Predefined Mini App routes
 */
export const webAppRoutes = {
  jobs: (filters?: Record<string, string>) => buildWebAppUrl("/jobs", filters),
  jobDetail: (jobId: string) => buildWebAppUrl(`/jobs/${jobId}`),
  myJobs: () => buildWebAppUrl("/my-jobs"),
  proposals: (jobId?: string) => buildWebAppUrl("/proposals", jobId ? { jobId } : {}),
  contract: (contractId: string) => buildWebAppUrl(`/contracts/${contractId}`),
  wallet: () => buildWebAppUrl("/wallet"),
  kyc: () => buildWebAppUrl("/kyc"),
  disputes: () => buildWebAppUrl("/disputes"),
  notifications: () => buildWebAppUrl("/notifications"),
  settings: () => buildWebAppUrl("/settings"),
  
  // Staff routes
  staffDashboard: () => buildWebAppUrl("/staff"),
  staffKycReview: (kycId: string) => buildWebAppUrl(`/staff/kyc/${kycId}`),
  staffTopupReview: (topupId: string) => buildWebAppUrl(`/staff/topups/${topupId}`),
  staffDisputeMediation: (disputeId: string) => buildWebAppUrl(`/staff/disputes/${disputeId}`),
  staffTmsReview: (flagId: string) => buildWebAppUrl(`/staff/tms/${flagId}`),
  staffUserLookup: (ucid: string) => buildWebAppUrl(`/staff/users/${ucid}`),
  staffAnalytics: () => buildWebAppUrl("/staff/analytics"),
};

/**
 * Create a Telegram deep link for sharing
 */
export function createTelegramDeepLink(botUsername: string, startParam?: string): string {
  return `https://t.me/${botUsername}${startParam ? `?start=${startParam}` : ""}`;
}

/**
 * Create a job share link
 */
export function createJobShareLink(jobId: string): string {
  return createTelegramDeepLink("yekis_bot", `job_${jobId}`);
}

/**
 * Create a referral link
 */
export function createReferralLink(userId: string): string {
  return createTelegramDeepLink("yekis_bot", `ref_${userId}`);
}

/**
 * Parse a deep link start parameter
 */
export function parseDeepLink(startParam: string): { type: string; id: string } | null {
  const match = startParam.match(/^(job|ref|proposal|contract|dispute)_(\w+)$/);
  if (!match) return null;
  return { type: match[1]!, id: match[2]! };
}
