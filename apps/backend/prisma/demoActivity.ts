// === DEMO ACTIVITY ===
//
// The profile seed (users, skills, gigs) makes the marketplace browsable but
// leaves every console metric at zero: no contracts, so no escrow; no payments,
// so no volume chart; no payouts, so nothing to disburse; no receipts, so the
// top-up queue is empty. A dashboard of zeros looks broken even when every
// endpoint returns 200 — this module is what makes the demo read as a working
// marketplace.
//
// Everything is keyed on fixed ids (`seed-*`) and written with upserts, so
// re-running the seed repairs rows instead of duplicating them. Dates are
// expressed as "days ago" so the charts stay inside their rolling windows.
//
// The same dataset is consumed by scripts/generate-demo-activity-migration.ts,
// which emits the SQL data migration. Keep the exported shape stable or update
// the generator with it.

import type { PrismaClient } from "@prisma/client";

const DAY_MS = 86_400_000;

/** Argon2id hash of `test1234` (m=16384, t=3, p=4) — same demo password. */
export const DEMO_ACTIVITY_PASSWORD_HASH =
  "$argon2id$v=19$m=16384,t=3,p=4$moKzIFyFuBOQSBofUzBkMA$8+FqJ8ALDHtSjPUbRFR+N7NihXxl2LDPwuqSbsrXcjk";

export interface DemoUser {
  id: string;
  ucid: string;
  email: string;
  phone: string;
  role: "CLIENT" | "FREELANCER" | "BOTH";
  firstName: string;
  lastName: string;
  bio?: string;
  isAvailableForWork?: boolean;
  totalEarnedNetMinor?: number;
  totalSpentGrossMinor?: number;
  kycId: string;
  kycTier: "TIER_1" | "TIER_2" | "TIER_3";
  kycStatus: "PENDING" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED";
  fullName?: string;
  documentNumber?: string;
  walletId: string;
  walletBalanceMinor: number;
  registeredDaysAgo: number;
  documents?: Array<{
    id: string;
    documentType: "NATIONAL_ID" | "PASSPORT" | "DRIVERS_LICENSE" | "SELFIE_LIVENESS";
    storagePath: string;
  }>;
}

export interface DemoMilestone {
  id: string;
  title: string;
  amountMinor: number;
  dueInDays: number;
  escrowState:
    | "PAYMENT_PENDING"
    | "ESCROW_HELD"
    | "WORK_IN_PROGRESS"
    | "SUBMITTED_FOR_REVIEW"
    | "ACCEPTED"
    | "RELEASED"
    | "DISPUTED"
    | "REFUNDED"
    | "PARTIAL_REFUND";
  submittedDaysAgo?: number;
  autoReleaseInDays?: number;
  releasedDaysAgo?: number;
  deliverableUrl?: string;
  createdDaysAgo: number;
}

export interface DemoContract {
  id: string;
  jobId: string;
  clientEmail: string;
  freelancerEmail: string;
  status: "ACTIVE" | "COMPLETED" | "TERMINATED" | "CANCELLED";
  acceptedDaysAgo: number;
  createdDaysAgo: number;
  milestones: DemoMilestone[];
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: "seed-user-client",
    ucid: "seed-ucid-client",
    email: "client@yekis.et",
    phone: "+251910011822",
    role: "CLIENT",
    firstName: "Hanna",
    lastName: "Bekele",
    totalSpentGrossMinor: 12_700_000,
    kycId: "seed-kyc-client",
    kycTier: "TIER_1",
    kycStatus: "VERIFIED",
    fullName: "Hanna Bekele",
    documentNumber: "ET-4471-2290",
    walletId: "seed-wallet-client",
    walletBalanceMinor: 1_850_000,
    registeredDaysAgo: 72,
  },
  {
    id: "seed-user-freelancer",
    ucid: "seed-ucid-freelancer",
    email: "freelancer@yekis.et",
    phone: "+251910011823",
    role: "FREELANCER",
    firstName: "Dawit",
    lastName: "Tesfaye",
    bio: "Brand strategist and identity designer working with Ethiopian exporters and hospitality brands.",
    isAvailableForWork: true,
    totalEarnedNetMinor: 9_850_000,
    kycId: "seed-kyc-freelancer",
    kycTier: "TIER_1",
    kycStatus: "VERIFIED",
    fullName: "Dawit Tesfaye",
    documentNumber: "ET-5518-7741",
    walletId: "seed-wallet-freelancer",
    walletBalanceMinor: 3_420_000,
    registeredDaysAgo: 68,
  },
  {
    id: "seed-user-newbie",
    ucid: "seed-ucid-newbie",
    email: "newbie@yekis.et",
    phone: "+251910011824",
    role: "CLIENT",
    firstName: "Meron",
    lastName: "Girma",
    kycId: "seed-kyc-newbie",
    kycTier: "TIER_1",
    kycStatus: "UNDER_REVIEW",
    fullName: "Meron Girma",
    documentNumber: "ET-4821-9930",
    walletId: "seed-wallet-newbie",
    walletBalanceMinor: 0,
    registeredDaysAgo: 3,
    documents: [
      {
        id: "seed-kycdoc-newbie-id",
        documentType: "NATIONAL_ID",
        storagePath: "demo/kyc/newbie-national-id.pdf",
      },
      {
        id: "seed-kycdoc-newbie-selfie",
        documentType: "SELFIE_LIVENESS",
        storagePath: "demo/kyc/newbie-selfie.jpg",
      },
    ],
  },
];

/** Wallet balances for seed users defined in prisma/seed.ts. */
export const DEMO_WALLET_BALANCES: Array<{ email: string; balanceMinor: number }> = [
  { email: "seller@yekis.et", balanceMinor: 5_260_000 },
];

