-- ============================================================================
-- Demo activity
--
-- The same rows prisma/demoActivity.ts seeds: three clients/freelancers, three
-- jobs and contracts, nine milestones across every escrow state, payment and
-- payout history, pending wallet top-ups (the Receipts queue), open disputes,
-- compliance flags, profile reports, support threads and audit entries.
--
-- Without these rows every console metric is zero even though every endpoint
-- returns 200: the profile seed alone has no contracts to escrow, no payments
-- to chart and no receipts to review.
--
-- Idempotent by construction: inserts are guarded with NOT EXISTS (by id, or by
-- email for users) so running on a database that already ran `prisma/seed.ts`
-- is a no-op. Dates are relative to migration time to keep charts populated.
--
-- GENERATED FILE — edit prisma/demoActivity.ts and re-run
--   npx tsx scripts/generate-demo-activity-migration.ts
-- ============================================================================


-- ------------------------------------------------------------------ users

INSERT INTO "User" ("id", "ucid", "email", "phone", "passwordHash", "role", "dateOfBirth", "phoneVerifiedAt", "firstName", "lastName", "bio", "isAvailableForWork", "cachedKycTier", "cachedKycStatus", "totalEarnedNetMinor", "totalSpentGrossMinor", "createdAt", "updatedAt")
SELECT
  'seed-user-client',
  'seed-ucid-client',
  'client@yekis.et',
  '+251910011822',
  '$argon2id$v=19$m=16384,t=3,p=4$moKzIFyFuBOQSBofUzBkMA$8+FqJ8ALDHtSjPUbRFR+N7NihXxl2LDPwuqSbsrXcjk',
  'CLIENT',
  '1994-06-15'::timestamp,
  (CURRENT_TIMESTAMP - INTERVAL '72 days'),
  'Hanna',
  'Bekele',
  '',
  false,
  'TIER_1',
  'VERIFIED',
  0,
  12700000,
  (CURRENT_TIMESTAMP - INTERVAL '72 days'),
  (CURRENT_TIMESTAMP - INTERVAL '72 days')
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "email" = 'client@yekis.et');

INSERT INTO "User" ("id", "ucid", "email", "phone", "passwordHash", "role", "dateOfBirth", "phoneVerifiedAt", "firstName", "lastName", "bio", "isAvailableForWork", "cachedKycTier", "cachedKycStatus", "totalEarnedNetMinor", "totalSpentGrossMinor", "createdAt", "updatedAt")
SELECT
  'seed-user-freelancer',
  'seed-ucid-freelancer',
  'freelancer@yekis.et',
  '+251910011823',
  '$argon2id$v=19$m=16384,t=3,p=4$moKzIFyFuBOQSBofUzBkMA$8+FqJ8ALDHtSjPUbRFR+N7NihXxl2LDPwuqSbsrXcjk',
  'FREELANCER',
  '1994-06-15'::timestamp,
  (CURRENT_TIMESTAMP - INTERVAL '68 days'),
  'Dawit',
  'Tesfaye',
  'Brand strategist and identity designer working with Ethiopian exporters and hospitality brands.',
  true,
  'TIER_1',
  'VERIFIED',
  9850000,
  0,
  (CURRENT_TIMESTAMP - INTERVAL '68 days'),
  (CURRENT_TIMESTAMP - INTERVAL '68 days')
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "email" = 'freelancer@yekis.et');

INSERT INTO "User" ("id", "ucid", "email", "phone", "passwordHash", "role", "dateOfBirth", "phoneVerifiedAt", "firstName", "lastName", "bio", "isAvailableForWork", "cachedKycTier", "cachedKycStatus", "totalEarnedNetMinor", "totalSpentGrossMinor", "createdAt", "updatedAt")
SELECT
  'seed-user-newbie',
  'seed-ucid-newbie',
  'newbie@yekis.et',
  '+251910011824',
  '$argon2id$v=19$m=16384,t=3,p=4$moKzIFyFuBOQSBofUzBkMA$8+FqJ8ALDHtSjPUbRFR+N7NihXxl2LDPwuqSbsrXcjk',
  'CLIENT',
  '1994-06-15'::timestamp,
  (CURRENT_TIMESTAMP - INTERVAL '3 days'),
  'Meron',
  'Girma',
  '',
  false,
  'TIER_1',
  'UNDER_REVIEW',
  0,
  0,
  (CURRENT_TIMESTAMP - INTERVAL '3 days'),
  (CURRENT_TIMESTAMP - INTERVAL '3 days')
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "email" = 'newbie@yekis.et');

-- ------------------------------------------------------- kyc + wallet rows

INSERT INTO "KycRecord" ("id", "userId", "tier", "status", "fullName", "documentNumber", "createdAt", "updatedAt")
SELECT
  'seed-kyc-client',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  'TIER_1',
  'VERIFIED',
  'Hanna Bekele',
  'ET-4471-2290',
  (CURRENT_TIMESTAMP - INTERVAL '72 days'),
  (CURRENT_TIMESTAMP - INTERVAL '72 days')
