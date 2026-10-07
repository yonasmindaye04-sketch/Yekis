import { z } from "zod";

/**
 * These schemas are the single source of truth for shapes shared between
 * the backend API, the Next.js web frontend, and (later) the Telegram Mini App.
 * Import from "@marketplace/schemas" in any workspace app.
 */

// ---------- Enums (kept as const arrays so Zod + Prisma stay in sync) ----------

export const UserRole = z.enum(["CLIENT", "FREELANCER", "BOTH"]);
export type UserRole = z.infer<typeof UserRole>;

export const KycTier = z.enum(["TIER_1", "TIER_2", "TIER_3"]);
export type KycTier = z.infer<typeof KycTier>;

export const KycStatus = z.enum(["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED"]);
export type KycStatus = z.infer<typeof KycStatus>;

export const EscrowState = z.enum([
  "PAYMENT_PENDING",
  "ESCROW_HELD",
  "WORK_IN_PROGRESS",
  "SUBMITTED_FOR_REVIEW",
  "ACCEPTED",
  "RELEASED",
  "DISPUTED",
  "REFUNDED",
  "PARTIAL_REFUND",
]);
export type EscrowState = z.infer<typeof EscrowState>;

export const DisputeStage = z.enum([
  "NONE",
  "STAGE_1_NEGOTIATION",
  "STAGE_2_EVIDENCE",
  "STAGE_3_MEDIATION",
  "STAGE_4_ARBITRATION",
  "RESOLVED",
]);
export type DisputeStage = z.infer<typeof DisputeStage>;

export const DisputeCategory = z.enum([
  "NON_DELIVERY",
  "LATE_DELIVERY",
  "QUALITY_ISSUE",
  "SCOPE_CREEP",
  "NON_PAYMENT",
  "COMMUNICATION_BREAKDOWN",
]);
export type DisputeCategory = z.infer<typeof DisputeCategory>;

// PAY-002: Approved payment architecture: Telebirr, CBE Birr, and Safaricom M-Pesa.
export const PaymentProvider = z.enum(["TELEBIRR", "CBE_BIRR", "M_PESA"]);
export type PaymentProvider = z.infer<typeof PaymentProvider>;

// Launch categories — locked in Phase 0. Keep this list here so the whole
// stack (job posting form, search filters, admin panel) reads from one place.
export const LaunchCategory = z.enum([
  "WEB_APP_DEVELOPMENT",
  "GRAPHIC_DESIGN",
  "DIGITAL_MARKETING",
  "CONTENT_WRITING",
  "TRANSLATION",
  "DATA_ENTRY",
]);
export type LaunchCategory = z.infer<typeof LaunchCategory>;

export const KycDocumentType = z.enum([
  "NATIONAL_ID",
  "PASSPORT",
  "DRIVERS_LICENSE",
  "SELFIE_LIVENESS",
  "TIN_CERTIFICATE",
  "BUSINESS_REGISTRATION",
]);
export type KycDocumentType = z.infer<typeof KycDocumentType>;

export const StaffRole = z.enum(["COMPLIANCE_OFFICER", "ADMIN"]);
export type StaffRole = z.infer<typeof StaffRole>;

// ---------- Money ----------
// Always store and pass amounts as integer minor units (ETB cents) to avoid
// floating-point drift on financial calculations. Convert to display birr
// only at the presentation layer.
export const Money = z.object({
  amountMinor: z.number().int().nonnegative(), // e.g. 150000 = 1,500.00 ETB
  currency: z.literal("ETB"),
});
export type Money = z.infer<typeof Money>;

// ---------- Auth ----------

export const RegisterInput = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^\+251\d{9}$/, "Must be a valid Ethiopian phone number (+251XXXXXXXXX)"),
  password: z.string().min(10),
  languagePreference: z.enum(["am", "en"]),
  role: UserRole,
  dateOfBirth: z.string().date(), // ISO date — checked server-side against capacity gate
  consents: z.object({
    // Required, no opt-out (PDPP Arts. 8 & 11 — freely given, specific, unbundled)
    kycDataProcessing: z.literal(true),
    financialDataProcessing: z.literal(true),
    platformNotifications: z.boolean().default(false),
    marketingCommunications: z.boolean().default(false),
    analytics: z.boolean().default(false),
  }),
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const LoginInput = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  identifier: z.string().optional(),
  password: z.string().min(1, "Password is required"),
}).refine((data) => Boolean(data.email || data.phone || data.identifier), {
  message: "Email or phone number is required.",
});
export type LoginInput = z.infer<typeof LoginInput>;

