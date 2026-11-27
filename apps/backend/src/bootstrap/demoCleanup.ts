// === DEMO / TEST DATA PURGE ===============================================
//
// WHY THIS EXISTS
// ---------------
// The live AletCloud database accumulated two kinds of data that must not
// stay on a platform the founder is about to operate:
//
//   1. The seeded demo world (`prisma/seed.ts` + `prisma/demoActivity.ts`):
//      a compliance officer, a support agent, a seller with gigs, two demo
//      clients and a demo freelancer, plus the contracts, milestones,
//      payments, payouts, top-ups, disputes, flags, reports and support
//      threads built around them.
//   2. The automated verification accounts that the end-to-end scripts
//      created (`onboarding.check.*@example.com`, `aletcheck.*@example.com`,
//      `probe.*@example.com`, ...). RFC 2606 reserves `example.com` for
//      documentation and testing, so no real member can own one.
//
// The administrator (`admin@yekis.et`) and every real account — Gmail
// sign-ups, Telegram members, guest support sessions and the GDPR erasure
// tombstones — must survive untouched.
//
// HOW IT DECIDES WHAT TO DELETE
// -----------------------------
// It does **not** carry a hand-maintained table list. It reads the live
// foreign-key graph from `information_schema`, seeds the set with the target
// users, and closes over every row that references a row already in the set.
// New tables are picked up automatically.
//
// Three rules make that graph walk safe:
//
//   * **Only references that would block a delete are followed.** A
//     `RESTRICT` / `NO ACTION` child has to be removed before its parent, so
//     it belongs in the set. A `SET NULL` child must *not* be: deleting a
//     demo support agent must not delete the real member's support thread
//     that the agent happened to be assigned to, and deleting a demo user
//     must not erase the audit log (its actor reference is nulled instead).
//     `CASCADE` children are included so the report counts them, though the
//     database would remove them anyway.
//   * **No shared row.** A row is only deleted when every member it names is
//     a target. If a demo client ever signed a contract with a real
//     freelancer, the run refuses and reports the table instead of deleting
//     the real member's contract. Nothing is written until that check passes.
//   * **The administrator is never a target.** The address is excluded in
//     SQL, checked again in TypeScript, and asserted before any delete runs.
//     The two seeded staff accounts are allowed through; any *other* staff
//     account in the target set is refused.
//
// A handful of columns hold a user id without a declared foreign key
// (`Dispute.raisedByUserId`, the verification codes, `ProfileView`). Those
// are listed explicitly in `LOOSE_USER_COLUMNS` and seeded the same way.
//
// Deletion is deliberately *not* one transaction. Postgres aborts a
// transaction on the first foreign-key violation, and the whole point here is
// to retry until the dependency order resolves itself. Each statement is
// autocommit, so a blocked row is simply retried in the next round; a partial
// run is safe to repeat because the plan is recomputed from what is left.
// ==========================================================================

import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";

export const DEMO_CLEANUP_ENV = "DEMO_CLEANUP";
export const DEMO_CLEANUP_DRY_RUN = "dry-run";
export const DEMO_CLEANUP_CONFIRM = "confirm";

/**
 * The accounts `prisma/seed.ts` creates that are not the administrator.
 * `admin@yekis.et` is deliberately absent: it is the credential the founder
 * keeps.
 */
export const SEEDED_DEMO_EMAILS: readonly string[] = [
  "compliance@yekis.et",
  "support@yekis.et",
  "seller@yekis.et",
  "client@yekis.et",
  "freelancer@yekis.et",
  "newbie@yekis.et",
];

/**
 * RFC 2606 reserves `example.com` for documentation and testing, so every
 * address under it is an automated fixture and never a real member.
 */
export const AUTOMATED_TEST_EMAIL_PATTERN = "%@example.com";

/** Never deleted, whatever else matches. */
export const PROTECTED_EMAILS: readonly string[] = ["admin@yekis.et"];

/**
 * The only staff accounts that may be deleted. `seed.ts` creates them with a
 * staff role, so the blanket "never delete staff" rule needs this narrow
 * exception; any other staff account is refused.
 */
const DEMO_STAFF_EMAILS: readonly string[] = ["compliance@yekis.et", "support@yekis.et"];

/** Real-member domains that must never match the target selector. */
const NEVER_TARGET_SUFFIXES: readonly string[] = [
  "@guest.invalid",
  "@erased.invalid",
  "@yekis.local",
];

/** A runaway selector must fail rather than delete a crowd. */
const MAX_TARGETS = 100;
const MAX_CLOSURE_ROWS = 20_000;