WHERE NOT EXISTS (SELECT 1 FROM "KycRecord" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'));

INSERT INTO "Wallet" ("id", "userId", "balanceMinor", "updatedAt")
SELECT
  'seed-wallet-client',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  1850000,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Wallet" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'));

INSERT INTO "KycRecord" ("id", "userId", "tier", "status", "fullName", "documentNumber", "createdAt", "updatedAt")
SELECT
  'seed-kyc-freelancer',
  (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et'),
  'TIER_1',
  'VERIFIED',
  'Dawit Tesfaye',
  'ET-5518-7741',
  (CURRENT_TIMESTAMP - INTERVAL '68 days'),
  (CURRENT_TIMESTAMP - INTERVAL '68 days')
WHERE NOT EXISTS (SELECT 1 FROM "KycRecord" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et'));

INSERT INTO "Wallet" ("id", "userId", "balanceMinor", "updatedAt")
SELECT
  'seed-wallet-freelancer',
  (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et'),
  3420000,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Wallet" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et'));

INSERT INTO "KycRecord" ("id", "userId", "tier", "status", "fullName", "documentNumber", "createdAt", "updatedAt")
SELECT
  'seed-kyc-newbie',
  (SELECT "id" FROM "User" WHERE "email" = 'newbie@yekis.et'),
  'TIER_1',
  'UNDER_REVIEW',
  'Meron Girma',
  'ET-4821-9930',
  (CURRENT_TIMESTAMP - INTERVAL '3 days'),
  (CURRENT_TIMESTAMP - INTERVAL '3 days')
WHERE NOT EXISTS (SELECT 1 FROM "KycRecord" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'newbie@yekis.et'));

INSERT INTO "Wallet" ("id", "userId", "balanceMinor", "updatedAt")
SELECT
  'seed-wallet-newbie',
  (SELECT "id" FROM "User" WHERE "email" = 'newbie@yekis.et'),
  0,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Wallet" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'newbie@yekis.et'));

INSERT INTO "KycDocument" ("id", "kycRecordId", "documentType", "storagePath", "uploadedAt")
SELECT
  'seed-kycdoc-newbie-id',
  (SELECT "id" FROM "KycRecord" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'newbie@yekis.et')),
  'NATIONAL_ID',
  'demo/kyc/newbie-national-id.pdf',
  (CURRENT_TIMESTAMP - INTERVAL '3 days')
WHERE NOT EXISTS (SELECT 1 FROM "KycDocument" WHERE "id" = 'seed-kycdoc-newbie-id');

INSERT INTO "KycDocument" ("id", "kycRecordId", "documentType", "storagePath", "uploadedAt")
SELECT
  'seed-kycdoc-newbie-selfie',
  (SELECT "id" FROM "KycRecord" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'newbie@yekis.et')),
  'SELFIE_LIVENESS',
  'demo/kyc/newbie-selfie.jpg',
  (CURRENT_TIMESTAMP - INTERVAL '3 days')
WHERE NOT EXISTS (SELECT 1 FROM "KycDocument" WHERE "id" = 'seed-kycdoc-newbie-selfie');

-- -------------------------------------------- balances for existing users

UPDATE "Wallet" SET "balanceMinor" = 5260000, "updatedAt" = CURRENT_TIMESTAMP
WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et');

-- ------------------------------------------------------------ jobs/contracts

INSERT INTO "Job" ("id", "clientId", "title", "category", "description", "budgetMinMinor", "budgetMaxMinor", "deadline", "status", "proposedMilestones", "createdAt")
SELECT
  'seed-job-storefront',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  'E-commerce storefront rebuild',
  'WEB_APP_DEVELOPMENT',
  'Rebuild our coffee storefront for mobile-first shoppers: catalogue, cart, checkout with Telebirr and CBE Birr, and an admin view for orders.',
  12000000,
  18000000,
  (CURRENT_TIMESTAMP + INTERVAL '20 days'),
  'IN_PROGRESS',
  '[{"title":"Design system & homepage","amountMinor":4500000},{"title":"Checkout integration","amountMinor":6000000},{"title":"Launch support","amountMinor":2500000}]'::jsonb,
  (CURRENT_TIMESTAMP - INTERVAL '45 days')
WHERE NOT EXISTS (SELECT 1 FROM "Job" WHERE "id" = 'seed-job-storefront');

INSERT INTO "Job" ("id", "clientId", "title", "category", "description", "budgetMinMinor", "budgetMaxMinor", "deadline", "status", "proposedMilestones", "createdAt")
SELECT
  'seed-job-brand',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  'Brand identity for a coffee exporter',
  'GRAPHIC_DESIGN',
  'Full identity for a specialty coffee exporter: logo, packaging system, and a brand guide the team can actually follow.',
  4000000,
  6000000,
  (CURRENT_TIMESTAMP + INTERVAL '10 days'),
  'IN_PROGRESS',
  '[{"title":"Logo concepts","amountMinor":1800000},{"title":"Brand guidelines","amountMinor":2200000},{"title":"Social media kit","amountMinor":1500000},{"title":"Packaging templates","amountMinor":900000}]'::jsonb,
  (CURRENT_TIMESTAMP - INTERVAL '50 days')
WHERE NOT EXISTS (SELECT 1 FROM "Job" WHERE "id" = 'seed-job-brand');

INSERT INTO "Job" ("id", "clientId", "title", "category", "description", "budgetMinMinor", "budgetMaxMinor", "deadline", "status", "proposedMilestones", "createdAt")
SELECT
  'seed-job-copy',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  'Website copy for five pages',
  'CONTENT_WRITING',
  'Rewrite the copy for our home, about, services, pricing and contact pages in plain English, with a short SEO brief per page.',
  2000000,
  3000000,
  (CURRENT_TIMESTAMP - INTERVAL '45 days'),
  'COMPLETED',
  '[{"title":"Five pages of website copy","amountMinor":2200000},{"title":"Landing page copy","amountMinor":600000}]'::jsonb,
  (CURRENT_TIMESTAMP - INTERVAL '70 days')
WHERE NOT EXISTS (SELECT 1 FROM "Job" WHERE "id" = 'seed-job-copy');

INSERT INTO "Contract" ("id", "jobId", "clientId", "freelancerId", "templateVersion", "documentStoragePath", "status", "clientAcceptedAt", "freelancerAcceptedAt", "cancellableUntil", "createdAt")
SELECT
  'seed-contract-storefront',
  'seed-job-storefront',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et'),
  '2026-01',
  'demo/contracts/seed-contract-storefront.pdf',
  'ACTIVE',
  (CURRENT_TIMESTAMP - INTERVAL '41 days'),
  (CURRENT_TIMESTAMP - INTERVAL '41 days'),
  (CURRENT_TIMESTAMP - INTERVAL '35 days'),
  (CURRENT_TIMESTAMP - INTERVAL '42 days')
WHERE NOT EXISTS (SELECT 1 FROM "Contract" WHERE "id" = 'seed-contract-storefront');

INSERT INTO "Contract" ("id", "jobId", "clientId", "freelancerId", "templateVersion", "documentStoragePath", "status", "clientAcceptedAt", "freelancerAcceptedAt", "cancellableUntil", "createdAt")
SELECT
  'seed-contract-brand',
  'seed-job-brand',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et'),
  '2026-01',
  'demo/contracts/seed-contract-brand.pdf',
  'ACTIVE',
  (CURRENT_TIMESTAMP - INTERVAL '38 days'),
  (CURRENT_TIMESTAMP - INTERVAL '38 days'),
  (CURRENT_TIMESTAMP - INTERVAL '32 days'),
  (CURRENT_TIMESTAMP - INTERVAL '39 days')
WHERE NOT EXISTS (SELECT 1 FROM "Contract" WHERE "id" = 'seed-contract-brand');

INSERT INTO "Contract" ("id", "jobId", "clientId", "freelancerId", "templateVersion", "documentStoragePath", "status", "clientAcceptedAt", "freelancerAcceptedAt", "cancellableUntil", "createdAt")
SELECT
  'seed-contract-copy',
  'seed-job-copy',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et'),
  '2026-01',
  'demo/contracts/seed-contract-copy.pdf',
  'COMPLETED',
  (CURRENT_TIMESTAMP - INTERVAL '62 days'),
  (CURRENT_TIMESTAMP - INTERVAL '62 days'),
  (CURRENT_TIMESTAMP - INTERVAL '56 days'),
  (CURRENT_TIMESTAMP - INTERVAL '63 days')
WHERE NOT EXISTS (SELECT 1 FROM "Contract" WHERE "id" = 'seed-contract-copy');

-- --------------------------------------------------------------- milestones

INSERT INTO "Milestone" ("id", "contractId", "title", "amountMinor", "dueDate", "escrowState", "submittedAt", "deliverableUrl", "autoReleaseAt", "releasedAt", "createdAt")
SELECT
  'seed-ms-storefront-1',
  'seed-contract-storefront',
  'Design system & homepage',
  4500000,
  (CURRENT_TIMESTAMP - INTERVAL '35 days'),
  'RELEASED',
  (CURRENT_TIMESTAMP - INTERVAL '33 days'),
  NULL,
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '30 days'),
  (CURRENT_TIMESTAMP - INTERVAL '42 days')
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "id" = 'seed-ms-storefront-1');

