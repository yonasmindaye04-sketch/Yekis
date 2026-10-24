// Generates prisma/migrations/<timestamp>_seed_demo_activity/migration.sql from
// the single dataset in prisma/demoActivity.ts, so the seed script and the data
// migration cannot drift apart.
//
//   npx tsx scripts/generate-demo-activity-migration.ts
//
// The output is idempotent: every row is inserted only when it does not exist
// (by id, or by natural key for users), which makes `migrate deploy` safe on a
// database that already ran `prisma/seed.ts`.
import fs from "node:fs";
import path from "node:path";
import {
  DEMO_AUDIT_LOGS,
  DEMO_CONTRACTS,
  DEMO_CONVERSATIONS,
  DEMO_DISPUTES,
  DEMO_FLAGS,
  DEMO_JOBS,
  DEMO_PAYMENTS,
  DEMO_PAYOUTS,
  DEMO_REPORTS,
  DEMO_TOP_UPS,
  DEMO_USERS,
  DEMO_WALLET_BALANCES,
  DEMO_ACTIVITY_PASSWORD_HASH,
} from "../prisma/demoActivity.js";

const stamp = process.argv[2] ?? "20261022150000";
const OUT_DIR = path.resolve(
  process.cwd(),
  "prisma",
  "migrations",
  `${stamp}_seed_demo_activity`,
);

const q = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/** Timestamp relative to migration time, so demo charts stay inside their windows. */
const t = (daysAgo: number | undefined): string => {
  if (daysAgo === undefined) return "NULL";
  if (daysAgo >= 0) return `(CURRENT_TIMESTAMP - INTERVAL '${daysAgo} days')`;
  return `(CURRENT_TIMESTAMP + INTERVAL '${-daysAgo} days')`;
};

const userRef = (email: string): string =>
  `(SELECT "id" FROM "User" WHERE "email" = ${q(email)})`;
const walletRef = (email: string): string =>
  `(SELECT "id" FROM "Wallet" WHERE "userId" = ${userRef(email)})`;
const json = (value: unknown): string => `${q(JSON.stringify(value))}::jsonb`;

/** A signed day offset (positive = future) as a SQL timestamp. */
const deadline = (inDays: number | undefined): string =>
  inDays === undefined ? "NULL" : t(-inDays);

const insert = (table: string, columns: string[], values: string[], guard: string): string =>
  `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")})\n` +
  `SELECT\n  ${values.join(",\n  ")}\n` +
  `WHERE NOT EXISTS (SELECT 1 FROM "${table}" WHERE ${guard});\n`;

const parts: string[] = [];

parts.push(`-- ============================================================================
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
-- email for users) so running on a database that already ran \`prisma/seed.ts\`
-- is a no-op. Dates are relative to migration time to keep charts populated.
--
-- GENERATED FILE — edit prisma/demoActivity.ts and re-run
--   npx tsx scripts/generate-demo-activity-migration.ts
-- ============================================================================

`);

parts.push("-- ------------------------------------------------------------------ users\n");
for (const u of DEMO_USERS) {
  parts.push(
    insert(
      "User",
      [
        "id",
        "ucid",
        "email",
        "phone",
        "passwordHash",
        "role",
        "dateOfBirth",
        "phoneVerifiedAt",
        "firstName",
        "lastName",
        "bio",
        "isAvailableForWork",
        "cachedKycTier",
        "cachedKycStatus",
        "totalEarnedNetMinor",
        "totalSpentGrossMinor",
        "createdAt",
        "updatedAt",
      ],
      [
        q(u.id),
        q(u.ucid),
        q(u.email),
        q(u.phone),
        q(DEMO_ACTIVITY_PASSWORD_HASH),
        q(u.role),
        "'1994-06-15'::timestamp",
        t(u.registeredDaysAgo),
        q(u.firstName),
        q(u.lastName),
        q(u.bio ?? ""),
        String(u.isAvailableForWork ?? false),
        q(u.kycTier),
        q(u.kycStatus),
        String(u.totalEarnedNetMinor ?? 0),
        String(u.totalSpentGrossMinor ?? 0),
        t(u.registeredDaysAgo),
        t(u.registeredDaysAgo),
      ],
      `"email" = ${q(u.email)}`,
    ),
  );
}