// ---------- Jobs & Proposals ----------

export const JobStatus = z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export type JobStatus = z.infer<typeof JobStatus>;

export const ProposalStatus = z.enum([
  "SUBMITTED",
  "SHORTLISTED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
]);
export type ProposalStatus = z.infer<typeof ProposalStatus>;

export const MilestonePlanItem = z.object({
  title: z.string().min(3),
  amount: Money,
  dueDate: z.string().date(),
});
export type MilestonePlanItem = z.infer<typeof MilestonePlanItem>;

export const CreateJobInput = z.object({
  title: z.string().min(5).max(120),
  category: LaunchCategory,
  description: z.string().min(20).max(5000),
  budgetMin: Money,
  budgetMax: Money,
  proposedMilestones: z.array(MilestonePlanItem).min(1),
  deadline: z.string().date(),
}).refine((data) => data.budgetMax.amountMinor >= data.budgetMin.amountMinor, {
  message: "budgetMax must be greater than or equal to budgetMin.",
  path: ["budgetMax"],
});
export type CreateJobInput = z.infer<typeof CreateJobInput>;

export const JobSearchQuery = z.object({
  category: LaunchCategory.optional(),
  status: JobStatus.optional().default("OPEN"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});
export type JobSearchQuery = z.infer<typeof JobSearchQuery>;

export const CreateProposalInput = z.object({
  jobId: z.string().cuid(),
  coverLetter: z.string().min(20).max(3000),
  quotedAmount: Money,
  estimatedDays: z.number().int().positive(),
  milestoneBreakdown: z.array(MilestonePlanItem).min(1),
  attachmentPaths: z.array(z.string()).optional(),
});
export type CreateProposalInput = z.infer<typeof CreateProposalInput>;

export const ProposalDecisionInput = z.object({
  decision: z.enum(["SHORTLISTED", "ACCEPTED", "REJECTED"]),
});
export type ProposalDecisionInput = z.infer<typeof ProposalDecisionInput>;

// ---------- Escrow / Payments ----------

export const FundEscrowInput = z.object({
  contractId: z.string().cuid(),
  milestoneId: z.string().cuid(),
  provider: PaymentProvider,
});
export type FundEscrowInput = z.infer<typeof FundEscrowInput>;

// Generic webhook envelope — each provider's actual payload gets verified
// and normalized into this shape before touching business logic.
export const PaymentWebhookEvent = z.object({
  provider: PaymentProvider,
  providerTransactionId: z.string(),
  status: z.enum(["SUCCESS", "FAILED", "PENDING"]),
  amount: Money,
  rawPayload: z.record(z.unknown()),
});
export type PaymentWebhookEvent = z.infer<typeof PaymentWebhookEvent>;

// ---------- Wallet Top-Up (manual receipt review) ----------

export const TopUpStatus = z.enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED"]);
export type TopUpStatus = z.infer<typeof TopUpStatus>;

// Metadata accompanying the multipart receipt upload — same pattern as
// SubmitKycDocumentInput.
export const SubmitTopUpInput = z.object({
  provider: PaymentProvider,
  amountMinor: z.number().int().positive(),
  referenceNumber: z.string().min(3).max(100),
});
export type SubmitTopUpInput = z.infer<typeof SubmitTopUpInput>;

/**
 * A user-initiated withdrawal from their platform wallet.
 *
 * `payoutAccountIdentifier` is still free-form here (phone or bank account) —
 * the hardening plan's T2.4 replaces it with a reference to a stored
 * PayoutMethod row so a withdrawal can only ever go to an account the user
 * added earlier and which has finished its cooling-off period.
 */
export const WithdrawInput = z.object({
  provider: PaymentProvider,
  amountMinor: z.number().int().positive(),
  payoutAccountIdentifier: z.string().min(4).max(100),
});
export type WithdrawInput = z.infer<typeof WithdrawInput>;

export const TopUpReviewDecisionInput = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    rejectionReason: z.string().min(5).max(500).optional(),
  })
  .refine((data) => data.decision !== "REJECTED" || !!data.rejectionReason, {
    message: "rejectionReason is required when rejecting.",
  });
export type TopUpReviewDecisionInput = z.infer<typeof TopUpReviewDecisionInput>;