export const DEMO_JOBS: Array<{
  id: string;
  clientEmail: string;
  title: string;
  category:
    | "WEB_APP_DEVELOPMENT"
    | "GRAPHIC_DESIGN"
    | "DIGITAL_MARKETING"
    | "CONTENT_WRITING"
    | "TRANSLATION"
    | "DATA_ENTRY";
  description: string;
  budgetMinMinor: number;
  budgetMaxMinor: number;
  deadlineInDays: number;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  proposedMilestones: Array<{ title: string; amountMinor: number }>;
  createdDaysAgo: number;
}> = [
  {
    id: "seed-job-storefront",
    clientEmail: "client@yekis.et",
    title: "E-commerce storefront rebuild",
    category: "WEB_APP_DEVELOPMENT",
    description:
      "Rebuild our coffee storefront for mobile-first shoppers: catalogue, cart, checkout with Telebirr and CBE Birr, and an admin view for orders.",
    budgetMinMinor: 12_000_000,
    budgetMaxMinor: 18_000_000,
    deadlineInDays: 20,
    status: "IN_PROGRESS",
    proposedMilestones: [
      { title: "Design system & homepage", amountMinor: 4_500_000 },
      { title: "Checkout integration", amountMinor: 6_000_000 },
      { title: "Launch support", amountMinor: 2_500_000 },
    ],
    createdDaysAgo: 45,
  },
  {
    id: "seed-job-brand",
    clientEmail: "client@yekis.et",
    title: "Brand identity for a coffee exporter",
    category: "GRAPHIC_DESIGN",
    description:
      "Full identity for a specialty coffee exporter: logo, packaging system, and a brand guide the team can actually follow.",
    budgetMinMinor: 4_000_000,
    budgetMaxMinor: 6_000_000,
    deadlineInDays: 10,
    status: "IN_PROGRESS",
    proposedMilestones: [
      { title: "Logo concepts", amountMinor: 1_800_000 },
      { title: "Brand guidelines", amountMinor: 2_200_000 },
      { title: "Social media kit", amountMinor: 1_500_000 },
      { title: "Packaging templates", amountMinor: 900_000 },
    ],
    createdDaysAgo: 50,
  },
  {
    id: "seed-job-copy",
    clientEmail: "client@yekis.et",
    title: "Website copy for five pages",
    category: "CONTENT_WRITING",
    description:
      "Rewrite the copy for our home, about, services, pricing and contact pages in plain English, with a short SEO brief per page.",
    budgetMinMinor: 2_000_000,
    budgetMaxMinor: 3_000_000,
    deadlineInDays: -45,
    status: "COMPLETED",
    proposedMilestones: [
      { title: "Five pages of website copy", amountMinor: 2_200_000 },
      { title: "Landing page copy", amountMinor: 600_000 },
    ],
    createdDaysAgo: 70,
  },
];

export const DEMO_CONTRACTS: DemoContract[] = [
  {
    id: "seed-contract-storefront",
    jobId: "seed-job-storefront",
    clientEmail: "client@yekis.et",
    freelancerEmail: "seller@yekis.et",
    status: "ACTIVE",
    acceptedDaysAgo: 41,
    createdDaysAgo: 42,
    milestones: [
      {
        id: "seed-ms-storefront-1",
        title: "Design system & homepage",
        amountMinor: 4_500_000,
        dueInDays: -35,
        escrowState: "RELEASED",
        submittedDaysAgo: 33,
        releasedDaysAgo: 30,
        createdDaysAgo: 42,
      },
      {
        id: "seed-ms-storefront-2",
        title: "Checkout integration",
        amountMinor: 6_000_000,
        dueInDays: 2,
        escrowState: "SUBMITTED_FOR_REVIEW",
        submittedDaysAgo: 2,
        autoReleaseInDays: 3,
        deliverableUrl: "https://files.yekis.demo/storefront/checkout-v2.zip",
        createdDaysAgo: 42,
      },
      {
        id: "seed-ms-storefront-3",
        title: "Launch support",
        amountMinor: 2_500_000,
        dueInDays: 16,
        escrowState: "ESCROW_HELD",
        createdDaysAgo: 42,
      },
    ],
  },
  {
    id: "seed-contract-brand",
    jobId: "seed-job-brand",
    clientEmail: "client@yekis.et",
    freelancerEmail: "freelancer@yekis.et",
    status: "ACTIVE",
    acceptedDaysAgo: 38,
    createdDaysAgo: 39,
    milestones: [
      {
        id: "seed-ms-brand-1",
        title: "Logo concepts",
        amountMinor: 1_800_000,
        dueInDays: -45,
        escrowState: "RELEASED",
        submittedDaysAgo: 43,
        releasedDaysAgo: 40,
        createdDaysAgo: 39,
      },
      {
        id: "seed-ms-brand-2",
        title: "Brand guidelines",
        amountMinor: 2_200_000,
        dueInDays: -6,
        escrowState: "DISPUTED",
        submittedDaysAgo: 12,
        createdDaysAgo: 39,
      },
      {
        id: "seed-ms-brand-3",
        title: "Social media kit",
        amountMinor: 1_500_000,
        dueInDays: 7,
        escrowState: "WORK_IN_PROGRESS",
        createdDaysAgo: 39,
      },
      {
        id: "seed-ms-brand-4",
        title: "Packaging templates",
        amountMinor: 900_000,
        dueInDays: 3,
        escrowState: "DISPUTED",
        submittedDaysAgo: 6,
        createdDaysAgo: 39,
      },
    ],
  },
  {
    id: "seed-contract-copy",
    jobId: "seed-job-copy",
    clientEmail: "client@yekis.et",
    freelancerEmail: "seller@yekis.et",
    status: "COMPLETED",
    acceptedDaysAgo: 62,
    createdDaysAgo: 63,
    milestones: [
      {
        id: "seed-ms-copy-1",
        title: "Five pages of website copy",
        amountMinor: 2_200_000,
        dueInDays: -60,
        escrowState: "RELEASED",
        submittedDaysAgo: 58,
        releasedDaysAgo: 55,
        createdDaysAgo: 63,
      },
      {
        id: "seed-ms-copy-2",
        title: "Landing page copy",
        amountMinor: 600_000,
        dueInDays: -52,
        escrowState: "PARTIAL_REFUND",
        submittedDaysAgo: 50,
        releasedDaysAgo: 45,
        createdDaysAgo: 63,
      },
    ],
  },
];

