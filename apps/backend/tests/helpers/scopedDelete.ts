/**
 * A deleteMany() wrapper that refuses to run an unscoped delete.
 *
 * WHY THIS EXISTS
 * Prisma treats an `undefined` value inside a `where` clause as "no filter".
 * So this call, written with a module-level variable that had not been assigned
 * yet:
 *
 *   await prisma.milestone.deleteMany({ where: { contractId } });
 *
 * silently degraded to `deleteMany({})` and removed EVERY Milestone row in the
 * database it was pointed at — which was the development database. The failure
 * only showed up as an unrelated "No Milestone found" in another suite.
 *
 * `undefined` is the dangerous value, not falsiness: `null`, `0` and `""` are
 * all legitimate filter values and are passed through untouched.
 */

/** Minimal shape of a Prisma model delegate that supports deleteMany. */
export interface DeleteDelegate {
  deleteMany(args: { where: unknown }): Promise<{ count: number }>;
}

function describe(path: string): string {
  return path === "where" ? "where" : path;
}

/**
 * Walks a filter and throws on the first `undefined` it finds, naming the path.
 */
function assertNoUndefined(value: unknown, path: string): void {
  if (value === undefined) {
    throw new Error(
      `scopedDelete: ${describe(path)} is undefined. ` +
        `Prisma treats undefined as "no filter", which would delete every row. ` +
        `Use an explicit sentinel, or skip the delete when the id is unknown.`,
    );
  }
  if (value === null) return; // a real filter value
  if (value instanceof Date) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoUndefined(entry, `${path}[${index}]`));
    return;
  }
  if (typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      assertNoUndefined(entry, `${path}.${key}`);
    }
  }
}

/**
 * Calls `delegate.deleteMany({ where })` after proving the filter is scoped.
 *
 * Throws (without deleting anything) when:
 *  - `where` is missing, not an object, or has no keys
 *  - any value inside `where` is `undefined`, at any depth
 *
 * @param label optional name of the calling suite, included in error messages
 */
export async function scopedDelete<T extends { count: number } = { count: number }>(
  delegate: DeleteDelegate,
  where: unknown,
  label?: string,
): Promise<T> {
  const context = label ? ` (${label})` : "";

  if (where === undefined || where === null || typeof where !== "object") {
    throw new Error(
      `scopedDelete${context}: a where filter is required, got ${String(where)}.`,
    );
  }
  if (Array.isArray(where)) {
    throw new Error(
      `scopedDelete${context}: where must be an object, not an array.`,
    );
  }
  if (Object.keys(where as Record<string, unknown>).length === 0) {
    throw new Error(
      `scopedDelete${context}: the where filter is empty, which would delete every row.`,
    );
  }

  assertNoUndefined(where, "where");

  return (await delegate.deleteMany({ where })) as T;
}