parts.push("-- ------------------------------------------------------- kyc + wallet rows\n");
for (const u of DEMO_USERS) {
  parts.push(
    insert(
      "KycRecord",
      [
        "id",
        "userId",
        "tier",
        "status",
        "fullName",
        "documentNumber",
        "createdAt",
        "updatedAt",
      ],
      [
        q(u.kycId),
        userRef(u.email),
        q(u.kycTier),
        q(u.kycStatus),
        u.fullName ? q(u.fullName) : "NULL",
        u.documentNumber ? q(u.documentNumber) : "NULL",
        t(u.registeredDaysAgo),
        t(u.registeredDaysAgo),
      ],
      `"userId" = ${userRef(u.email)}`,
    ),
  );
  parts.push(
    insert(
      "Wallet",
      ["id", "userId", "balanceMinor", "updatedAt"],
      [
        q(u.walletId),
        userRef(u.email),
        String(u.walletBalanceMinor),
        "CURRENT_TIMESTAMP",
      ],
      `"userId" = ${userRef(u.email)}`,
    ),
  );
  for (const doc of u.documents ?? []) {
    parts.push(
      insert(
        "KycDocument",
        ["id", "kycRecordId", "documentType", "storagePath", "uploadedAt"],
        [
          q(doc.id),
          `(SELECT "id" FROM "KycRecord" WHERE "userId" = ${userRef(u.email)})`,
          q(doc.documentType),
          q(doc.storagePath),
          t(u.registeredDaysAgo),
        ],
        `"id" = ${q(doc.id)}`,
      ),
    );
  }
}

parts.push("-- -------------------------------------------- balances for existing users\n");
for (const balance of DEMO_WALLET_BALANCES) {
  parts.push(
    `UPDATE "Wallet" SET "balanceMinor" = ${balance.balanceMinor}, "updatedAt" = CURRENT_TIMESTAMP\n` +
      `WHERE "userId" = ${userRef(balance.email)};\n`,
  );
}

parts.push("-- ------------------------------------------------------------ jobs/contracts\n");
for (const job of DEMO_JOBS) {
  parts.push(
    insert(
      "Job",
      [
        "id",
        "clientId",
        "title",
        "category",
        "description",
        "budgetMinMinor",
        "budgetMaxMinor",
        "deadline",
        "status",
        "proposedMilestones",
        "createdAt",
      ],
      [
        q(job.id),
        userRef(job.clientEmail),
        q(job.title),
        q(job.category),
        q(job.description),
        String(job.budgetMinMinor),
        String(job.budgetMaxMinor),
        t(-job.deadlineInDays),
        q(job.status),
        json(job.proposedMilestones),
        t(job.createdDaysAgo),
      ],
      `"id" = ${q(job.id)}`,
    ),
  );
}

for (const c of DEMO_CONTRACTS) {
  parts.push(
    insert(
      "Contract",
      [
        "id",
        "jobId",
        "clientId",
        "freelancerId",
        "templateVersion",
        "documentStoragePath",
        "status",
        "clientAcceptedAt",
        "freelancerAcceptedAt",
        "cancellableUntil",
        "createdAt",
      ],
      [
        q(c.id),
        q(c.jobId),
        userRef(c.clientEmail),
        userRef(c.freelancerEmail),
        "'2026-01'",
        q(`demo/contracts/${c.id}.pdf`),
        q(c.status),
        t(c.acceptedDaysAgo),
        t(c.acceptedDaysAgo),
        t(c.createdDaysAgo - 7),
        t(c.createdDaysAgo),
      ],
      `"id" = ${q(c.id)}`,
    ),
  );
}

parts.push("-- --------------------------------------------------------------- milestones\n");
for (const c of DEMO_CONTRACTS) {
  for (const ms of c.milestones) {
    parts.push(
      insert(
        "Milestone",
        [
          "id",
          "contractId",
          "title",
          "amountMinor",
          "dueDate",
          "escrowState",
          "submittedAt",
          "deliverableUrl",
          "autoReleaseAt",
          "releasedAt",
          "createdAt",
        ],
        [
          q(ms.id),
          q(c.id),
          q(ms.title),
          String(ms.amountMinor),
          t(-ms.dueInDays),
          q(ms.escrowState),
          t(ms.submittedDaysAgo),
          ms.deliverableUrl ? q(ms.deliverableUrl) : "NULL",
          ms.autoReleaseInDays === undefined ? "NULL" : t(-ms.autoReleaseInDays),
          t(ms.releasedDaysAgo),
          t(ms.createdDaysAgo),
        ],
        `"id" = ${q(ms.id)}`,
      ),
    );
  }
}