export const DEMO_PAYMENTS: Array<{
  id: string;
  milestoneId: string;
  provider: "TELEBIRR" | "CHAPA" | "CBE_BIRR" | "M_PESA";
  providerTransactionId: string;
  amountMinor: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  createdDaysAgo: number;
}> = [
  {
    id: "seed-pay-storefront-1",
    milestoneId: "seed-ms-storefront-1",
    provider: "TELEBIRR",
    providerTransactionId: "DEMO-PAY-0001",
    amountMinor: 4_500_000,
    status: "SUCCESS",
    createdDaysAgo: 41,
  },
  {
    id: "seed-pay-storefront-2",
    milestoneId: "seed-ms-storefront-2",
    provider: "CBE_BIRR",
    providerTransactionId: "DEMO-PAY-0002",
    amountMinor: 6_000_000,
    status: "SUCCESS",
    createdDaysAgo: 10,
  },
  {
    id: "seed-pay-storefront-3",
    milestoneId: "seed-ms-storefront-3",
    provider: "TELEBIRR",
    providerTransactionId: "DEMO-PAY-0003",
    amountMinor: 2_500_000,
    status: "SUCCESS",
    createdDaysAgo: 7,
  },
  {
    id: "seed-pay-brand-1",
    milestoneId: "seed-ms-brand-1",
    provider: "CHAPA",
    providerTransactionId: "DEMO-PAY-0004",
    amountMinor: 1_800_000,
    status: "SUCCESS",
    createdDaysAgo: 48,
  },
  {
    id: "seed-pay-brand-2",
    milestoneId: "seed-ms-brand-2",
    provider: "TELEBIRR",
    providerTransactionId: "DEMO-PAY-0005",
    amountMinor: 2_200_000,
    status: "SUCCESS",
    createdDaysAgo: 16,
  },
  {
    id: "seed-pay-brand-3",
    milestoneId: "seed-ms-brand-3",
    provider: "M_PESA",
    providerTransactionId: "DEMO-PAY-0006",
    amountMinor: 1_500_000,
    status: "SUCCESS",
    createdDaysAgo: 5,
  },
  {
    id: "seed-pay-copy-1",
    milestoneId: "seed-ms-copy-1",
    provider: "TELEBIRR",
    providerTransactionId: "DEMO-PAY-0007",
    amountMinor: 2_200_000,
    status: "SUCCESS",
    createdDaysAgo: 61,
  },
  {
    id: "seed-pay-copy-2",
    milestoneId: "seed-ms-copy-2",
    provider: "CBE_BIRR",
    providerTransactionId: "DEMO-PAY-0008",
    amountMinor: 600_000,
    status: "SUCCESS",
    createdDaysAgo: 55,
  },
  {
    id: "seed-pay-pending",
    milestoneId: "seed-ms-brand-4",
    provider: "CHAPA",
    providerTransactionId: "DEMO-PAY-0009",
    amountMinor: 3_500_000,
    status: "PENDING",
    createdDaysAgo: 1,
  },
  {
    id: "seed-pay-failed",
    milestoneId: "seed-ms-brand-4",
    provider: "M_PESA",
    providerTransactionId: "DEMO-PAY-0010",
    amountMinor: 900_000,
    status: "FAILED",
    createdDaysAgo: 3,
  },
];

export const DEMO_PAYOUTS: Array<{
  id: string;
  userEmail: string;
  amountMinor: number;
  feeMinor: number;
  provider: "TELEBIRR" | "CHAPA" | "CBE_BIRR" | "M_PESA";
  providerPayoutId?: string;
  payoutAccountIdentifier: string;
  status: "PENDING" | "PROCESSING" | "CONFIRMED" | "FAILED" | "REVERSED";
  createdDaysAgo: number;
  settledDaysAgo?: number;
}> = [
  {
    id: "seed-payout-storefront-1",
    userEmail: "seller@yekis.et",
    amountMinor: 2_000_000,
    feeMinor: 10_000,
    provider: "TELEBIRR",
    providerPayoutId: "DEMO-PO-0001",
    payoutAccountIdentifier: "+251910011821",
    status: "CONFIRMED",
    createdDaysAgo: 28,
    settledDaysAgo: 27,
  },
  {
    id: "seed-payout-brand-1",
    userEmail: "freelancer@yekis.et",
    amountMinor: 1_000_000,
    feeMinor: 5_000,
    provider: "TELEBIRR",
    providerPayoutId: "DEMO-PO-0002",
    payoutAccountIdentifier: "+251910011823",
    status: "CONFIRMED",
    createdDaysAgo: 9,
    settledDaysAgo: 8,
  },
  {
    id: "seed-payout-storefront-2",
    userEmail: "seller@yekis.et",
    amountMinor: 1_500_000,
    feeMinor: 7_500,
    provider: "CBE_BIRR",
    providerPayoutId: "DEMO-PO-0003",
    payoutAccountIdentifier: "1000234567890",
    status: "CONFIRMED",
    createdDaysAgo: 15,
    settledDaysAgo: 14,
  },
  {
    id: "seed-payout-copy-1",
    userEmail: "seller@yekis.et",
    amountMinor: 1_200_000,
    feeMinor: 6_000,
    provider: "TELEBIRR",
    providerPayoutId: "DEMO-PO-0004",
    payoutAccountIdentifier: "+251910011821",
    status: "CONFIRMED",
    createdDaysAgo: 47,
    settledDaysAgo: 46,
  },
  {
    id: "seed-payout-pending",
    userEmail: "freelancer@yekis.et",
    amountMinor: 800_000,
    feeMinor: 4_000,
    provider: "TELEBIRR",
    payoutAccountIdentifier: "+251910011823",
    status: "PENDING",
    createdDaysAgo: 1,
  },
  {
    id: "seed-payout-processing",
    userEmail: "seller@yekis.et",
    amountMinor: 500_000,
    feeMinor: 2_500,
    provider: "CBE_BIRR",
    payoutAccountIdentifier: "1000234567890",
    status: "PROCESSING",
    createdDaysAgo: 2,
  },
];

