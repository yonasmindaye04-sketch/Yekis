/**
 * F-01 data check — READ ONLY. Makes no writes of any kind.
 *
 * Question for the human: the old guest intake did `user.upsert({ where:
 * { email } })` on whatever address a signed-out visitor typed. For any address
 * that belonged to a real member it matched the EXISTING row and did nothing.
 * That is how the takeover worked, and it also means this database may contain
 * User rows that were created by the guest support path while believing they
 * were real accounts.
 *
 * This script lists candidates so you can decide what to do. It deliberately
 * does NOT clean anything up.
 *
 * Run: npx tsx scripts/report-guest-created-users.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

/** Heuristic markers that a row came from the guest support path. */
function classify(row: {
  email: string;
  passwordHash: string;
  passwordSetAt: Date | null;
  isGuestContact: boolean;
  googleId: string | null;
  appleId: string | null;
  facebookId: string | null;
  telegramUserId: bigint | null;
}) {
  const reasons: string[] = [];
  if (row.isGuestContact) reasons.push("isGuestContact=true (created by the new guest path)");
  if (row.email.endsWith("@guest.invalid")) reasons.push("synthetic guest.invalid address");
  if (row.email.endsWith("@guest.yekis.et")) reasons.push("synthetic guest.yekis.et address");
  if (row.passwordHash === "guest-support-contact") reasons.push("guest password hash");
  if (
    !row.passwordSetAt &&
    !row.googleId &&
    !row.appleId &&
    !row.facebookId &&
    !row.telegramUserId
  ) {
    reasons.push("no password set and no federated/Telegram identity");
  }
  return reasons;
}

async function main() {
  // Everything the guest path could have touched. Deliberately broad: this is a
  // forensic sweep, not a targeted query.
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      staffRole: true,
      createdAt: true,
      passwordHash: true,
      passwordSetAt: true,
      isGuestContact: true,
      isSuspended: true,
      googleId: true,
      appleId: true,
      facebookId: true,
      telegramUserId: true,
      wallet: { select: { balanceMinor: true } },
      _count: {
        select: {
          conversationsCreated: true,
          contractsAsClient: true,
          contractsAsFreelancer: true,
          jobsPosted: true,
          proposals: true,
          walletTopUps: true,
          payouts: true,
          sentDirectMessages: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const flagged = users
    .map((u) => ({ u, reasons: classify(u) }))
    .filter((x) => x.reasons.length > 0);

  console.log("=".repeat(78));
  console.log("F-01 guest-created account sweep — READ ONLY, nothing was modified");
  console.log("=".repeat(78));
  console.log(`Total User rows inspected: ${users.length}`);
  console.log(`Rows matching a guest-created heuristic: ${flagged.length}`);
  console.log("");

  if (flagged.length === 0) {
    console.log("No guest-created accounts found.");
  }

  for (const { u, reasons } of flagged) {
    const activity = u._count;
    const hasActivity =
      activity.conversationsCreated > 0 ||
      activity.contractsAsClient > 0 ||
      activity.contractsAsFreelancer > 0 ||
      activity.jobsPosted > 0 ||
      activity.proposals > 0 ||
      activity.walletTopUps > 0 ||
      activity.payouts > 0 ||
      activity.sentDirectMessages > 0;

    console.log("-".repeat(78));
    console.log(`id            ${u.id}`);
    console.log(`email         ${u.email}`);
    console.log(`phone         ${u.phone}`);
    console.log(`role          ${u.role}${u.staffRole ? ` / staff=${u.staffRole}` : ""}`);
    console.log(`createdAt     ${u.createdAt.toISOString()}`);
    console.log(`suspended     ${u.isSuspended}`);
    console.log(
      `balanceMinor  ${u.wallet?.balanceMinor ?? 0}${
        (u.wallet?.balanceMinor ?? 0) !== 0 ? "   <-- NON-ZERO BALANCE: review before deleting" : ""
      }`,
    );
    console.log(`activity      conv=${activity.conversationsCreated} clientContracts=${activity.contractsAsClient} freelancerContracts=${activity.contractsAsFreelancer} jobs=${activity.jobsPosted} proposals=${activity.proposals} topups=${activity.walletTopUps} payouts=${activity.payouts} dms=${activity.sentDirectMessages}`);
    console.log(`why flagged   ${reasons.join("; ")}`);
    if (hasActivity) {
      console.log(
        "ACTION NEEDED This row has activity beyond support conversations. Do NOT bulk-delete it.",
      );
    }
  }

  // A second, sharper check: any real-looking email whose only sign of life is
  // support conversations is a squatted account, i.e. the takeover in reverse —
  // where a guest intake adopted an address that later got used for sign-up.
  console.log("");
  console.log("=".repeat(78));
  console.log("Squatting check: non-guest rows whose only activity is conversations");
  console.log("=".repeat(78));
  const squatters = users.filter((u) => {
    if (classify(u).length > 0) return false;
    const a = u._count;
    return (
      a.conversationsCreated > 0 &&
      a.contractsAsClient === 0 &&
      a.contractsAsFreelancer === 0 &&
      a.jobsPosted === 0 &&
      a.proposals === 0 &&
      a.walletTopUps === 0 &&
      a.payouts === 0 &&
      a.sentDirectMessages === 0 &&
      !u.passwordSetAt
    );
  });
  console.log(`Candidates: ${squatters.length}`);
  for (const u of squatters) {
    console.log(
      `  ${u.id}  ${u.email}  conversations=${u._count.conversationsCreated}  phone=${u.phone}`,
    );
  }
  if (squatters.length > 0) {
    console.log("");
    console.log(
      "These have a real-looking email and no other activity. An email column is @unique, so such a row BLOCKS that address from ever registering. Decide per address whether to release it.",
    );
  }

  console.log("");
  console.log("No rows were created, updated or deleted by this script.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());