parts.push("-- ----------------------------------------------------------------- payments\n");
for (const p of DEMO_PAYMENTS) {
  parts.push(
    insert(
      "PaymentTransaction",
      [
        "id",
        "milestoneId",
        "provider",
        "providerTransactionId",
        "amountMinor",
        "status",
        "createdAt",
      ],
      [
        q(p.id),
        q(p.milestoneId),
        q(p.provider),
        q(p.providerTransactionId),
        String(p.amountMinor),
        q(p.status),
        t(p.createdDaysAgo),
      ],
      `"id" = ${q(p.id)}`,
    ),
  );
}

parts.push("-- ------------------------------------------------------------------ payouts\n");
for (const p of DEMO_PAYOUTS) {
  parts.push(
    insert(
      "PayoutTransaction",
      [
        "id",
        "userId",
        "walletId",
        "amountMinor",
        "feeMinor",
        "netAmountMinor",
        "provider",
        "providerPayoutId",
        "payoutAccountIdentifier",
        "status",
        "createdAt",
        "updatedAt",
        "settledAt",
      ],
      [
        q(p.id),
        userRef(p.userEmail),
        walletRef(p.userEmail),
        String(p.amountMinor),
        String(p.feeMinor),
        String(p.amountMinor - p.feeMinor),
        q(p.provider),
        p.providerPayoutId ? q(p.providerPayoutId) : "NULL",
        q(p.payoutAccountIdentifier),
        q(p.status),
        t(p.createdDaysAgo),
        "CURRENT_TIMESTAMP",
        t(p.settledDaysAgo),
      ],
      `"id" = ${q(p.id)}`,
    ),
  );
}

parts.push("-- ----------------------------------------------------------------- top-ups\n");
for (const topUp of DEMO_TOP_UPS) {
  parts.push(
    insert(
      "WalletTopUp",
      [
        "id",
        "userId",
        "walletId",
        "provider",
        "amountMinor",
        "referenceNumber",
        "receiptImagePath",
        "status",
        "reviewedByStaffId",
        "rejectionReason",
        "reviewedAt",
        "createdAt",
      ],
      [
        q(topUp.id),
        userRef(topUp.userEmail),
        walletRef(topUp.userEmail),
        q(topUp.provider),
        String(topUp.amountMinor),
        q(topUp.referenceNumber),
        topUp.receiptImagePath ? q(topUp.receiptImagePath) : "NULL",
        q(topUp.status),
        topUp.reviewedByEmail ? userRef(topUp.reviewedByEmail) : "NULL",
        topUp.rejectionReason ? q(topUp.rejectionReason) : "NULL",
        t(topUp.reviewedDaysAgo),
        t(topUp.createdDaysAgo),
      ],
      `"id" = ${q(topUp.id)}`,
    ),
  );
}

parts.push("-- ----------------------------------------------------------------- disputes\n");
for (const d of DEMO_DISPUTES) {
  parts.push(
    insert(
      "Dispute",
      [
        "id",
        "contractId",
        "milestoneId",
        "category",
        "stage",
        "raisedByUserId",
        "description",
        "negotiationDeadlineAt",
        "mediationDeadlineAt",
        "assignedMediatorStaffId",
        "assignedAt",
        "resolvedByStaffId",
        "resolutionOutcome",
        "freelancerShareMinor",
        "resolvedAt",
        "createdAt",
        "updatedAt",
      ],
      [
        q(d.id),
        q(d.contractId),
        q(d.milestoneId),
        q(d.category),
        q(d.stage),
        userRef(d.raisedByEmail),
        q(d.description),
        deadline(d.negotiationDeadlineInDays),
        deadline(d.mediationDeadlineInDays),
        d.assignedMediatorEmail ? userRef(d.assignedMediatorEmail) : "NULL",
        t(d.assignedDaysAgo),
        d.resolvedByEmail ? userRef(d.resolvedByEmail) : "NULL",
        d.resolutionOutcome ? q(d.resolutionOutcome) : "NULL",
        d.freelancerShareMinor === undefined ? "NULL" : String(d.freelancerShareMinor),
        t(d.resolvedDaysAgo),
        t(d.createdDaysAgo),
        "CURRENT_TIMESTAMP",
      ],
      `"id" = ${q(d.id)}`,
    ),
  );
}

