import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertLocalDatabaseTarget } from "./_dbGuard.js";

const prisma = new PrismaClient();

async function main() {
  const confirm = process.argv.includes("--confirm");
  const allowRemote = process.argv.includes("--allow-remote");
  assertLocalDatabaseTarget({
    allowRemote,
    allowedDbNames: ["marketplace", "marketplace_test"],
    forbidProduction: true,
    forbidStaging: true,
    scriptName: "reset_proposal",
  });

  const acceptedProposals = await prisma.proposal.findMany({
    where: { status: "ACCEPTED" },
    include: { job: true },
  });

  for (const proposal of acceptedProposals) {
    const contracts = await prisma.contract.count({ where: { jobId: proposal.jobId } });
    if (contracts === 0) {
      if (!confirm) {
        console.log(`[DRY RUN] Would reset Proposal ${proposal.id} (Job ${proposal.jobId}) because it has no contract. Pass --confirm to apply.`);
        continue;
      }
      console.log(`Resetting Proposal ${proposal.id} (Job ${proposal.jobId}) because it has no contract.`);
      await prisma.$transaction([
        prisma.job.update({
          where: { id: proposal.jobId },
          data: { status: "OPEN" },
        }),
        prisma.proposal.update({
          where: { id: proposal.id },
          data: { status: "SUBMITTED" },
        }),
        prisma.proposal.updateMany({
          where: { jobId: proposal.jobId, id: { not: proposal.id } },
          data: { status: "SUBMITTED" }
        })
      ]);
      console.log("Reset successful.");
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