INSERT INTO "Milestone" ("id", "contractId", "title", "amountMinor", "dueDate", "escrowState", "submittedAt", "deliverableUrl", "autoReleaseAt", "releasedAt", "createdAt")
SELECT
  'seed-ms-storefront-2',
  'seed-contract-storefront',
  'Checkout integration',
  6000000,
  (CURRENT_TIMESTAMP + INTERVAL '2 days'),
  'SUBMITTED_FOR_REVIEW',
  (CURRENT_TIMESTAMP - INTERVAL '2 days'),
  'https://files.yekis.demo/storefront/checkout-v2.zip',
  (CURRENT_TIMESTAMP + INTERVAL '3 days'),
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '42 days')
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "id" = 'seed-ms-storefront-2');

INSERT INTO "Milestone" ("id", "contractId", "title", "amountMinor", "dueDate", "escrowState", "submittedAt", "deliverableUrl", "autoReleaseAt", "releasedAt", "createdAt")
SELECT
  'seed-ms-storefront-3',
  'seed-contract-storefront',
  'Launch support',
  2500000,
  (CURRENT_TIMESTAMP + INTERVAL '16 days'),
  'ESCROW_HELD',
  NULL,
  NULL,
  NULL,
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '42 days')
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "id" = 'seed-ms-storefront-3');

INSERT INTO "Milestone" ("id", "contractId", "title", "amountMinor", "dueDate", "escrowState", "submittedAt", "deliverableUrl", "autoReleaseAt", "releasedAt", "createdAt")
SELECT
  'seed-ms-brand-1',
  'seed-contract-brand',
  'Logo concepts',
  1800000,
  (CURRENT_TIMESTAMP - INTERVAL '45 days'),
  'RELEASED',
  (CURRENT_TIMESTAMP - INTERVAL '43 days'),
  NULL,
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '40 days'),
  (CURRENT_TIMESTAMP - INTERVAL '39 days')
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "id" = 'seed-ms-brand-1');

INSERT INTO "Milestone" ("id", "contractId", "title", "amountMinor", "dueDate", "escrowState", "submittedAt", "deliverableUrl", "autoReleaseAt", "releasedAt", "createdAt")
SELECT
  'seed-ms-brand-2',
  'seed-contract-brand',
  'Brand guidelines',
  2200000,
  (CURRENT_TIMESTAMP - INTERVAL '6 days'),
  'DISPUTED',
  (CURRENT_TIMESTAMP - INTERVAL '12 days'),
  NULL,
  NULL,
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '39 days')
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "id" = 'seed-ms-brand-2');

INSERT INTO "Milestone" ("id", "contractId", "title", "amountMinor", "dueDate", "escrowState", "submittedAt", "deliverableUrl", "autoReleaseAt", "releasedAt", "createdAt")
SELECT
  'seed-ms-brand-3',
  'seed-contract-brand',
  'Social media kit',
  1500000,
  (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  'WORK_IN_PROGRESS',
  NULL,
  NULL,
  NULL,
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '39 days')
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "id" = 'seed-ms-brand-3');

INSERT INTO "Milestone" ("id", "contractId", "title", "amountMinor", "dueDate", "escrowState", "submittedAt", "deliverableUrl", "autoReleaseAt", "releasedAt", "createdAt")
SELECT
  'seed-ms-brand-4',
  'seed-contract-brand',
  'Packaging templates',
  900000,
  (CURRENT_TIMESTAMP + INTERVAL '3 days'),
  'DISPUTED',
  (CURRENT_TIMESTAMP - INTERVAL '6 days'),
  NULL,
  NULL,
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '39 days')
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "id" = 'seed-ms-brand-4');

INSERT INTO "Milestone" ("id", "contractId", "title", "amountMinor", "dueDate", "escrowState", "submittedAt", "deliverableUrl", "autoReleaseAt", "releasedAt", "createdAt")
SELECT
  'seed-ms-copy-1',
  'seed-contract-copy',
  'Five pages of website copy',
  2200000,
  (CURRENT_TIMESTAMP - INTERVAL '60 days'),
  'RELEASED',
  (CURRENT_TIMESTAMP - INTERVAL '58 days'),
  NULL,
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '55 days'),
  (CURRENT_TIMESTAMP - INTERVAL '63 days')
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "id" = 'seed-ms-copy-1');

INSERT INTO "Milestone" ("id", "contractId", "title", "amountMinor", "dueDate", "escrowState", "submittedAt", "deliverableUrl", "autoReleaseAt", "releasedAt", "createdAt")
SELECT
  'seed-ms-copy-2',
  'seed-contract-copy',
  'Landing page copy',
  600000,
  (CURRENT_TIMESTAMP - INTERVAL '52 days'),
  'PARTIAL_REFUND',
  (CURRENT_TIMESTAMP - INTERVAL '50 days'),
  NULL,
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '45 days'),
  (CURRENT_TIMESTAMP - INTERVAL '63 days')
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "id" = 'seed-ms-copy-2');

-- ----------------------------------------------------------------- payments

INSERT INTO "PaymentTransaction" ("id", "milestoneId", "provider", "providerTransactionId", "amountMinor", "status", "createdAt")
SELECT
  'seed-pay-storefront-1',
  'seed-ms-storefront-1',
  'TELEBIRR',
  'DEMO-PAY-0001',
  4500000,
  'SUCCESS',
  (CURRENT_TIMESTAMP - INTERVAL '41 days')
WHERE NOT EXISTS (SELECT 1 FROM "PaymentTransaction" WHERE "id" = 'seed-pay-storefront-1');

INSERT INTO "PaymentTransaction" ("id", "milestoneId", "provider", "providerTransactionId", "amountMinor", "status", "createdAt")
SELECT
  'seed-pay-storefront-2',
  'seed-ms-storefront-2',
  'CBE_BIRR',
  'DEMO-PAY-0002',
  6000000,
  'SUCCESS',
  (CURRENT_TIMESTAMP - INTERVAL '10 days')