parts.push("-- -------------------------------------------------------- compliance flags\n");
for (const f of DEMO_FLAGS) {
  parts.push(
    insert(
      "TransactionFlag",
      [
        "id",
        "userId",
        "type",
        "status",
        "details",
        "relatedEntityId",
        "reviewedByStaffId",
        "reviewNotes",
        "createdAt",
        "updatedAt",
      ],
      [
        q(f.id),
        userRef(f.userEmail),
        q(f.type),
        q(f.status),
        json(f.details),
        f.relatedEntityId ? q(f.relatedEntityId) : "NULL",
        f.reviewedByEmail ? userRef(f.reviewedByEmail) : "NULL",
        f.reviewNotes ? q(f.reviewNotes) : "NULL",
        t(f.createdDaysAgo),
        "CURRENT_TIMESTAMP",
      ],
      `"id" = ${q(f.id)}`,
    ),
  );
}

parts.push("-- ---------------------------------------------------------- profile reports\n");
for (const r of DEMO_REPORTS) {
  parts.push(
    insert(
      "ProfileReport",
      [
        "id",
        "reporterId",
        "reportedUserId",
        "reason",
        "details",
        "status",
        "createdAt",
        "updatedAt",
      ],
      [
        q(r.id),
        userRef(r.reporterEmail),
        userRef(r.reportedUserEmail),
        q(r.reason),
        q(r.details),
        q(r.status),
        t(r.createdDaysAgo),
        "CURRENT_TIMESTAMP",
      ],
      `"id" = ${q(r.id)}`,
    ),
  );
}

parts.push("-- ------------------------------------------------------- support threads\n");
for (const c of DEMO_CONVERSATIONS) {
  parts.push(
    insert(
      "Conversation",
      [
        "id",
        "creatorId",
        "assignedStaffId",
        "contactEmail",
        "subject",
        "status",
        "createdAt",
        "updatedAt",
      ],
      [
        q(c.id),
        userRef(c.creatorEmail),
        c.assignedStaffEmail ? userRef(c.assignedStaffEmail) : "NULL",
        q(c.contactEmail),
        q(c.subject),
        q(c.status),
        t(c.createdDaysAgo),
        t(c.messages[0]?.createdDaysAgo ?? c.createdDaysAgo),
      ],
      `"id" = ${q(c.id)}`,
    ),
  );

  const participants = new Set(
    [c.creatorEmail, c.assignedStaffEmail].filter((v): v is string => Boolean(v)),
  );
  for (const email of participants) {
    parts.push(
      `INSERT INTO "ConversationParticipant" ("id", "conversationId", "userId")\n` +
        `SELECT ${q(`seed-participant-${c.id}-${email.split("@")[0]}`)}, ${q(c.id)}, ${userRef(email)}\n` +
        `WHERE NOT EXISTS (SELECT 1 FROM "ConversationParticipant" WHERE "conversationId" = ${q(c.id)} AND "userId" = ${userRef(email)});\n`,
    );
  }

  for (const msg of c.messages) {
    parts.push(
      insert(
        "ChatMessage",
        ["id", "conversationId", "senderId", "body", "createdAt"],
        [q(msg.id), q(c.id), userRef(msg.senderEmail), q(msg.body), t(msg.createdDaysAgo)],
        `"id" = ${q(msg.id)}`,
      ),
    );
  }
}

parts.push("-- ------------------------------------------------------------- audit trail\n");
for (const a of DEMO_AUDIT_LOGS) {
  parts.push(
    insert(
      "AuditLog",
      [
        "id",
        "userId",
        "eventType",
        "action",
        "entityType",
        "entityId",
        "actorRole",
        "amountMinor",
        "createdAt",
      ],
      [
        q(a.id),
        a.userEmail ? userRef(a.userEmail) : "NULL",
        q(a.eventType),
        a.action ? q(a.action) : "NULL",
        q(a.entityType),
        q(a.entityId),
        a.actorRole ? q(a.actorRole) : "NULL",
        a.amountMinor === undefined ? "NULL" : String(a.amountMinor),
        t(a.createdDaysAgo),
      ],
      `"id" = ${q(a.id)}`,
    ),
  );
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "migration.sql"), parts.join("\n"), "utf8");
console.log(`wrote ${path.join(OUT_DIR, "migration.sql")}`);