/** A child under these rules must be removed before its parent. */
const BLOCKING_RULES = new Set(["RESTRICT", "NO ACTION"]);

/** Follow these to build the set: blocking children, plus cascades for counting. */
const TRAVERSED_RULES = new Set(["RESTRICT", "NO ACTION", "CASCADE"]);

/**
 * Columns that hold a user id without a foreign key. Without this list a
 * deleted demo user would leave orphaned verification codes, profile views
 * and raised disputes behind.
 *
 * `KycReviewEvent.staffUserId` is deliberately absent: it records a staff
 * decision and is audit evidence, so it is retained even when the staff
 * account is removed.
 */
const LOOSE_USER_COLUMNS: ReadonlyArray<{ table: string; column: string }> = [
  { table: "Dispute", column: "raisedByUserId" },
  { table: "EmailVerificationCode", column: "userId" },
  { table: "PhoneVerificationCode", column: "userId" },
  { table: "ProfileView", column: "targetUserId" },
];

type Edge = {
  child: string;
  childCol: string;
  parent: string;
  parentCol: string;
  deleteRule: string;
};

export type TargetUser = {
  id: string;
  email: string;
  staffRole: string | null;
};

export type PurgeBlocker = {
  table: string;
  columns: string[];
  rows: number;
};

export type DemoPurgePlan = {
  targets: TargetUser[];
  userCountBefore: number;
  /** table -> primary-key ids that will be deleted. */
  rows: Record<string, string[]>;
  counts: Record<string, number>;
  totalRows: number;
  blockers: PurgeBlocker[];
};

export type DemoPurgeResult = {
  /** Rows removed by an explicit DELETE in this run. */
  deleted: Record<string, number>;
  totalDeleted: number;
  /** Rows the plan expected to remove, including cascade children. */
  totalRowsPlanned: number;
  /** Planned rows the database removed through ON DELETE CASCADE. */
  cascaded: number;
  userCountAfter: number;
};

export type DemoCleanupOutcome =
  | "disabled"
  | "rejected"
  | "blocked"
  | "dry-run"
  | "nothing-to-do"
  | "purged";

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function isForeignKeyViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code;
  if (code === "P2003") return true;
  const message = (err as { message?: unknown }).message;
  return typeof message === "string" && /foreign key constraint/i.test(message);
}

/**
 * The normalised value of `DEMO_CLEANUP`. Empty when the feature is off.
 * Exported so the refusal behaviour can be unit-tested without a database.
 */
export function readCleanupMode(env: NodeJS.ProcessEnv): string {
  return env[DEMO_CLEANUP_ENV]?.trim().toLowerCase() ?? "";
}

/**
 * Refuses a target set that contains anybody the purge must not touch.
 * Pure, so the rules are unit-tested directly.
 */
export function validateTargets(targets: readonly TargetUser[]): void {
  if (targets.length > MAX_TARGETS) {
    throw new Error(
      `refusing to purge ${targets.length} accounts: the limit is ${MAX_TARGETS}`,
    );
  }

  for (const target of targets) {
    if (PROTECTED_EMAILS.includes(target.email)) {
      throw new Error(`refusing to purge: ${target.email} is protected`);
    }
    if (NEVER_TARGET_SUFFIXES.some((suffix) => target.email.endsWith(suffix))) {
      throw new Error(
        `refusing to purge: ${target.email} belongs to a real-member domain`,
      );
    }
    const isDemo = SEEDED_DEMO_EMAILS.includes(target.email);
    const isAutomatedTest = target.email.endsWith("@example.com");
    if (!isDemo && !isAutomatedTest) {
      throw new Error(
        `refusing to purge: ${target.email} matches neither the demo list nor the automated-test pattern`,
      );
    }
    if (target.staffRole !== null && !DEMO_STAFF_EMAILS.includes(target.email)) {
      throw new Error(
        `refusing to purge: ${target.email} is a staff account and not a seeded demo identity`,
      );
    }
  }
}

async function loadForeignKeys(): Promise<Edge[]> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      child: string;
      child_col: string;
      parent: string;
      parent_col: string;
      delete_rule: string;
    }>
  >(`
    SELECT
      tc.table_name       AS child,
      kcu.column_name     AS child_col,
      ccu.table_name      AS parent,
      ccu.column_name     AS parent_col,
      rc.delete_rule      AS delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name
     AND kcu.table_schema = tc.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
     AND rc.constraint_schema = tc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  `);

  return rows.map((row) => ({
    child: row.child,
    childCol: row.child_col,
    parent: row.parent,
    parentCol: row.parent_col,
    deleteRule: row.delete_rule,
  }));
}