export const FlagTopUpInput = z.object({
  reason: z.string().min(10).max(1000),
});
export type FlagTopUpInput = z.infer<typeof FlagTopUpInput>;

// ---------- TMS (Transaction Monitoring / AML) ----------

export const TransactionFlagType = z.enum(["STRUCTURING", "VELOCITY", "ROUND_AMOUNTS", "PASS_THROUGH", "WALLET_MISMATCH", "STAFF_FLAGGED"]);
export type TransactionFlagType = z.infer<typeof TransactionFlagType>;

export const TransactionFlagStatus = z.enum(["PENDING_REVIEW", "STR_FILED", "DISMISSED"]);
export type TransactionFlagStatus = z.infer<typeof TransactionFlagStatus>;

export const FileStrInput = z.object({
  reviewNotes: z.string().min(10).max(2000),
  strReferenceNumber: z.string().min(1).max(200),
  // Master Design §11.4: a filed STR means suspicion is confirmed —
  // "freeze funds, suspend the account, preserve records." The Compliance
  // Officer opts in explicitly; the suspension is audited separately.
  suspendAccount: z.boolean().default(false),
});
export type FileStrInput = z.infer<typeof FileStrInput>;

export const DismissFlagInput = z.object({
  reviewNotes: z.string().min(10).max(2000),
});
export type DismissFlagInput = z.infer<typeof DismissFlagInput>;

// ---------- KYC ----------

// Step 1: submit Tier 1 documents. The actual file bytes go via multipart
// upload to a dedicated endpoint — this schema covers the metadata that
// accompanies it, matched to the uploaded file by documentType.
export const SubmitKycDocumentInput = z.object({
  documentType: KycDocumentType,
});
export type SubmitKycDocumentInput = z.infer<typeof SubmitKycDocumentInput>;

// Step 2 (optional, gates Tier 2 / withdrawal eligibility)
export const UpgradeToTier2Input = z.object({
  tin: z.string().min(5).optional(),
  businessRegNumber: z.string().min(3).optional(),
}).refine((data) => data.tin || data.businessRegNumber, {
  message: "Either a TIN or a business registration number is required for Tier 2.",
});
export type UpgradeToTier2Input = z.infer<typeof UpgradeToTier2Input>;

// Compliance Officer / Admin manual review decision
export const KycReviewDecisionInput = z.object({
  decision: z.enum(["VERIFIED", "REJECTED"]),
  rejectionReason: z.string().min(5).max(500).optional(),
}).refine((data) => data.decision !== "REJECTED" || !!data.rejectionReason, {
  message: "rejectionReason is required when rejecting.",
});
export type KycReviewDecisionInput = z.infer<typeof KycReviewDecisionInput>;

export const KycStatusResponse = z.object({
  tier: KycTier,
  status: KycStatus,
  nextReviewDueAt: z.string().datetime().nullable(),
  rejectionReason: z.string().nullable(),
  documentsSubmitted: z.array(KycDocumentType),
});
export type KycStatusResponse = z.infer<typeof KycStatusResponse>;

// ---------- Disputes ----------

export const RaiseDisputeInput = z.object({
  contractId: z.string().cuid(),
  milestoneId: z.string().cuid(),
  category: DisputeCategory,
  description: z.string().min(20).max(3000),
});
export type RaiseDisputeInput = z.infer<typeof RaiseDisputeInput>;

export const SubmitEvidenceInput = z.object({
  statement: z.string().min(10).max(5000),
});
export type SubmitEvidenceInput = z.infer<typeof SubmitEvidenceInput>;

export const DisputeResolutionOutcome = z.enum([
  "RELEASE_TO_FREELANCER",
  "REFUND_TO_CLIENT",
  "PARTIAL_SPLIT",
]);
export type DisputeResolutionOutcome = z.infer<typeof DisputeResolutionOutcome>;

export const MediatorResolutionInput = z
  .object({
    outcome: DisputeResolutionOutcome,
    recommendation: z.string().min(10).max(2000),
    // Required and only meaningful when outcome === "PARTIAL_SPLIT"
    freelancerShareMinor: z.number().int().nonnegative().optional(),
  })
  .refine((data) => data.outcome !== "PARTIAL_SPLIT" || data.freelancerShareMinor !== undefined, {
    message: "freelancerShareMinor is required when outcome is PARTIAL_SPLIT.",
  });