export const DEMO_TOP_UPS: Array<{
  id: string;
  userEmail: string;
  provider: "TELEBIRR" | "CHAPA" | "CBE_BIRR" | "M_PESA";
  amountMinor: number;
  referenceNumber: string;
  receiptImagePath?: string;
  status: "PENDING" | "CHECKOUT_PENDING" | "APPROVED" | "REJECTED" | "FLAGGED";
  reviewedByEmail?: string;
  rejectionReason?: string;
  reviewedDaysAgo?: number;
  createdDaysAgo: number;
}> = [
  {
    id: "seed-topup-1",
    userEmail: "client@yekis.et",
    provider: "TELEBIRR",
    amountMinor: 5_000_000,
    referenceNumber: "FT260918A1B2",
    status: "APPROVED",
    reviewedByEmail: "admin@yekis.et",
    reviewedDaysAgo: 33,
    createdDaysAgo: 34,
  },
  {
    id: "seed-topup-2",
    userEmail: "client@yekis.et",
    provider: "CBE_BIRR",
    amountMinor: 3_000_000,
    referenceNumber: "FT261009C3D4",
    status: "APPROVED",
    reviewedByEmail: "admin@yekis.et",
    reviewedDaysAgo: 12,
    createdDaysAgo: 13,
  },
  {
    id: "seed-topup-3",
    userEmail: "freelancer@yekis.et",
    provider: "TELEBIRR",
    amountMinor: 2_000_000,
    referenceNumber: "FT260901E5F6",
    status: "APPROVED",
    reviewedByEmail: "admin@yekis.et",
    reviewedDaysAgo: 20,
    createdDaysAgo: 21,
  },
  {
    id: "seed-topup-4",
    userEmail: "client@yekis.et",
    provider: "TELEBIRR",
    amountMinor: 1_500_000,
    referenceNumber: "FT261022A1B2",
    receiptImagePath: "demo/receipts/ft261022a1b2.jpg",
    status: "PENDING",
    createdDaysAgo: 1,
  },
  {
    id: "seed-topup-5",
    userEmail: "freelancer@yekis.et",
    provider: "CBE_BIRR",
    amountMinor: 800_000,
    referenceNumber: "FT261021C3D4",
    receiptImagePath: "demo/receipts/ft261021c3d4.jpg",
    status: "PENDING",
    createdDaysAgo: 2,
  },
  {
    id: "seed-topup-6",
    userEmail: "seller@yekis.et",
    provider: "M_PESA",
    amountMinor: 400_000,
    referenceNumber: "FT261012G7H8",
    status: "REJECTED",
    reviewedByEmail: "admin@yekis.et",
    rejectionReason: "Receipt amount does not match the reference number.",
    reviewedDaysAgo: 9,
    createdDaysAgo: 10,
  },
];

export const DEMO_DISPUTES: Array<{
  id: string;
  contractId: string;
  milestoneId: string;
  category:
    | "NON_DELIVERY"
    | "LATE_DELIVERY"
    | "QUALITY_ISSUE"
    | "SCOPE_CREEP"
    | "NON_PAYMENT"
    | "COMMUNICATION_BREAKDOWN";
  stage:
    | "STAGE_1_NEGOTIATION"
    | "STAGE_2_EVIDENCE"
    | "STAGE_3_MEDIATION"
    | "STAGE_4_ARBITRATION"
    | "RESOLVED";
  raisedByEmail: string;
  description: string;
  negotiationDeadlineInDays?: number;
  mediationDeadlineInDays?: number;
  assignedMediatorEmail?: string;
  assignedDaysAgo?: number;
  resolvedByEmail?: string;
  resolutionOutcome?: "FULL_REFUND" | "FULL_RELEASE" | "PARTIAL_SPLIT" | "WITHDRAWN";
  freelancerShareMinor?: number;
  resolvedDaysAgo?: number;
  createdDaysAgo: number;
}> = [
  {
    id: "seed-dispute-brand-quality",
    contractId: "seed-contract-brand",
    milestoneId: "seed-ms-brand-2",
    category: "QUALITY_ISSUE",
    stage: "STAGE_3_MEDIATION",
    raisedByEmail: "client@yekis.et",
    description:
      "The brand guide repeats the logo concepts but omits the typography scale and packaging rules we agreed in the brief. I asked for a revision twice and received the same file back.",
    negotiationDeadlineInDays: -7,
    mediationDeadlineInDays: 2,
    assignedMediatorEmail: "compliance@yekis.et",
    assignedDaysAgo: 8,
    createdDaysAgo: 12,
  },
  {
    id: "seed-dispute-brand-scope",
    contractId: "seed-contract-brand",
    milestoneId: "seed-ms-brand-4",
    category: "SCOPE_CREEP",
    stage: "STAGE_1_NEGOTIATION",
    raisedByEmail: "freelancer@yekis.et",
    description:
      "Packaging templates were quoted for four SKUs. The client has now sent artwork for nine products and expects them all inside this milestone.",
    negotiationDeadlineInDays: 1,
    createdDaysAgo: 6,
  },
  {
    id: "seed-dispute-copy-resolved",
    contractId: "seed-contract-copy",
    milestoneId: "seed-ms-copy-2",
    category: "QUALITY_ISSUE",
    stage: "RESOLVED",
    raisedByEmail: "client@yekis.et",
    description:
      "The landing page copy arrived a day late and the headline section had to be rewritten. We agreed on a partial refund instead of a full redelivery.",
    negotiationDeadlineInDays: -45,
    resolvedByEmail: "admin@yekis.et",
    resolutionOutcome: "PARTIAL_SPLIT",
    freelancerShareMinor: 500_000,
    resolvedDaysAgo: 45,
    createdDaysAgo: 50,
  },
];

