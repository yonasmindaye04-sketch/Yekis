// === MAIN FUNCTIONS ===
/**
 * Makes `BigInt` survive `JSON.stringify`.
 *
 * `JSON.stringify(1n)` throws `TypeError: Do not know how to serialize a
 * BigInt`. That turns any accidental serialisation of a Prisma row holding
 * `telegramUserId` into a 500 — or, worse, into a swallowed error inside a
 * try/catch that silently drops a bot session write.
 *
 * A prototype patch is used rather than a helper because auditing every
 * `JSON.stringify` call site in a codebase this size is not realistic, and the
 * failure is invisible until it happens. The patch is idempotent, defined in
 * exactly one place, and imported for its side effect from the HTTP entry
 * point and the session store.
 *
 * Serialised as a STRING, never a number: a Telegram id above 2^53 cannot
 * survive `JSON.parse` as a JS number, so string is the only lossless choice.
 * Callers must convert back with `BigInt(...)` at the boundary.
 */
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

if (!Object.prototype.hasOwnProperty.call(BigInt.prototype, "toJSON")) {
  Object.defineProperty(BigInt.prototype, "toJSON", {
    value: function toJSON(this: bigint) {
      return this.toString();
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

/**
 * Explicitly BigInt-safe stringify for stores that must never throw
 * (Redis session writes, cache values).
 *
 * Used where a serialisation failure would be caught and logged rather than
 * surfaced, i.e. exactly the places where a dropped write is hard to notice.
 */
export function safeStringify(value: unknown, space?: number): string {
  const replacer = (_key: string, val: unknown): unknown =>
    typeof val === "bigint" ? val.toString() : val;
  return JSON.stringify(value, replacer, space);
}

/**
 * Converts a Telegram identifier to BigInt exactly once, at the boundary.
 *
 * grammY hands `ctx.from.id` over as a JS number and Prisma wants a BigInt.
 * Doing the conversion in one named place keeps every comparison on the same
 * side of the fence, which is what the H7 finding was about.
 */
export function toTelegramBigInt(
  value: bigint | string | number | null | undefined,
): bigint | null {
  if (value === null || value === undefined || value === "") return null;
  try {
    return BigInt(value);
  } catch {
    // A malformed id must not become 0n, which would match a real member.
    return null;
  }
}