export type MediatorResolutionInput = z.infer<typeof MediatorResolutionInput>;

// ---------- Gigs (Fiverr-style service packages) ----------
// See docs/GIG_MODEL_PLAN.md. Amounts are integer minor units (ETB cents).

export const GigPackageTier = z.enum(["BASIC", "STANDARD", "PREMIUM"]);
export type GigPackageTier = z.infer<typeof GigPackageTier>;

export const GigStatus = z.enum(["DRAFT", "ACTIVE", "PAUSED", "REJECTED", "ARCHIVED"]);
export type GigStatus = z.infer<typeof GigStatus>;

const GigFaqItem = z.object({ question: z.string().min(1), answer: z.string().min(1) });
const GigRequirement = z.object({
  label: z.string().min(1),
  type: z.enum(["text", "textarea", "choice"]).default("text"),
  required: z.boolean().default(true),
  options: z.array(z.string()).optional(),
});

export const GigPackageInput = z.object({
  tier: GigPackageTier,
  title: z.string().min(2).max(120),
  description: z.string().min(5).max(2000),
  deliveryDays: z.number().int().min(1).max(365),
  revisionsIncluded: z.number().int().min(0).max(20).default(1),
  priceMinor: z.number().int().positive(),
  addOns: z.array(z.object({ label: z.string().min(1), priceMinor: z.number().int().nonnegative() })).optional(),
});
export type GigPackageInput = z.infer<typeof GigPackageInput>;

export const CreateGigInput = z.object({
  title: z.string().min(5).max(120),
  category: LaunchCategory,
  description: z.string().min(20).max(5000),
  tags: z.array(z.string().min(1).max(50)).max(20),
  requirements: z.array(GigRequirement).max(20),
  faqJson: z.array(GigFaqItem).max(30).optional(),
  thumbnailUrl: z.string().url().max(500).optional(),
  mediaUrls: z.array(z.string().url()).max(20).optional(),
  autoAcceptOrders: z.boolean().default(true),
  maxRevisions: z.number().int().min(0).max(20).default(2),
  packages: z.array(GigPackageInput).min(1).max(3),
});
export type CreateGigInput = z.infer<typeof CreateGigInput>;

export const UpdateGigInput = CreateGigInput.partial().omit({ packages: true });
export type UpdateGigInput = z.infer<typeof UpdateGigInput>;

/**
 * Public gig discovery query.
 *
 * Deliberately has no `status` field. This schema parses an unauthenticated
 * request, so accepting GigStatus here let any caller list DRAFT / REJECTED /
 * ARCHIVED listings — including freelancerId, title and price — by passing
 * `?status=DRAFT`. Public discovery has exactly one legal answer, ACTIVE,
 * which searchGigs() now hard-codes rather than reading from the query.
 * Staff needing other statuses should use an admin-scoped endpoint.
 */
export const GigSearchQuery = z.object({
  category: LaunchCategory.optional(),
  q: z.string().max(120).optional(),
  minPriceMinor: z.coerce.number().int().nonnegative().optional(),
  maxPriceMinor: z.coerce.number().int().nonnegative().optional(),
  page: z.coerce.number().positive().default(1),
  pageSize: z.coerce.number().positive().max(50).default(20),
});
export type GigSearchQuery = z.infer<typeof GigSearchQuery>;

export const CreateGigOrderInput = z.object({
  packageId: z.string().cuid(),
  requirementsAnswer: z.record(z.string(), z.any()).optional(),
});
export type CreateGigOrderInput = z.infer<typeof CreateGigOrderInput>;

export const SubmitGigDeliveryInput = z.object({
  deliverableUrl: z.string().max(2000).optional(),
});
export type SubmitGigDeliveryInput = z.infer<typeof SubmitGigDeliveryInput>;

export const RequestGigRevisionInput = z.object({
  note: z.string().min(5).max(2000),
});
export type RequestGigRevisionInput = z.infer<typeof RequestGigRevisionInput>;

export const CreateGigReviewInput = z.object({
  rating: z.number().int().min(1).max(5),
  categoryRatings: z.object({
    communication: z.number().int().min(1).max(5),
    quality: z.number().int().min(1).max(5),
    deadline: z.number().int().min(1).max(5),
    valueForMoney: z.number().int().min(1).max(5),
  }),
  comment: z.string().max(2000).optional(),
});
export type CreateGigReviewInput = z.infer<typeof CreateGigReviewInput>;