export const DEMO_FLAGS: Array<{
  id: string;
  userEmail: string;
  type:
    | "STRUCTURING"
    | "VELOCITY"
    | "ROUND_AMOUNTS"
    | "PASS_THROUGH"
    | "WALLET_MISMATCH"
    | "STAFF_FLAGGED"
    | "VAT_THRESHOLD_REACHED";
  status: "PENDING_REVIEW" | "STR_FILED" | "DISMISSED";
  details: Record<string, unknown>;
  relatedEntityId?: string;
  reviewedByEmail?: string;
  reviewNotes?: string;
  createdDaysAgo: number;
}> = [
  {
    id: "seed-flag-structuring",
    userEmail: "client@yekis.et",
    type: "STRUCTURING",
    status: "PENDING_REVIEW",
    details: {
      windowDays: 7,
      thresholdMinor: 1_000_000,
      matchedReferences: ["FT261022A1B2"],
      note: "Three top-ups just under the review threshold inside seven days.",
    },
    relatedEntityId: "seed-topup-4",
    createdDaysAgo: 1,
  },
  {
    id: "seed-flag-velocity",
    userEmail: "freelancer@yekis.et",
    type: "VELOCITY",
    status: "PENDING_REVIEW",
    details: {
      windowHours: 24,
      payoutsRequested: 4,
      totalMinor: 3_200_000,
      note: "Withdrawal requests accelerated after a milestone release.",
    },
    relatedEntityId: "seed-payout-pending",
    createdDaysAgo: 2,
  },
  {
    id: "seed-flag-round-amounts",
    userEmail: "seller@yekis.et",
    type: "ROUND_AMOUNTS",
    status: "DISMISSED",
    details: {
      matchedAmountsMinor: [2_000_000, 1_500_000, 1_200_000],
      note: "Amounts match milestone settlements, not external deposits.",
    },
    reviewedByEmail: "admin@yekis.et",
    reviewNotes: "Verified against paid milestones; no action required.",
    createdDaysAgo: 18,
  },
];

export const DEMO_REPORTS: Array<{
  id: string;
  reporterEmail: string;
  reportedUserEmail: string;
  reason:
    | "FAKE_IDENTITY"
    | "OFFENSIVE_CONTENT"
    | "OFF_PLATFORM_CONTACT"
    | "MISLEADING_SKILLS"
    | "SPAM"
    | "OTHER";
  details: string;
  status: "PENDING" | "UNDER_REVIEW" | "RESOLVED_NO_ACTION" | "RESOLVED_PROFILE_HIDDEN" | "RESOLVED_PROFILE_BANNED";
  createdDaysAgo: number;
}> = [
  {
    id: "seed-report-offplatform",
    reporterEmail: "client@yekis.et",
    reportedUserEmail: "freelancer@yekis.et",
    reason: "OFF_PLATFORM_CONTACT",
    details:
      "Asked me to move the whole contract to a personal Telegram chat and pay 50% upfront outside escrow.",
    status: "PENDING",
    createdDaysAgo: 2,
  },
  {
    id: "seed-report-skills",
    reporterEmail: "freelancer@yekis.et",
    reportedUserEmail: "seller@yekis.et",
    reason: "MISLEADING_SKILLS",
    details:
      "The profile lists civil engineering and accounting experience, but the portfolio only shows logo work.",
    status: "UNDER_REVIEW",
    createdDaysAgo: 6,
  },
];

export const DEMO_CONVERSATIONS: Array<{
  id: string;
  creatorEmail: string;
  assignedStaffEmail?: string;
  contactEmail: string;
  subject: string;
  status: "OPEN" | "CLOSED";
  createdDaysAgo: number;
  messages: Array<{
    id: string;
    senderEmail: string;
    body: string;
    createdDaysAgo: number;
  }>;
}> = [
  {
    id: "seed-conv-payout",
    creatorEmail: "client@yekis.et",
    assignedStaffEmail: "support@yekis.et",
    contactEmail: "client@yekis.et",
    subject: "Payout not received after approval",
    status: "OPEN",
    createdDaysAgo: 2,
    messages: [
      {
        id: "seed-msg-payout-1",
        senderEmail: "client@yekis.et",
        body: "I approved the last milestone two days ago but the funds are still not in my Telebirr account. Can you check the payout reference?",
        createdDaysAgo: 2,
      },
      {
        id: "seed-msg-payout-2",
        senderEmail: "support@yekis.et",
        body: "Thanks for flagging this. The payout is queued as PENDING and has not been sent to the provider yet. I have escalated it to finance for the next settlement batch.",
        createdDaysAgo: 1,
      },
      {
        id: "seed-msg-payout-3",
        senderEmail: "client@yekis.et",
        body: "Understood, thank you. Please confirm once the settlement reference is available.",
        createdDaysAgo: 0.4,
      },
    ],
  },
  {
    id: "seed-conv-kyc",
    creatorEmail: "freelancer@yekis.et",
    contactEmail: "freelancer@yekis.et",
    subject: "KYC document upload keeps failing",
    status: "OPEN",
    createdDaysAgo: 1,
    messages: [
      {
        id: "seed-msg-kyc-1",
        senderEmail: "freelancer@yekis.et",
        body: "The upload spinner stops at 90% for my selfie and then the page resets. I have tried twice on mobile data.",
        createdDaysAgo: 1,
      },
    ],
  },
  {
    id: "seed-conv-invoice",
    creatorEmail: "seller@yekis.et",
    assignedStaffEmail: "support@yekis.et",
    contactEmail: "seller@yekis.et",
    subject: "Invoice for completed contract",
    status: "CLOSED",
    createdDaysAgo: 12,
    messages: [
      {
        id: "seed-msg-invoice-1",
        senderEmail: "seller@yekis.et",
        body: "Could you send me an invoice for the completed copywriting contract? Our accountant needs it for the quarter.",
        createdDaysAgo: 12,
      },
      {
        id: "seed-msg-invoice-2",
        senderEmail: "support@yekis.et",
        body: "Sent to your registered email this morning. The PDF includes the platform fee and withholding tax lines.",
        createdDaysAgo: 11,
      },
    ],
  },
];

