/**
 * F-02 data check — READ ONLY. Makes no writes of any kind.
 *
 * Question for the human: Telegram (x2) and Google/Apple/Facebook provisioning
 * each created `kyc: { tier: "TIER_1", status: "VERIFIED" }` with no document
 * ever uploaded. Any row still carrying that shape is an account that has
 * passed every requireKycVerified gate on the strength of a social sign-up.
 *
 * This lists them so you can decide what to do. It deliberately does NOT
 * downgrade or delete anything.
 *
 * Run: npx tsx scripts/report-federated-verified-without-documents.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const rows = await prisma.kycRecord.findMany({
    where: { status: "VERIFIED" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          staffRole: true,
          isSuspended: true,
          isGuestContact: true,
          createdAt: true,
          passwordSetAt: true,
          googleId: true,
          appleId: true,
          facebookId: true,
          telegramUserId: true,
          _count: {
            select: {
              contractsAsClient: true,
              contractsAsFreelancer: true,
              jobsPosted: true,
              proposals: true,
              walletTopUps: true,
              payouts: true,
            },
          },
        },
      },
      _count: { select: { documents: true, reviewEvents: true } },
    },
    orderBy: { lastVerifiedAt: "asc" },
  });

  // The population of interest: VERIFIED, no document ever uploaded, and an
  // account whose only credential is a federated/Telegram identity — i.e.
  // nothing a Compliance Officer ever looked at.
  const suspicious = rows.filter(
    (r) =>
      r._count.documents === 0 &&
      !r.lastVerifiedAt &&
      (
        r.user.googleId ||
        r.user.appleId ||
        r.user.facebookId ||
        r.user.telegramUserId
      ) &&
      !r.user.passwordSetAt,
  );

  console.log("=".repeat(78));
  console.log(
    "F-02 sweep: VERIFIED accounts with no KYC document and no staff review",
  );
  console.log("READ ONLY — nothing was created, updated or deleted");
  console.log("=".repeat(78));
  console.log(`Total VERIFIED KycRecords: ${rows.length}`);
  console.log(`Of those, documents ever uploaded: ${
    rows.length - rows.filter((r) => r._count.documents === 0).length
  }`);
  console.log(`Never sent to a reviewer (lastVerifiedAt null): ${
    rows.filter((r) => !r.lastVerifiedAt).length
  }`);
  console.log(`SUSPICIOUS (federated + VERIFIED + 0 documents + never reviewed): ${suspicious.length}`);
  console.log("");

  if (suspicious.length === 0) {
    console.log("No accounts match. Nothing to review.");
  }

  for (const r of suspicious) {
    const u = r.user;
    const a = u._count;
    const hasActivity =
      a.contractsAsClient > 0 ||
      a.contractsAsFreelancer > 0 ||
      a.jobsPosted > 0 ||
      a.proposals > 0 ||
      a.walletTopUps > 0 ||
      a.payouts > 0;
    const provider = u.googleId
      ? "google"
      : u.appleId
        ? "apple"
        : u.facebookId
          ? "facebook"
          : u.telegramUserId
            ? "telegram"
            : "unknown";

    console.log("-".repeat(78));
    console.log(`userId        ${u.id}`);
    console.log(`kycRecordId   ${r.id}`);
    console.log(`email         ${u.email}`);
    console.log(`role          ${u.role}${u.staffRole ? ` / staff=${u.staffRole}` : ""}`);
    console.log(`signed up via ${provider}`);
    console.log(`createdAt     ${u.createdAt.toISOString()}`);
    console.log(`suspended     ${u.isSuspended}   guestContact ${u.isGuestContact}`);
    console.log(
      `activity      clientContracts=${a.contractsAsClient} freelancerContracts=${a.contractsAsFreelancer} jobs=${a.jobsPosted} proposals=${a.proposals} topups=${a.walletTopUps} payouts=${a.payouts}`,
    );
    if (hasActivity) {
      console.log(
        "ACTION NEEDED This account transacted while verified without evidence. Review the trail before changing its status.",
      );
    }
  }

  console.log("");
  console.log("Recommended next step (needs your approval, not done here):");
  console.log(
  "  For accounts with activity, review case by case rather than bulk-downgrading.",
  );
  console.log(
    "  For inactive accounts with no activity, set status to PENDING so they",
  );
  console.log(
    "  must submit a document before their next money action. Do not delete: the",
  );
  console.log("  audit log and any historical notifications reference these ids.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());