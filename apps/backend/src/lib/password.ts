import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

/**
 * Argon2id parameters used for every new password hash.
 *
 * `memoryCost` is the pool size **per thread** in KiB, so 16384 KiB x 4 lanes
 * is the same 64 MiB / 3-pass / 4-lane budget the previous `argon2` package
 * used by default. Verification ignores these values and reads the parameters
 * embedded in each stored hash, so hashes created before the move to
 * `@node-rs/argon2` keep verifying.
 */
const ARGON2_OPTIONS = {
  memoryCost: 16384,
  timeCost: 3,
  parallelism: 4,
};

/** Hash a plaintext password into a PHC-encoded Argon2id string. */
export function hashPassword(password: string): Promise<string> {
  return argonHash(password, ARGON2_OPTIONS);
}

/**
 * Verify a password against a stored hash.
 *
 * Throws when the stored value is not a parsable hash (legacy, seeded or
 * corrupted rows) — callers must treat that as "not a match" rather than
 * letting it surface as a 500.
 */
export function verifyPassword(hashed: string, password: string): Promise<boolean> {
  return argonVerify(hashed, password, ARGON2_OPTIONS);
}