export const DEMO_AUDIT_LOGS: Array<{
  id: string;
  userEmail?: string;
  eventType: string;
  action?: string;
  entityType: string;
  entityId: string;
  actorRole?: string;
  amountMinor?: number;
  metadata?: Record<string, unknown>;
  createdDaysAgo: number;
}> = [
  {
    id: "seed-audit-user-registered",
    userEmail: "client@yekis.et",
    eventType: "USER_REGISTERED",
    action: "auth.register",
    entityType: "User",
    entityId: "seed-user-client",
    actorRole: "CLIENT",
    createdDaysAgo: 72,
  },
  {
    id: "seed-audit-contract-created",
    userEmail: "client@yekis.et",
    eventType: "CONTRACT_CREATED",
    action: "contracts.create",
    entityType: "Contract",
    entityId: "seed-contract-brand",
    actorRole: "CLIENT",
    createdDaysAgo: 39,
  },
  {
    id: "seed-audit-escrow-funded-1",
    userEmail: "client@yekis.et",
    eventType: "ESCROW_FUNDED",
    action: "escrow.fund",
    entityType: "Milestone",
    entityId: "seed-ms-storefront-1",
    actorRole: "CLIENT",
    amountMinor: 4_500_000,
    createdDaysAgo: 41,
  },
  {
    id: "seed-audit-topup-approved",
    userEmail: "admin@yekis.et",
    eventType: "WALLET_TOPUP_APPROVED",
    action: "wallet.topup.approve",
    entityType: "WalletTopUp",
    entityId: "seed-topup-1",
    actorRole: "ADMIN",
    amountMinor: 5_000_000,
    createdDaysAgo: 33,
  },
  {
    id: "seed-audit-escrow-released",
    userEmail: "admin@yekis.et",
    eventType: "ESCROW_RELEASED",
    action: "escrow.release",
    entityType: "Milestone",
    entityId: "seed-ms-storefront-1",
    actorRole: "ADMIN",
    amountMinor: 4_500_000,
    createdDaysAgo: 30,
  },
  {
    id: "seed-audit-payout-confirmed",
    userEmail: "admin@yekis.et",
    eventType: "PAYOUT_CONFIRMED",
    action: "payouts.settle",
    entityType: "PayoutTransaction",
    entityId: "seed-payout-storefront-1",
    actorRole: "ADMIN",
    amountMinor: 2_000_000,
    createdDaysAgo: 27,
  },
  {
    id: "seed-audit-payout-confirmed-2",
    userEmail: "admin@yekis.et",
    eventType: "PAYOUT_CONFIRMED",
    action: "payouts.settle",
    entityType: "PayoutTransaction",
    entityId: "seed-payout-storefront-2",
    actorRole: "ADMIN",
    amountMinor: 1_500_000,
    createdDaysAgo: 14,
  },
  {
    id: "seed-audit-dispute-raised",
    userEmail: "client@yekis.et",
    eventType: "DISPUTE_RAISED",
    action: "disputes.create",
    entityType: "Dispute",
    entityId: "seed-dispute-brand-quality",
    actorRole: "CLIENT",
    createdDaysAgo: 12,
  },
  {
    id: "seed-audit-dispute-escalated",
    userEmail: "client@yekis.et",
    eventType: "DISPUTE_ESCALATED",
    action: "disputes.escalate",
    entityType: "Dispute",
    entityId: "seed-dispute-brand-quality",
    actorRole: "CLIENT",
    createdDaysAgo: 9,
  },
  {
    id: "seed-audit-milestone-submitted",
    userEmail: "seller@yekis.et",
    eventType: "MILESTONE_SUBMITTED",
    action: "milestones.submit",
    entityType: "Milestone",
    entityId: "seed-ms-storefront-2",
    actorRole: "FREELANCER",
    createdDaysAgo: 2,
  },
  {
    id: "seed-audit-topup-flagged",
    eventType: "TRANSACTION_FLAGGED",
    action: "compliance.flag",
    entityType: "TransactionFlag",
    entityId: "seed-flag-structuring",
    amountMinor: 1_500_000,
    createdDaysAgo: 1,
  },
  {
    id: "seed-audit-kyc-submitted",
    userEmail: "newbie@yekis.et",
    eventType: "KYC_SUBMITTED",
    action: "kyc.submit",
    entityType: "KycRecord",
    entityId: "seed-kyc-newbie",
    actorRole: "CLIENT",
    createdDaysAgo: 3,
  },
];

export interface DemoActivitySummary {
  users: number;
  jobs: number;
  contracts: number;
  milestones: number;
  payments: number;
  payouts: number;
  topUps: number;
  disputes: number;
  flags: number;
  reports: number;
  conversations: number;
  auditLogs: number;
}