/**
 * Every table this schema has is keyed by one `id` column. The purge relies
 * on that: a composite key would make a delete-by-one-column unsafe, so it
 * refuses instead of guessing.
 */
async function loadPrimaryKeys(): Promise<Map<string, string>> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{ table_name: string; column_name: string }>
  >(`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name
     AND kcu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.ordinal_position
  `);

  const byTable = new Map<string, string[]>();
  for (const row of rows) {
    const columns = byTable.get(row.table_name) ?? [];
    columns.push(row.column_name);
    byTable.set(row.table_name, columns);
  }

  const keys = new Map<string, string>();
  for (const [table, columns] of byTable) {
    const [column, ...extra] = columns;
    if (column === undefined || extra.length > 0) {
      throw new Error(
        `refusing to purge: table ${table} has a composite primary key (${columns.join(", ")}); this purge only supports single-column keys`,
      );
    }
    keys.set(table, column);
  }
  return keys;
}

async function selectTargetUsers(): Promise<TargetUser[]> {
  return prisma.$queryRawUnsafe<TargetUser[]>(
    `
    SELECT "id"::text AS "id", "email", "staffRole"::text AS "staffRole"
    FROM "User"
    WHERE ("email" = ANY($1::text[]) OR "email" LIKE $2)
      AND "email" <> ALL($3::text[])
    ORDER BY "email"
    `,
    [...SEEDED_DEMO_EMAILS],
    AUTOMATED_TEST_EMAIL_PATTERN,
    [...PROTECTED_EMAILS],
  );
}

/**
 * Works out exactly which rows belong to the target users, and whether any of
 * them is shared with a member who is not a target. Reads only — no writes.
 */
export async function planDemoPurge(): Promise<DemoPurgePlan> {
  const [edges, primaryKeys, targets, userCountBefore] = await Promise.all([
    loadForeignKeys(),
    loadPrimaryKeys(),
    selectTargetUsers(),
    prisma.user.count(),
  ]);

  validateTargets(targets);

  const userSet = new Set(targets.map((target) => target.id));
  const rows = new Map<string, Set<string>>();
  const setFor = (table: string): Set<string> => {
    let set = rows.get(table);
    if (!set) {
      set = new Set<string>();
      rows.set(table, set);
    }
    return set;
  };

  const userRows = setFor("User");
  for (const target of targets) userRows.add(target.id);

  // Loose columns first: they are owned by the target even though the schema
  // does not declare a foreign key.
  for (const loose of LOOSE_USER_COLUMNS) {
    const pk = primaryKeys.get(loose.table);
    if (!pk) continue;
    const found = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT ${quoteIdent(pk)}::text AS "id"
         FROM ${quoteIdent(loose.table)}
        WHERE ${quoteIdent(loose.column)}::text = ANY($1::text[])`,
      [...userSet],
    );
    const set = setFor(loose.table);
    for (const row of found) set.add(row.id);
  }

  // Close over every row that references a row already in the set.
  let changed = targets.length > 0;
  let rounds = 0;
  while (changed) {
    changed = false;
    rounds += 1;
    if (rounds > 60) {
      throw new Error("demo purge closure did not converge after 60 rounds");
    }

    for (const edge of edges) {
      // Other members are never dragged in: only the explicit target list
      // may remove a `User` row.
      if (edge.child === "User") continue;
      if (!TRAVERSED_RULES.has(edge.deleteRule)) continue;

      const parents = rows.get(edge.parent);
      if (!parents || parents.size === 0) continue;
      const childPk = primaryKeys.get(edge.child);
      if (!childPk) continue;

      const found = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT ${quoteIdent(childPk)}::text AS "id"
           FROM ${quoteIdent(edge.child)}
          WHERE ${quoteIdent(edge.childCol)}::text = ANY($1::text[])`,
        [...parents],
      );

      const childSet = setFor(edge.child);
      for (const row of found) {
        if (!childSet.has(row.id)) {
          childSet.add(row.id);
          changed = true;
        }
      }
    }

    let total = 0;
    for (const set of rows.values()) total += set.size;
    if (total > MAX_CLOSURE_ROWS) {
      throw new Error(
        `refusing to purge: the row closure reached ${total} rows, above the ${MAX_CLOSURE_ROWS} limit`,
      );
    }
  }

  // Safety: no row in the closure may name a member who is not a target.
  const blockers: PurgeBlocker[] = [];
  const userEdges = edges.filter(
    (edge) => edge.parent === "User" && BLOCKING_RULES.has(edge.deleteRule),
  );
  const edgesByTable = new Map<string, Edge[]>();
  for (const edge of userEdges) {
    const list = edgesByTable.get(edge.child) ?? [];
    list.push(edge);
    edgesByTable.set(edge.child, list);
  }

  for (const [table, tableEdges] of edgesByTable) {
    const ids = rows.get(table);
    if (!ids || ids.size === 0) continue;
    const pk = primaryKeys.get(table);
    if (!pk) {
      throw new Error(`no primary key found for table ${table}`);
    }

    const offenders = new Set<string>();
    for (const edge of tableEdges) {
      const found = await prisma.$queryRawUnsafe<
        Array<{ id: string; uid: string | null }>
      >(
        `SELECT ${quoteIdent(pk)}::text AS "id",
                ${quoteIdent(edge.childCol)}::text AS "uid"
           FROM ${quoteIdent(table)}
          WHERE ${quoteIdent(pk)}::text = ANY($1::text[])`,
        [...ids],
      );
      for (const row of found) {
        if (row.uid !== null && !userSet.has(row.uid)) offenders.add(row.id);
      }
    }

    if (offenders.size > 0) {
      blockers.push({
        table,
        columns: tableEdges.map((edge) => edge.childCol),
        rows: offenders.size,
      });
    }
  }

  const planRows: Record<string, string[]> = {};
  const counts: Record<string, number> = {};
  let totalRows = 0;
  for (const [table, ids] of rows) {
    if (ids.size === 0) continue;
    planRows[table] = [...ids];
    counts[table] = ids.size;
    totalRows += ids.size;
  }

  return { targets, userCountBefore, rows: planRows, counts, totalRows, blockers };
}

