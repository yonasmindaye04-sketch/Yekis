/**
 * Resolves the database the test suite is allowed to touch.
 *
 * WHY THIS EXISTS
 * The backend tests used to run against the development database. Several
 * suites call deleteMany(), and one bug filtered with an undefined value —
 * Prisma treats `undefined` as "no filter", so `deleteMany({ where: { contractId } })`
 * with `contractId === undefined` deleted EVERY Milestone row in the database,
 * development data included.
 *
 * A test run must be unable to reach development data, so the URL used for
 * tests comes from DATABASE_URL_TEST and must name a database containing
 * "_test". Everything else aborts before a single query runs.
 */

export const REFUSAL_MESSAGE =
  "refusing to run tests against a non-test database";

/**
 * Parses the database name out of a Postgres connection URL.
 * Returns null when the URL cannot be parsed or carries no database name.
 */
export function databaseNameFromUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  const name = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  return name.length > 0 ? name : null;
}

/**
 * Returns the test database URL, or throws the refusal message.
 * A database name must contain "_test".
 */
export function resolveTestDatabaseUrl(raw: string | undefined): string {
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      `${REFUSAL_MESSAGE}: DATABASE_URL_TEST is not set. Point it at a database whose name contains "_test".`,
    );
  }
  const name = databaseNameFromUrl(raw.trim());
  if (name === null) {
    throw new Error(
      `${REFUSAL_MESSAGE}: DATABASE_URL_TEST is not a valid connection URL.`,
    );
  }
  if (!name.includes("_test")) {
    throw new Error(
      `${REFUSAL_MESSAGE}: database "${name}" does not contain "_test". ` +
        `Set DATABASE_URL_TEST to a dedicated test database.`,
    );
  }
  return raw.trim();
}

/**
 * Points the process at the test database: DATABASE_URL becomes
 * DATABASE_URL_TEST, and REDIS_URL becomes REDIS_URL_TEST when that is set.
 *
 * DATABASE_URL is overwritten unconditionally and even if it already names a
 * test database, so a stray shell export cannot quietly aim the run elsewhere.
 * REDIS_URL_TEST is optional: when absent the run keeps whatever REDIS_URL the
 * environment already provides.
 */
export function applyTestDatabaseEnv(
  env: NodeJS.ProcessEnv = process.env,
): { databaseUrl: string; databaseName: string } {
  const databaseUrl = resolveTestDatabaseUrl(env.DATABASE_URL_TEST);
  const databaseName = databaseNameFromUrl(databaseUrl) as string;

  env.DATABASE_URL = databaseUrl;
  if (env.REDIS_URL_TEST && env.REDIS_URL_TEST.trim().length > 0) {
    env.REDIS_URL = env.REDIS_URL_TEST.trim();
  }

  return { databaseUrl, databaseName };
}