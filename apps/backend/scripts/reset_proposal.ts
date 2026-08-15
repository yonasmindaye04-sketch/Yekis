import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const acceptedProposals = await prisma.proposal.findMany({
    where: { status: "ACCEPTED" },
    include: { job: true },
  });
  
  for (const proposal of acceptedProposals) {
    const contracts = await prisma.contract.count({ where: { jobId: proposal.jobId } });
    if (contracts === 0) {
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
