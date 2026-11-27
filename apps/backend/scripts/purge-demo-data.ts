// Manual runner for the demo/test purge.
//
//   pnpm --filter backend exec tsx scripts/purge-demo-data.ts            # dry run
//   pnpm --filter backend exec tsx scripts/purge-demo-data.ts --confirm  # delete
//
// The same engine runs at start-up when `DEMO_CLEANUP=dry-run|confirm` is set
// on the host (see src/bootstrap/demoCleanup.ts and docs/ADMIN_ACCESS.md).
//
// SAFETY: only the seeded demo accounts and RFC 2606 `@example.com` fixtures
// are targeted, `admin@yekis.et` is protected, and the run refuses if any
// relationship row is shared with a real member.

import { prisma } from "../src/lib/prisma.js";
import {
  DEMO_CLEANUP_CONFIRM,
  executeDemoPurge,
  planDemoPurge,
} from "../src/bootstrap/demoCleanup.js";

async function main(): Promise<void> {
  const confirm = process.argv.includes(`--${DEMO_CLEANUP_CONFIRM}`);

  const plan = await planDemoPurge();

  console.log(`Targets (${plan.targets.length}) — users before: ${plan.userCountBefore}`);
  for (const target of plan.targets) console.log(`  - ${target.email}  ${target.id}`);

  console.log(`\nRows in the closure: ${plan.totalRows}`);
  for (const [table, count] of Object.entries(plan.counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${table.padEnd(28)} ${count}`);
  }

  if (plan.blockers.length > 0) {
    console.log("\nBLOCKERS — rows shared with an account that is not a target:");
    for (const blocker of plan.blockers) {
      console.log(
        `  ${blocker.table}.${blocker.columns.join("+")}: ${blocker.rows} rows`,
      );
    }
    console.log("\nRefusing to continue. Nothing was deleted.");
    process.exitCode = 1;
    return;
  }

  if (!confirm) {
    console.log("\nDry run. Nothing was deleted. Re-run with --confirm to delete.");
    return;
  }

  const result = await executeDemoPurge(plan);
  console.log(
    `\nPlanned ${result.totalRowsPlanned} rows; deleted ${result.totalDeleted} explicitly, ` +
      `${result.cascaded} by cascade; users after: ${result.userCountAfter}`,
  );
  for (const [table, count] of Object.entries(result.deleted).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${table.padEnd(28)} ${count}`);
  }
}

main()
  .catch((err) => {
    console.error("Purge failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