WHERE NOT EXISTS (SELECT 1 FROM "PaymentTransaction" WHERE "id" = 'seed-pay-storefront-2');

INSERT INTO "PaymentTransaction" ("id", "milestoneId", "provider", "providerTransactionId", "amountMinor", "status", "createdAt")
SELECT
  'seed-pay-storefront-3',
  'seed-ms-storefront-3',
  'TELEBIRR',
  'DEMO-PAY-0003',
  2500000,
  'SUCCESS',
  (CURRENT_TIMESTAMP - INTERVAL '7 days')
WHERE NOT EXISTS (SELECT 1 FROM "PaymentTransaction" WHERE "id" = 'seed-pay-storefront-3');

INSERT INTO "PaymentTransaction" ("id", "milestoneId", "provider", "providerTransactionId", "amountMinor", "status", "createdAt")
SELECT
  'seed-pay-brand-1',
  'seed-ms-brand-1',
  'CHAPA',
  'DEMO-PAY-0004',
  1800000,
  'SUCCESS',
  (CURRENT_TIMESTAMP - INTERVAL '48 days')
WHERE NOT EXISTS (SELECT 1 FROM "PaymentTransaction" WHERE "id" = 'seed-pay-brand-1');

INSERT INTO "PaymentTransaction" ("id", "milestoneId", "provider", "providerTransactionId", "amountMinor", "status", "createdAt")
SELECT
  'seed-pay-brand-2',
  'seed-ms-brand-2',
  'TELEBIRR',
  'DEMO-PAY-0005',
  2200000,
  'SUCCESS',
  (CURRENT_TIMESTAMP - INTERVAL '16 days')
WHERE NOT EXISTS (SELECT 1 FROM "PaymentTransaction" WHERE "id" = 'seed-pay-brand-2');

INSERT INTO "PaymentTransaction" ("id", "milestoneId", "provider", "providerTransactionId", "amountMinor", "status", "createdAt")
SELECT
  'seed-pay-brand-3',
  'seed-ms-brand-3',
  'M_PESA',
  'DEMO-PAY-0006',
  1500000,
  'SUCCESS',
  (CURRENT_TIMESTAMP - INTERVAL '5 days')
WHERE NOT EXISTS (SELECT 1 FROM "PaymentTransaction" WHERE "id" = 'seed-pay-brand-3');

INSERT INTO "PaymentTransaction" ("id", "milestoneId", "provider", "providerTransactionId", "amountMinor", "status", "createdAt")
SELECT
  'seed-pay-copy-1',
  'seed-ms-copy-1',
  'TELEBIRR',
  'DEMO-PAY-0007',
  2200000,
  'SUCCESS',
  (CURRENT_TIMESTAMP - INTERVAL '61 days')
WHERE NOT EXISTS (SELECT 1 FROM "PaymentTransaction" WHERE "id" = 'seed-pay-copy-1');

INSERT INTO "PaymentTransaction" ("id", "milestoneId", "provider", "providerTransactionId", "amountMinor", "status", "createdAt")
SELECT
  'seed-pay-copy-2',
  'seed-ms-copy-2',
  'CBE_BIRR',
  'DEMO-PAY-0008',
  600000,
  'SUCCESS',
  (CURRENT_TIMESTAMP - INTERVAL '55 days')
WHERE NOT EXISTS (SELECT 1 FROM "PaymentTransaction" WHERE "id" = 'seed-pay-copy-2');

INSERT INTO "PaymentTransaction" ("id", "milestoneId", "provider", "providerTransactionId", "amountMinor", "status", "createdAt")
SELECT
  'seed-pay-pending',
  'seed-ms-brand-4',
  'CHAPA',
  'DEMO-PAY-0009',
  3500000,
  'PENDING',
  (CURRENT_TIMESTAMP - INTERVAL '1 days')
WHERE NOT EXISTS (SELECT 1 FROM "PaymentTransaction" WHERE "id" = 'seed-pay-pending');

INSERT INTO "PaymentTransaction" ("id", "milestoneId", "provider", "providerTransactionId", "amountMinor", "status", "createdAt")
SELECT
  'seed-pay-failed',
  'seed-ms-brand-4',
  'M_PESA',
  'DEMO-PAY-0010',
  900000,
  'FAILED',
  (CURRENT_TIMESTAMP - INTERVAL '3 days')
WHERE NOT EXISTS (SELECT 1 FROM "PaymentTransaction" WHERE "id" = 'seed-pay-failed');

-- ------------------------------------------------------------------ payouts