export async function seedDemoActivity(
  prisma: PrismaClient,
): Promise<DemoActivitySummary> {
  const now = Date.now();
  const at = (daysAgo: number | undefined): Date | null =>
    daysAgo === undefined ? null : new Date(now - daysAgo * DAY_MS);
  const ahead = (days: number | undefined): Date | null =>
    days === undefined ? null : new Date(now + days * DAY_MS);
  const day = (daysAgo: number): Date => new Date(now - daysAgo * DAY_MS);

  const userIdByEmail = new Map<string, string>();

  for (const u of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        role: u.role,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: DEMO_ACTIVITY_PASSWORD_HASH,
        bio: u.bio ?? "",
        isAvailableForWork: u.isAvailableForWork ?? false,
        totalEarnedNetMinor: u.totalEarnedNetMinor ?? 0,
        totalSpentGrossMinor: u.totalSpentGrossMinor ?? 0,
        cachedKycTier: u.kycTier,
        cachedKycStatus: u.kycStatus,
        createdAt: day(u.registeredDaysAgo),
      },
      create: {
        id: u.id,
        ucid: u.ucid,
        email: u.email,
        phone: u.phone,
        passwordHash: DEMO_ACTIVITY_PASSWORD_HASH,
        role: u.role,
        firstName: u.firstName,
        lastName: u.lastName,
        bio: u.bio ?? "",
        isAvailableForWork: u.isAvailableForWork ?? false,
        totalEarnedNetMinor: u.totalEarnedNetMinor ?? 0,
        totalSpentGrossMinor: u.totalSpentGrossMinor ?? 0,
        cachedKycTier: u.kycTier,
        cachedKycStatus: u.kycStatus,
        dateOfBirth: new Date("1994-06-15"),
        phoneVerifiedAt: day(u.registeredDaysAgo),
        createdAt: day(u.registeredDaysAgo),
      },
    });
    userIdByEmail.set(u.email, user.id);

    await prisma.kycRecord.upsert({
      where: { userId: user.id },
      update: {
        tier: u.kycTier,
        status: u.kycStatus,
        fullName: u.fullName ?? null,
        documentNumber: u.documentNumber ?? null,
      },
      create: {
        id: u.kycId,
        userId: user.id,
        tier: u.kycTier,
        status: u.kycStatus,
        fullName: u.fullName ?? null,
        documentNumber: u.documentNumber ?? null,
        createdAt: day(u.registeredDaysAgo),
      },
    });

    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: { balanceMinor: u.walletBalanceMinor },
      create: {
        id: u.walletId,
        userId: user.id,
        balanceMinor: u.walletBalanceMinor,
      },
    });

    for (const doc of u.documents ?? []) {
      await prisma.kycDocument.upsert({
        where: { id: doc.id },
        update: {
          kycRecordId: u.kycId,
          documentType: doc.documentType,
          storagePath: doc.storagePath,
        },
        create: {
          id: doc.id,
          kycRecordId: u.kycId,
          documentType: doc.documentType,
          storagePath: doc.storagePath,
          uploadedAt: day(u.registeredDaysAgo),
        },
      });
    }
  }

  for (const balance of DEMO_WALLET_BALANCES) {
    const user = await prisma.user.findUnique({ where: { email: balance.email } });
    if (!user) continue;
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: { balanceMinor: balance.balanceMinor },
      create: { userId: user.id, balanceMinor: balance.balanceMinor },
    });
    userIdByEmail.set(balance.email, user.id);
  }

  // Staff accounts (admin/compliance/support) come from prisma/seed.ts but are
  // referenced here as reviewers, mediators and message senders.
  const everyone = await prisma.user.findMany({ select: { id: true, email: true } });
  for (const u of everyone) userIdByEmail.set(u.email, u.id);

  for (const job of DEMO_JOBS) {
    const clientId = userIdByEmail.get(job.clientEmail);
    if (!clientId) throw new Error(`demo job ${job.id}: unknown client ${job.clientEmail}`);
    const data = {
      clientId,
      title: job.title,
      category: job.category,
      description: job.description,
      budgetMinMinor: job.budgetMinMinor,
      budgetMaxMinor: job.budgetMaxMinor,
      deadline: ahead(job.deadlineInDays) ?? new Date(),
      status: job.status,
      proposedMilestones: job.proposedMilestones,
      createdAt: day(job.createdDaysAgo),
    };
    await prisma.job.upsert({
      where: { id: job.id },
      update: data,
      create: { id: job.id, ...data },
    });
  }

  for (const contract of DEMO_CONTRACTS) {
    const clientId = userIdByEmail.get(contract.clientEmail);
    const freelancerId = userIdByEmail.get(contract.freelancerEmail);
    if (!clientId || !freelancerId) {
      throw new Error(`demo contract ${contract.id}: unknown participant`);
    }
    const data = {
      jobId: contract.jobId,
      clientId,
      freelancerId,
      templateVersion: "2026-01",
      documentStoragePath: `demo/contracts/${contract.id}.pdf`,
      status: contract.status,
      clientAcceptedAt: day(contract.acceptedDaysAgo),
      freelancerAcceptedAt: day(contract.acceptedDaysAgo),
      cancellableUntil: day(contract.createdDaysAgo - 7),
      createdAt: day(contract.createdDaysAgo),
    };
    await prisma.contract.upsert({
      where: { id: contract.id },
      update: data,
      create: { id: contract.id, ...data },
    });

    for (const ms of contract.milestones) {
      const milestoneData = {
        contractId: contract.id,
        title: ms.title,
        amountMinor: ms.amountMinor,
        dueDate: ahead(ms.dueInDays) ?? new Date(),
        escrowState: ms.escrowState,
        submittedAt: at(ms.submittedDaysAgo),
        deliverableUrl: ms.deliverableUrl ?? null,
        autoReleaseAt: ahead(ms.autoReleaseInDays),
        releasedAt: at(ms.releasedDaysAgo),
        createdAt: day(ms.createdDaysAgo),
      };
      await prisma.milestone.upsert({
        where: { id: ms.id },
        update: milestoneData,
        create: { id: ms.id, ...milestoneData },
      });
    }
  }

  for (const payment of DEMO_PAYMENTS) {
    const data = {
      milestoneId: payment.milestoneId,
      provider: payment.provider,
      providerTransactionId: payment.providerTransactionId,
      amountMinor: payment.amountMinor,
      status: payment.status,
      createdAt: day(payment.createdDaysAgo),
    };
    await prisma.paymentTransaction.upsert({
      where: { id: payment.id },
      update: data,
      create: { id: payment.id, ...data },
    });
  }

  const walletIdByEmail = new Map<string, string>();
  const wallets = await prisma.wallet.findMany({
    where: { userId: { in: [...userIdByEmail.values()] } },
    select: { id: true, userId: true },
  });
  const walletIdByUserId = new Map(wallets.map((w) => [w.userId, w.id]));
  for (const [email, id] of userIdByEmail) {
    const walletId = walletIdByUserId.get(id);
    if (walletId) walletIdByEmail.set(email, walletId);
  }

  for (const payout of DEMO_PAYOUTS) {
    const userId = userIdByEmail.get(payout.userEmail);
    const walletId = walletIdByEmail.get(payout.userEmail);
    if (!userId || !walletId) {
      throw new Error(`demo payout ${payout.id}: no wallet for ${payout.userEmail}`);
    }
    const data = {
      userId,
      walletId,
      amountMinor: payout.amountMinor,
      feeMinor: payout.feeMinor,
      netAmountMinor: payout.amountMinor - payout.feeMinor,
      provider: payout.provider,
      providerPayoutId: payout.providerPayoutId ?? null,
      payoutAccountIdentifier: payout.payoutAccountIdentifier,
      status: payout.status,
      createdAt: day(payout.createdDaysAgo),
      settledAt: at(payout.settledDaysAgo),
    };
    await prisma.payoutTransaction.upsert({
      where: { id: payout.id },
      update: data,
      create: { id: payout.id, ...data },
    });
  }

  for (const topUp of DEMO_TOP_UPS) {
    const userId = userIdByEmail.get(topUp.userEmail);
    const walletId = walletIdByEmail.get(topUp.userEmail);
    if (!userId || !walletId) {
      throw new Error(`demo top-up ${topUp.id}: no wallet for ${topUp.userEmail}`);
    }
    const reviewerId = topUp.reviewedByEmail
      ? userIdByEmail.get(topUp.reviewedByEmail)
      : undefined;
    const data = {
      userId,
      walletId,
      provider: topUp.provider,
      amountMinor: topUp.amountMinor,
      referenceNumber: topUp.referenceNumber,
      receiptImagePath: topUp.receiptImagePath ?? null,
      status: topUp.status,
      reviewedByStaffId: reviewerId ?? null,
      rejectionReason: topUp.rejectionReason ?? null,
      reviewedAt: at(topUp.reviewedDaysAgo),
      createdAt: day(topUp.createdDaysAgo),
    };
    await prisma.walletTopUp.upsert({
      where: { id: topUp.id },
      update: data,
      create: { id: topUp.id, ...data },
    });
  }

  for (const dispute of DEMO_DISPUTES) {
    const raisedById = userIdByEmail.get(dispute.raisedByEmail);
    if (!raisedById) {
      throw new Error(`demo dispute ${dispute.id}: unknown raiser`);
    }
    const data = {
      contractId: dispute.contractId,
      milestoneId: dispute.milestoneId,
      category: dispute.category,
      stage: dispute.stage,
      raisedByUserId: raisedById,
      description: dispute.description,
      negotiationDeadlineAt: ahead(dispute.negotiationDeadlineInDays),
      mediationDeadlineAt: ahead(dispute.mediationDeadlineInDays),
      assignedMediatorStaffId: dispute.assignedMediatorEmail
        ? (userIdByEmail.get(dispute.assignedMediatorEmail) ?? null)
        : null,
      assignedAt: at(dispute.assignedDaysAgo),
      resolvedByStaffId: dispute.resolvedByEmail
        ? (userIdByEmail.get(dispute.resolvedByEmail) ?? null)
        : null,
      resolutionOutcome: dispute.resolutionOutcome ?? null,
      freelancerShareMinor: dispute.freelancerShareMinor ?? null,
      resolvedAt: at(dispute.resolvedDaysAgo),
      createdAt: day(dispute.createdDaysAgo),
    };
    await prisma.dispute.upsert({
      where: { id: dispute.id },
      update: data,
      create: { id: dispute.id, ...data },
    });
  }

  for (const flag of DEMO_FLAGS) {
    const userId = userIdByEmail.get(flag.userEmail);
    if (!userId) throw new Error(`demo flag ${flag.id}: unknown user`);
    const data = {
      userId,
      type: flag.type,
      status: flag.status,
      details: flag.details,
      relatedEntityId: flag.relatedEntityId ?? null,
      reviewedByStaffId: flag.reviewedByEmail
        ? (userIdByEmail.get(flag.reviewedByEmail) ?? null)
        : null,
      reviewNotes: flag.reviewNotes ?? null,
      createdAt: day(flag.createdDaysAgo),
    };
    await prisma.transactionFlag.upsert({
      where: { id: flag.id },
      update: data,
      create: { id: flag.id, ...data },
    });
  }

  for (const report of DEMO_REPORTS) {
    const reporterId = userIdByEmail.get(report.reporterEmail);
    const reportedUserId = userIdByEmail.get(report.reportedUserEmail);
    if (!reporterId || !reportedUserId) {
      throw new Error(`demo report ${report.id}: unknown user`);
    }
    const data = {
      reporterId,
      reportedUserId,
      reason: report.reason,
      details: report.details,
      status: report.status,
      createdAt: day(report.createdDaysAgo),
    };
    await prisma.profileReport.upsert({
      where: { id: report.id },
      update: data,
      create: { id: report.id, ...data },
    });
  }

  for (const conv of DEMO_CONVERSATIONS) {
    const creatorId = userIdByEmail.get(conv.creatorEmail);
    if (!creatorId) throw new Error(`demo conversation ${conv.id}: unknown creator`);
    const assignedStaffId = conv.assignedStaffEmail
      ? (userIdByEmail.get(conv.assignedStaffEmail) ?? null)
      : null;
    const data = {
      creatorId,
      assignedStaffId,
      contactEmail: conv.contactEmail,
      subject: conv.subject,
      status: conv.status,
      createdAt: day(conv.createdDaysAgo),
    };
    await prisma.conversation.upsert({
      where: { id: conv.id },
      update: { ...data, updatedAt: day(conv.messages[0]?.createdDaysAgo ?? conv.createdDaysAgo) },
      create: { id: conv.id, ...data },
    });

    const participantIds = new Set([creatorId, ...(assignedStaffId ? [assignedStaffId] : [])]);
    for (const userId of participantIds) {
      await prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: conv.id, userId } },
        update: {},
        create: { conversationId: conv.id, userId },
      });
    }

    for (const msg of conv.messages) {
      const senderId = userIdByEmail.get(msg.senderEmail);
      if (!senderId) throw new Error(`demo message ${msg.id}: unknown sender`);
      await prisma.chatMessage.upsert({
        where: { id: msg.id },
        update: {
          conversationId: conv.id,
          senderId,
          body: msg.body,
          createdAt: day(msg.createdDaysAgo),
        },
        create: {
          id: msg.id,
          conversationId: conv.id,
          senderId,
          body: msg.body,
          createdAt: day(msg.createdDaysAgo),
        },
      });
    }
  }

  for (const entry of DEMO_AUDIT_LOGS) {
    const userId = entry.userEmail
      ? (userIdByEmail.get(entry.userEmail) ?? null)
      : null;
    const data = {
      userId,
      eventType: entry.eventType,
      action: entry.action ?? null,
      entityType: entry.entityType,
      entityId: entry.entityId,
      actorRole: entry.actorRole ?? null,
      amountMinor: entry.amountMinor ?? null,
      metadata: entry.metadata ?? undefined,
      createdAt: day(entry.createdDaysAgo),
    };
    await prisma.auditLog.upsert({
      where: { id: entry.id },
      update: data,
      create: { id: entry.id, ...data },
    });
  }

  return {
    users: DEMO_USERS.length,
    jobs: DEMO_JOBS.length,
    contracts: DEMO_CONTRACTS.length,
    milestones: DEMO_CONTRACTS.reduce((n, c) => n + c.milestones.length, 0),
    payments: DEMO_PAYMENTS.length,
    payouts: DEMO_PAYOUTS.length,
    topUps: DEMO_TOP_UPS.length,
    disputes: DEMO_DISPUTES.length,
    flags: DEMO_FLAGS.length,
    reports: DEMO_REPORTS.length,
    conversations: DEMO_CONVERSATIONS.length,
    auditLogs: DEMO_AUDIT_LOGS.length,
  };
}