async function deleteIds(table: string, pk: string, ids: string[]): Promise<number> {
  return prisma.$executeRawUnsafe(
    `DELETE FROM ${quoteIdent(table)} WHERE ${quoteIdent(pk)}::text = ANY($1::text[])`,
    ids,
  );
}

/**
 * Executes a plan. Children are deleted before parents by retrying: a row
 * whose foreign key still points at a surviving parent is skipped and retried
 * on the next round. A blocked chunk is split so one stubborn row cannot stall
 * its siblings.
 */
export async function executeDemoPurge(plan: DemoPurgePlan): Promise<DemoPurgeResult> {
  if (plan.blockers.length > 0) {
    throw new Error(
      "refusing to purge: rows are shared with accounts that are not targets - " +
        plan.blockers
          .map((blocker) => `${blocker.table}.${blocker.columns.join("+")} (${blocker.rows})`)
          .join("; "),
    );
  }
  if (plan.targets.some((target) => PROTECTED_EMAILS.includes(target.email))) {
    throw new Error("refusing to purge: the protected administrator is in the target set");
  }

  const targetIds = new Set(plan.targets.map((target) => target.id));
  const primaryKeys = await loadPrimaryKeys();
  const remaining = new Map<string, Set<string>>();
  // `User` is the root of the graph: delete it after every child, or the first
  // pass spends its retries proving that the users still have children.
  const orderedTables = Object.keys(plan.rows).sort((a, b) => {
    if (a === "User") return 1;
    if (b === "User") return -1;
    return 0;
  });
  for (const table of orderedTables) {
    remaining.set(table, new Set(plan.rows[table]));
  }

  const deleted: Record<string, number> = {};
  const bump = (table: string, n: number): void => {
    if (n > 0) deleted[table] = (deleted[table] ?? 0) + n;
  };

  const attempt = async (table: string, pk: string, ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return true;
    if (table === "User" && !ids.every((id) => targetIds.has(id))) {
      throw new Error("refusing to purge: the User delete contains an account that is not a target");
    }
    try {
      const n = await deleteIds(table, pk, ids);
      bump(table, n);
      return true;
    } catch (err) {
      if (!isForeignKeyViolation(err)) throw err;
      if (ids.length === 1) return false;
      // Isolate the blocked row instead of stalling the whole chunk.
      const middle = Math.ceil(ids.length / 2);
      const left = await attempt(table, pk, ids.slice(0, middle));
      const right = await attempt(table, pk, ids.slice(middle));
      return left && right;
    }
  };

  let progressed = true;
  let rounds = 0;
  while (progressed) {
    progressed = false;
    rounds += 1;
    if (rounds > 100) break;

    for (const [table, ids] of remaining) {
      if (ids.size === 0) continue;
      const pk = primaryKeys.get(table);
      if (!pk) throw new Error(`no primary key found for table ${table}`);

      const ok = await attempt(table, pk, [...ids]);
      if (ok) {
        ids.clear();
        progressed = true;
      }
    }
  }

  const leftover: Record<string, number> = {};
  let totalDeleted = 0;
  for (const [table, ids] of remaining) {
    if (ids.size > 0) leftover[table] = ids.size;
  }
  for (const n of Object.values(deleted)) totalDeleted += n;

  if (Object.keys(leftover).length > 0) {
    throw new Error(
      "demo purge did not converge; rows still blocked: " +
        Object.entries(leftover)
          .map(([table, n]) => `${table}=${n}`)
          .join(", "),
    );
  }

  // The closure is the contract: every planned row must be gone, whether this
  // run deleted it explicitly or the database cascaded it away. Re-query the
  // ids instead of trusting the DELETE counts, so a cascade can never hide a
  // survivor.
  const survivors: Record<string, number> = {};
  for (const [table, ids] of Object.entries(plan.rows)) {
    const pk = primaryKeys.get(table);
    if (!pk) throw new Error(`no primary key found for table ${table}`);
    const found = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS "n"
         FROM ${quoteIdent(table)}
        WHERE ${quoteIdent(pk)}::text = ANY($1::text[])`,
      ids,
    );
    const n = found[0]?.n ?? 0;
    if (n > 0) survivors[table] = n;
  }
  if (Object.keys(survivors).length > 0) {
    throw new Error(
      "demo purge left rows behind: " +
        Object.entries(survivors)
          .map(([table, n]) => `${table}=${n}`)
          .join(", "),
    );
  }

  // The two invariants that matter after the fact: the administrator still
  // exists, and exactly the target accounts are gone.
  const admin = await prisma.user.findUnique({
    where: { email: "admin@yekis.et" },
    select: { id: true },
  });
  if (!admin) {
    throw new Error("the protected administrator account is missing after the purge");
  }
  const userCountAfter = await prisma.user.count();
  const expected = plan.userCountBefore - plan.targets.length;
  if (userCountAfter !== expected) {
    throw new Error(
      `user count after the purge is ${userCountAfter}; expected ${expected} (${plan.userCountBefore} before, ${plan.targets.length} targets)`,
    );
  }

  return {
    deleted,
    totalDeleted,
    totalRowsPlanned: plan.totalRows,
    cascaded: plan.totalRows - totalDeleted,
    userCountAfter,
  };
}

/**
 * The start-up hook. Inert unless `DEMO_CLEANUP` is set to `dry-run` or
 * `confirm`; the operator removes the variable once the data is gone.
 */
export async function purgeDemoDataFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ outcome: DemoCleanupOutcome }> {
  const mode = readCleanupMode(env);
  if (!mode) return { outcome: "disabled" };

  if (mode !== DEMO_CLEANUP_DRY_RUN && mode !== DEMO_CLEANUP_CONFIRM) {
    logger.error(
      { mode },
      `Demo cleanup refused: ${DEMO_CLEANUP_ENV} must be "${DEMO_CLEANUP_DRY_RUN}" or "${DEMO_CLEANUP_CONFIRM}"`,
    );
    return { outcome: "rejected" };
  }

  const plan = await planDemoPurge();
  const summary = {
    mode,
    targetCount: plan.targets.length,
    targets: plan.targets.map((target) => target.email),
    userCountBefore: plan.userCountBefore,
    totalRows: plan.totalRows,
    counts: plan.counts,
    blockers: plan.blockers,
  };

  if (plan.blockers.length > 0) {
    logger.error(
      summary,
      "Demo cleanup refused: rows are shared with accounts that are not targets. Nothing was deleted.",
    );
    return { outcome: "blocked" };
  }

  if (plan.targets.length === 0) {
    logger.warn(
      { mode, userCountBefore: plan.userCountBefore },
      "Demo cleanup: no target accounts found; nothing to do",
    );
    return { outcome: "nothing-to-do" };
  }

  logger.warn(
    summary,
    mode === DEMO_CLEANUP_DRY_RUN
      ? "Demo cleanup dry run: nothing was deleted"
      : "Demo cleanup: deleting the seeded demo and automated test data",
  );

  if (mode === DEMO_CLEANUP_DRY_RUN) return { outcome: "dry-run" };

  const result = await executeDemoPurge(plan);
  logger.warn(
    {
      deleted: result.deleted,
      totalDeleted: result.totalDeleted,
      totalRowsPlanned: result.totalRowsPlanned,
      cascaded: result.cascaded,
      userCountAfter: result.userCountAfter,
    },
    "Demo cleanup finished: the seeded demo and automated test data are gone",
  );
  return { outcome: "purged" };
}