INSERT INTO "PayoutTransaction" ("id", "userId", "walletId", "amountMinor", "feeMinor", "netAmountMinor", "provider", "providerPayoutId", "payoutAccountIdentifier", "status", "createdAt", "updatedAt", "settledAt")
SELECT
  'seed-payout-storefront-1',
  (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et'),
  (SELECT "id" FROM "Wallet" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et')),
  2000000,
  10000,
  1990000,
  'TELEBIRR',
  'DEMO-PO-0001',
  '+251910011821',
  'CONFIRMED',
  (CURRENT_TIMESTAMP - INTERVAL '28 days'),
  CURRENT_TIMESTAMP,
  (CURRENT_TIMESTAMP - INTERVAL '27 days')
WHERE NOT EXISTS (SELECT 1 FROM "PayoutTransaction" WHERE "id" = 'seed-payout-storefront-1');

INSERT INTO "PayoutTransaction" ("id", "userId", "walletId", "amountMinor", "feeMinor", "netAmountMinor", "provider", "providerPayoutId", "payoutAccountIdentifier", "status", "createdAt", "updatedAt", "settledAt")
SELECT
  'seed-payout-brand-1',
  (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et'),
  (SELECT "id" FROM "Wallet" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et')),
  1000000,
  5000,
  995000,
  'TELEBIRR',
  'DEMO-PO-0002',
  '+251910011823',
  'CONFIRMED',
  (CURRENT_TIMESTAMP - INTERVAL '9 days'),
  CURRENT_TIMESTAMP,
  (CURRENT_TIMESTAMP - INTERVAL '8 days')
WHERE NOT EXISTS (SELECT 1 FROM "PayoutTransaction" WHERE "id" = 'seed-payout-brand-1');

INSERT INTO "PayoutTransaction" ("id", "userId", "walletId", "amountMinor", "feeMinor", "netAmountMinor", "provider", "providerPayoutId", "payoutAccountIdentifier", "status", "createdAt", "updatedAt", "settledAt")
SELECT
  'seed-payout-storefront-2',
  (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et'),
  (SELECT "id" FROM "Wallet" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et')),
  1500000,
  7500,
  1492500,
  'CBE_BIRR',
  'DEMO-PO-0003',
  '1000234567890',
  'CONFIRMED',
  (CURRENT_TIMESTAMP - INTERVAL '15 days'),
  CURRENT_TIMESTAMP,
  (CURRENT_TIMESTAMP - INTERVAL '14 days')
WHERE NOT EXISTS (SELECT 1 FROM "PayoutTransaction" WHERE "id" = 'seed-payout-storefront-2');

INSERT INTO "PayoutTransaction" ("id", "userId", "walletId", "amountMinor", "feeMinor", "netAmountMinor", "provider", "providerPayoutId", "payoutAccountIdentifier", "status", "createdAt", "updatedAt", "settledAt")
SELECT
  'seed-payout-copy-1',
  (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et'),
  (SELECT "id" FROM "Wallet" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et')),
  1200000,
  6000,
  1194000,
  'TELEBIRR',
  'DEMO-PO-0004',
  '+251910011821',
  'CONFIRMED',
  (CURRENT_TIMESTAMP - INTERVAL '47 days'),
  CURRENT_TIMESTAMP,
  (CURRENT_TIMESTAMP - INTERVAL '46 days')
WHERE NOT EXISTS (SELECT 1 FROM "PayoutTransaction" WHERE "id" = 'seed-payout-copy-1');

INSERT INTO "PayoutTransaction" ("id", "userId", "walletId", "amountMinor", "feeMinor", "netAmountMinor", "provider", "providerPayoutId", "payoutAccountIdentifier", "status", "createdAt", "updatedAt", "settledAt")
SELECT
  'seed-payout-pending',
  (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et'),
  (SELECT "id" FROM "Wallet" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et')),
  800000,
  4000,
  796000,
  'TELEBIRR',
  NULL,
  '+251910011823',
  'PENDING',
  (CURRENT_TIMESTAMP - INTERVAL '1 days'),
  CURRENT_TIMESTAMP,
  NULL
WHERE NOT EXISTS (SELECT 1 FROM "PayoutTransaction" WHERE "id" = 'seed-payout-pending');

INSERT INTO "PayoutTransaction" ("id", "userId", "walletId", "amountMinor", "feeMinor", "netAmountMinor", "provider", "providerPayoutId", "payoutAccountIdentifier", "status", "createdAt", "updatedAt", "settledAt")
SELECT
  'seed-payout-processing',
  (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et'),
  (SELECT "id" FROM "Wallet" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et')),
  500000,
  2500,
  497500,
  'CBE_BIRR',
  NULL,
  '1000234567890',
  'PROCESSING',
  (CURRENT_TIMESTAMP - INTERVAL '2 days'),
  CURRENT_TIMESTAMP,
  NULL
WHERE NOT EXISTS (SELECT 1 FROM "PayoutTransaction" WHERE "id" = 'seed-payout-processing');

-- ----------------------------------------------------------------- top-ups

INSERT INTO "WalletTopUp" ("id", "userId", "walletId", "provider", "amountMinor", "referenceNumber", "receiptImagePath", "status", "reviewedByStaffId", "rejectionReason", "reviewedAt", "createdAt")
SELECT
  'seed-topup-1',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  (SELECT "id" FROM "Wallet" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et')),
  'TELEBIRR',
  5000000,
  'FT260918A1B2',
  NULL,
  'APPROVED',
  (SELECT "id" FROM "User" WHERE "email" = 'admin@yekis.et'),
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '33 days'),
  (CURRENT_TIMESTAMP - INTERVAL '34 days')
WHERE NOT EXISTS (SELECT 1 FROM "WalletTopUp" WHERE "id" = 'seed-topup-1');

INSERT INTO "WalletTopUp" ("id", "userId", "walletId", "provider", "amountMinor", "referenceNumber", "receiptImagePath", "status", "reviewedByStaffId", "rejectionReason", "reviewedAt", "createdAt")
SELECT
  'seed-topup-2',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  (SELECT "id" FROM "Wallet" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et')),
  'CBE_BIRR',
  3000000,
  'FT261009C3D4',
  NULL,
  'APPROVED',
  (SELECT "id" FROM "User" WHERE "email" = 'admin@yekis.et'),
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '12 days'),
  (CURRENT_TIMESTAMP - INTERVAL '13 days')
WHERE NOT EXISTS (SELECT 1 FROM "WalletTopUp" WHERE "id" = 'seed-topup-2');

INSERT INTO "WalletTopUp" ("id", "userId", "walletId", "provider", "amountMinor", "referenceNumber", "receiptImagePath", "status", "reviewedByStaffId", "rejectionReason", "reviewedAt", "createdAt")
SELECT
  'seed-topup-3',
  (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et'),
  (SELECT "id" FROM "Wallet" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et')),
  'TELEBIRR',
  2000000,
  'FT260901E5F6',
  NULL,
  'APPROVED',
  (SELECT "id" FROM "User" WHERE "email" = 'admin@yekis.et'),
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '20 days'),
  (CURRENT_TIMESTAMP - INTERVAL '21 days')
WHERE NOT EXISTS (SELECT 1 FROM "WalletTopUp" WHERE "id" = 'seed-topup-3');

INSERT INTO "WalletTopUp" ("id", "userId", "walletId", "provider", "amountMinor", "referenceNumber", "receiptImagePath", "status", "reviewedByStaffId", "rejectionReason", "reviewedAt", "createdAt")
SELECT
  'seed-topup-4',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  (SELECT "id" FROM "Wallet" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et')),
  'TELEBIRR',
  1500000,
  'FT261022A1B2',
  'demo/receipts/ft261022a1b2.jpg',
  'PENDING',
  NULL,
  NULL,
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '1 days')
WHERE NOT EXISTS (SELECT 1 FROM "WalletTopUp" WHERE "id" = 'seed-topup-4');

INSERT INTO "WalletTopUp" ("id", "userId", "walletId", "provider", "amountMinor", "referenceNumber", "receiptImagePath", "status", "reviewedByStaffId", "rejectionReason", "reviewedAt", "createdAt")
SELECT
  'seed-topup-5',
  (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et'),
  (SELECT "id" FROM "Wallet" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et')),
  'CBE_BIRR',
  800000,
  'FT261021C3D4',
  'demo/receipts/ft261021c3d4.jpg',
  'PENDING',
  NULL,
  NULL,
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '2 days')
WHERE NOT EXISTS (SELECT 1 FROM "WalletTopUp" WHERE "id" = 'seed-topup-5');

INSERT INTO "WalletTopUp" ("id", "userId", "walletId", "provider", "amountMinor", "referenceNumber", "receiptImagePath", "status", "reviewedByStaffId", "rejectionReason", "reviewedAt", "createdAt")
SELECT
  'seed-topup-6',
  (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et'),
  (SELECT "id" FROM "Wallet" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et')),
  'M_PESA',
  400000,
  'FT261012G7H8',
  NULL,
  'REJECTED',
  (SELECT "id" FROM "User" WHERE "email" = 'admin@yekis.et'),
  'Receipt amount does not match the reference number.',
  (CURRENT_TIMESTAMP - INTERVAL '9 days'),
  (CURRENT_TIMESTAMP - INTERVAL '10 days')
WHERE NOT EXISTS (SELECT 1 FROM "WalletTopUp" WHERE "id" = 'seed-topup-6');

-- ----------------------------------------------------------------- disputes

INSERT INTO "Dispute" ("id", "contractId", "milestoneId", "category", "stage", "raisedByUserId", "description", "negotiationDeadlineAt", "mediationDeadlineAt", "assignedMediatorStaffId", "assignedAt", "resolvedByStaffId", "resolutionOutcome", "freelancerShareMinor", "resolvedAt", "createdAt", "updatedAt")
SELECT
  'seed-dispute-brand-quality',
  'seed-contract-brand',
  'seed-ms-brand-2',
  'QUALITY_ISSUE',
  'STAGE_3_MEDIATION',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  'The brand guide repeats the logo concepts but omits the typography scale and packaging rules we agreed in the brief. I asked for a revision twice and received the same file back.',
  (CURRENT_TIMESTAMP - INTERVAL '7 days'),
  (CURRENT_TIMESTAMP + INTERVAL '2 days'),
  (SELECT "id" FROM "User" WHERE "email" = 'compliance@yekis.et'),
  (CURRENT_TIMESTAMP - INTERVAL '8 days'),
  NULL,
  NULL,
  NULL,
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '12 days'),
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Dispute" WHERE "id" = 'seed-dispute-brand-quality');

INSERT INTO "Dispute" ("id", "contractId", "milestoneId", "category", "stage", "raisedByUserId", "description", "negotiationDeadlineAt", "mediationDeadlineAt", "assignedMediatorStaffId", "assignedAt", "resolvedByStaffId", "resolutionOutcome", "freelancerShareMinor", "resolvedAt", "createdAt", "updatedAt")
SELECT
  'seed-dispute-brand-scope',
  'seed-contract-brand',
  'seed-ms-brand-4',
  'SCOPE_CREEP',
  'STAGE_1_NEGOTIATION',
  (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et'),
  'Packaging templates were quoted for four SKUs. The client has now sent artwork for nine products and expects them all inside this milestone.',
  (CURRENT_TIMESTAMP + INTERVAL '1 days'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '6 days'),
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Dispute" WHERE "id" = 'seed-dispute-brand-scope');

INSERT INTO "Dispute" ("id", "contractId", "milestoneId", "category", "stage", "raisedByUserId", "description", "negotiationDeadlineAt", "mediationDeadlineAt", "assignedMediatorStaffId", "assignedAt", "resolvedByStaffId", "resolutionOutcome", "freelancerShareMinor", "resolvedAt", "createdAt", "updatedAt")
SELECT
  'seed-dispute-copy-resolved',
  'seed-contract-copy',
  'seed-ms-copy-2',
  'QUALITY_ISSUE',
  'RESOLVED',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  'The landing page copy arrived a day late and the headline section had to be rewritten. We agreed on a partial refund instead of a full redelivery.',
  (CURRENT_TIMESTAMP - INTERVAL '45 days'),
  NULL,
  NULL,
  NULL,
  (SELECT "id" FROM "User" WHERE "email" = 'admin@yekis.et'),
  'PARTIAL_SPLIT',
  500000,
  (CURRENT_TIMESTAMP - INTERVAL '45 days'),
  (CURRENT_TIMESTAMP - INTERVAL '50 days'),
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Dispute" WHERE "id" = 'seed-dispute-copy-resolved');

-- -------------------------------------------------------- compliance flags

INSERT INTO "TransactionFlag" ("id", "userId", "type", "status", "details", "relatedEntityId", "reviewedByStaffId", "reviewNotes", "createdAt", "updatedAt")
SELECT
  'seed-flag-structuring',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  'STRUCTURING',
  'PENDING_REVIEW',
  '{"windowDays":7,"thresholdMinor":1000000,"matchedReferences":["FT261022A1B2"],"note":"Three top-ups just under the review threshold inside seven days."}'::jsonb,
  'seed-topup-4',
  NULL,
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '1 days'),
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "TransactionFlag" WHERE "id" = 'seed-flag-structuring');

INSERT INTO "TransactionFlag" ("id", "userId", "type", "status", "details", "relatedEntityId", "reviewedByStaffId", "reviewNotes", "createdAt", "updatedAt")
SELECT
  'seed-flag-velocity',
  (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et'),
  'VELOCITY',
  'PENDING_REVIEW',
  '{"windowHours":24,"payoutsRequested":4,"totalMinor":3200000,"note":"Withdrawal requests accelerated after a milestone release."}'::jsonb,
  'seed-payout-pending',
  NULL,
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '2 days'),
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "TransactionFlag" WHERE "id" = 'seed-flag-velocity');

INSERT INTO "TransactionFlag" ("id", "userId", "type", "status", "details", "relatedEntityId", "reviewedByStaffId", "reviewNotes", "createdAt", "updatedAt")
SELECT
  'seed-flag-round-amounts',
  (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et'),
  'ROUND_AMOUNTS',
  'DISMISSED',
  '{"matchedAmountsMinor":[2000000,1500000,1200000],"note":"Amounts match milestone settlements, not external deposits."}'::jsonb,
  NULL,
  (SELECT "id" FROM "User" WHERE "email" = 'admin@yekis.et'),
  'Verified against paid milestones; no action required.',
  (CURRENT_TIMESTAMP - INTERVAL '18 days'),
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "TransactionFlag" WHERE "id" = 'seed-flag-round-amounts');

-- ---------------------------------------------------------- profile reports

INSERT INTO "ProfileReport" ("id", "reporterId", "reportedUserId", "reason", "details", "status", "createdAt", "updatedAt")
SELECT
  'seed-report-offplatform',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et'),
  'OFF_PLATFORM_CONTACT',
  'Asked me to move the whole contract to a personal Telegram chat and pay 50% upfront outside escrow.',
  'PENDING',
  (CURRENT_TIMESTAMP - INTERVAL '2 days'),
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ProfileReport" WHERE "id" = 'seed-report-offplatform');

INSERT INTO "ProfileReport" ("id", "reporterId", "reportedUserId", "reason", "details", "status", "createdAt", "updatedAt")
SELECT
  'seed-report-skills',
  (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et'),
  (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et'),
  'MISLEADING_SKILLS',
  'The profile lists civil engineering and accounting experience, but the portfolio only shows logo work.',
  'UNDER_REVIEW',
  (CURRENT_TIMESTAMP - INTERVAL '6 days'),
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ProfileReport" WHERE "id" = 'seed-report-skills');

-- ------------------------------------------------------- support threads

INSERT INTO "Conversation" ("id", "creatorId", "assignedStaffId", "contactEmail", "subject", "status", "createdAt", "updatedAt")
SELECT
  'seed-conv-payout',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  (SELECT "id" FROM "User" WHERE "email" = 'support@yekis.et'),
  'client@yekis.et',
  'Payout not received after approval',
  'OPEN',
  (CURRENT_TIMESTAMP - INTERVAL '2 days'),
  (CURRENT_TIMESTAMP - INTERVAL '2 days')
WHERE NOT EXISTS (SELECT 1 FROM "Conversation" WHERE "id" = 'seed-conv-payout');

INSERT INTO "ConversationParticipant" ("id", "conversationId", "userId")
SELECT 'seed-participant-seed-conv-payout-client', 'seed-conv-payout', (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et')
WHERE NOT EXISTS (SELECT 1 FROM "ConversationParticipant" WHERE "conversationId" = 'seed-conv-payout' AND "userId" = (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'));

INSERT INTO "ConversationParticipant" ("id", "conversationId", "userId")
SELECT 'seed-participant-seed-conv-payout-support', 'seed-conv-payout', (SELECT "id" FROM "User" WHERE "email" = 'support@yekis.et')
WHERE NOT EXISTS (SELECT 1 FROM "ConversationParticipant" WHERE "conversationId" = 'seed-conv-payout' AND "userId" = (SELECT "id" FROM "User" WHERE "email" = 'support@yekis.et'));

INSERT INTO "ChatMessage" ("id", "conversationId", "senderId", "body", "createdAt")
SELECT
  'seed-msg-payout-1',
  'seed-conv-payout',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  'I approved the last milestone two days ago but the funds are still not in my Telebirr account. Can you check the payout reference?',
  (CURRENT_TIMESTAMP - INTERVAL '2 days')
WHERE NOT EXISTS (SELECT 1 FROM "ChatMessage" WHERE "id" = 'seed-msg-payout-1');

INSERT INTO "ChatMessage" ("id", "conversationId", "senderId", "body", "createdAt")
SELECT
  'seed-msg-payout-2',
  'seed-conv-payout',
  (SELECT "id" FROM "User" WHERE "email" = 'support@yekis.et'),
  'Thanks for flagging this. The payout is queued as PENDING and has not been sent to the provider yet. I have escalated it to finance for the next settlement batch.',
  (CURRENT_TIMESTAMP - INTERVAL '1 days')
WHERE NOT EXISTS (SELECT 1 FROM "ChatMessage" WHERE "id" = 'seed-msg-payout-2');

INSERT INTO "ChatMessage" ("id", "conversationId", "senderId", "body", "createdAt")
SELECT
  'seed-msg-payout-3',
  'seed-conv-payout',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  'Understood, thank you. Please confirm once the settlement reference is available.',
  (CURRENT_TIMESTAMP - INTERVAL '0.4 days')
WHERE NOT EXISTS (SELECT 1 FROM "ChatMessage" WHERE "id" = 'seed-msg-payout-3');

INSERT INTO "Conversation" ("id", "creatorId", "assignedStaffId", "contactEmail", "subject", "status", "createdAt", "updatedAt")
SELECT
  'seed-conv-kyc',
  (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et'),
  NULL,
  'freelancer@yekis.et',
  'KYC document upload keeps failing',
  'OPEN',
  (CURRENT_TIMESTAMP - INTERVAL '1 days'),
  (CURRENT_TIMESTAMP - INTERVAL '1 days')
WHERE NOT EXISTS (SELECT 1 FROM "Conversation" WHERE "id" = 'seed-conv-kyc');

INSERT INTO "ConversationParticipant" ("id", "conversationId", "userId")
SELECT 'seed-participant-seed-conv-kyc-freelancer', 'seed-conv-kyc', (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et')
WHERE NOT EXISTS (SELECT 1 FROM "ConversationParticipant" WHERE "conversationId" = 'seed-conv-kyc' AND "userId" = (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et'));

INSERT INTO "ChatMessage" ("id", "conversationId", "senderId", "body", "createdAt")
SELECT
  'seed-msg-kyc-1',
  'seed-conv-kyc',
  (SELECT "id" FROM "User" WHERE "email" = 'freelancer@yekis.et'),
  'The upload spinner stops at 90% for my selfie and then the page resets. I have tried twice on mobile data.',
  (CURRENT_TIMESTAMP - INTERVAL '1 days')
WHERE NOT EXISTS (SELECT 1 FROM "ChatMessage" WHERE "id" = 'seed-msg-kyc-1');

INSERT INTO "Conversation" ("id", "creatorId", "assignedStaffId", "contactEmail", "subject", "status", "createdAt", "updatedAt")
SELECT
  'seed-conv-invoice',
  (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et'),
  (SELECT "id" FROM "User" WHERE "email" = 'support@yekis.et'),
  'seller@yekis.et',
  'Invoice for completed contract',
  'CLOSED',
  (CURRENT_TIMESTAMP - INTERVAL '12 days'),
  (CURRENT_TIMESTAMP - INTERVAL '12 days')
WHERE NOT EXISTS (SELECT 1 FROM "Conversation" WHERE "id" = 'seed-conv-invoice');

INSERT INTO "ConversationParticipant" ("id", "conversationId", "userId")
SELECT 'seed-participant-seed-conv-invoice-seller', 'seed-conv-invoice', (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et')
WHERE NOT EXISTS (SELECT 1 FROM "ConversationParticipant" WHERE "conversationId" = 'seed-conv-invoice' AND "userId" = (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et'));

INSERT INTO "ConversationParticipant" ("id", "conversationId", "userId")
SELECT 'seed-participant-seed-conv-invoice-support', 'seed-conv-invoice', (SELECT "id" FROM "User" WHERE "email" = 'support@yekis.et')
WHERE NOT EXISTS (SELECT 1 FROM "ConversationParticipant" WHERE "conversationId" = 'seed-conv-invoice' AND "userId" = (SELECT "id" FROM "User" WHERE "email" = 'support@yekis.et'));

INSERT INTO "ChatMessage" ("id", "conversationId", "senderId", "body", "createdAt")
SELECT
  'seed-msg-invoice-1',
  'seed-conv-invoice',
  (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et'),
  'Could you send me an invoice for the completed copywriting contract? Our accountant needs it for the quarter.',
  (CURRENT_TIMESTAMP - INTERVAL '12 days')
WHERE NOT EXISTS (SELECT 1 FROM "ChatMessage" WHERE "id" = 'seed-msg-invoice-1');

INSERT INTO "ChatMessage" ("id", "conversationId", "senderId", "body", "createdAt")
SELECT
  'seed-msg-invoice-2',
  'seed-conv-invoice',
  (SELECT "id" FROM "User" WHERE "email" = 'support@yekis.et'),
  'Sent to your registered email this morning. The PDF includes the platform fee and withholding tax lines.',
  (CURRENT_TIMESTAMP - INTERVAL '11 days')
WHERE NOT EXISTS (SELECT 1 FROM "ChatMessage" WHERE "id" = 'seed-msg-invoice-2');

-- ------------------------------------------------------------- audit trail

INSERT INTO "AuditLog" ("id", "userId", "eventType", "action", "entityType", "entityId", "actorRole", "amountMinor", "createdAt")
SELECT
  'seed-audit-user-registered',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  'USER_REGISTERED',
  'auth.register',
  'User',
  'seed-user-client',
  'CLIENT',
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '72 days')
WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE "id" = 'seed-audit-user-registered');

INSERT INTO "AuditLog" ("id", "userId", "eventType", "action", "entityType", "entityId", "actorRole", "amountMinor", "createdAt")
SELECT
  'seed-audit-contract-created',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  'CONTRACT_CREATED',
  'contracts.create',
  'Contract',
  'seed-contract-brand',
  'CLIENT',
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '39 days')
WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE "id" = 'seed-audit-contract-created');

INSERT INTO "AuditLog" ("id", "userId", "eventType", "action", "entityType", "entityId", "actorRole", "amountMinor", "createdAt")
SELECT
  'seed-audit-escrow-funded-1',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  'ESCROW_FUNDED',
  'escrow.fund',
  'Milestone',
  'seed-ms-storefront-1',
  'CLIENT',
  4500000,
  (CURRENT_TIMESTAMP - INTERVAL '41 days')
WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE "id" = 'seed-audit-escrow-funded-1');

INSERT INTO "AuditLog" ("id", "userId", "eventType", "action", "entityType", "entityId", "actorRole", "amountMinor", "createdAt")
SELECT
  'seed-audit-topup-approved',
  (SELECT "id" FROM "User" WHERE "email" = 'admin@yekis.et'),
  'WALLET_TOPUP_APPROVED',
  'wallet.topup.approve',
  'WalletTopUp',
  'seed-topup-1',
  'ADMIN',
  5000000,
  (CURRENT_TIMESTAMP - INTERVAL '33 days')
WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE "id" = 'seed-audit-topup-approved');

INSERT INTO "AuditLog" ("id", "userId", "eventType", "action", "entityType", "entityId", "actorRole", "amountMinor", "createdAt")
SELECT
  'seed-audit-escrow-released',
  (SELECT "id" FROM "User" WHERE "email" = 'admin@yekis.et'),
  'ESCROW_RELEASED',
  'escrow.release',
  'Milestone',
  'seed-ms-storefront-1',
  'ADMIN',
  4500000,
  (CURRENT_TIMESTAMP - INTERVAL '30 days')
WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE "id" = 'seed-audit-escrow-released');

INSERT INTO "AuditLog" ("id", "userId", "eventType", "action", "entityType", "entityId", "actorRole", "amountMinor", "createdAt")
SELECT
  'seed-audit-payout-confirmed',
  (SELECT "id" FROM "User" WHERE "email" = 'admin@yekis.et'),
  'PAYOUT_CONFIRMED',
  'payouts.settle',
  'PayoutTransaction',
  'seed-payout-storefront-1',
  'ADMIN',
  2000000,
  (CURRENT_TIMESTAMP - INTERVAL '27 days')
WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE "id" = 'seed-audit-payout-confirmed');

INSERT INTO "AuditLog" ("id", "userId", "eventType", "action", "entityType", "entityId", "actorRole", "amountMinor", "createdAt")
SELECT
  'seed-audit-payout-confirmed-2',
  (SELECT "id" FROM "User" WHERE "email" = 'admin@yekis.et'),
  'PAYOUT_CONFIRMED',
  'payouts.settle',
  'PayoutTransaction',
  'seed-payout-storefront-2',
  'ADMIN',
  1500000,
  (CURRENT_TIMESTAMP - INTERVAL '14 days')
WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE "id" = 'seed-audit-payout-confirmed-2');

INSERT INTO "AuditLog" ("id", "userId", "eventType", "action", "entityType", "entityId", "actorRole", "amountMinor", "createdAt")
SELECT
  'seed-audit-dispute-raised',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  'DISPUTE_RAISED',
  'disputes.create',
  'Dispute',
  'seed-dispute-brand-quality',
  'CLIENT',
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '12 days')
WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE "id" = 'seed-audit-dispute-raised');

INSERT INTO "AuditLog" ("id", "userId", "eventType", "action", "entityType", "entityId", "actorRole", "amountMinor", "createdAt")
SELECT
  'seed-audit-dispute-escalated',
  (SELECT "id" FROM "User" WHERE "email" = 'client@yekis.et'),
  'DISPUTE_ESCALATED',
  'disputes.escalate',
  'Dispute',
  'seed-dispute-brand-quality',
  'CLIENT',
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '9 days')
WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE "id" = 'seed-audit-dispute-escalated');

INSERT INTO "AuditLog" ("id", "userId", "eventType", "action", "entityType", "entityId", "actorRole", "amountMinor", "createdAt")
SELECT
  'seed-audit-milestone-submitted',
  (SELECT "id" FROM "User" WHERE "email" = 'seller@yekis.et'),
  'MILESTONE_SUBMITTED',
  'milestones.submit',
  'Milestone',
  'seed-ms-storefront-2',
  'FREELANCER',
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '2 days')
WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE "id" = 'seed-audit-milestone-submitted');

INSERT INTO "AuditLog" ("id", "userId", "eventType", "action", "entityType", "entityId", "actorRole", "amountMinor", "createdAt")
SELECT
  'seed-audit-topup-flagged',
  NULL,
  'TRANSACTION_FLAGGED',
  'compliance.flag',
  'TransactionFlag',
  'seed-flag-structuring',
  NULL,
  1500000,
  (CURRENT_TIMESTAMP - INTERVAL '1 days')
WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE "id" = 'seed-audit-topup-flagged');

INSERT INTO "AuditLog" ("id", "userId", "eventType", "action", "entityType", "entityId", "actorRole", "amountMinor", "createdAt")
SELECT
  'seed-audit-kyc-submitted',
  (SELECT "id" FROM "User" WHERE "email" = 'newbie@yekis.et'),
  'KYC_SUBMITTED',
  'kyc.submit',
  'KycRecord',
  'seed-kyc-newbie',
  'CLIENT',
  NULL,
  (CURRENT_TIMESTAMP - INTERVAL '3 days')
WHERE NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE "id" = 'seed-audit-kyc-submitted');
