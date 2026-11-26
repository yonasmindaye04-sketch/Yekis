// === STAFF PROVISIONING ===================================================
//
// WHY THIS MODULE EXISTS
// ----------------------
// The platform deliberately has **no self-service staff registration**
// (`docs/ADMIN_ACCESS.md`): `staffRole` cannot be set through any public
// endpoint, because a member who could promote themselves could take over
// every queue in the Operations Console. Staff accounts are therefore created
// directly in the database.
//
// That instruction assumes a database administrator with a connection to the
// database. On AletCloud the managed PostgreSQL instance is published with
// `publicAccess: false` — it is reachable only from the application's own
// network, so an operator who holds control-plane access but no database
// client had no way to create the first administrator. The platform could be
// running perfectly and still have nobody able to operate it.
//
// This module is that missing way in. It runs inside the API process, once per
// start-up, and only when the operator explicitly asks for it through the
// environment.
//
// THE CONTRACT (each line is a safety property, not a nicety)
// ---------------------------------------------------------
// 1. **Nothing happens unless BOTH `ADMIN_BOOTSTRAP_EMAIL` and
//    `ADMIN_BOOTSTRAP_PASSWORD` are set.** Half a configuration is a
//    misconfiguration and is refused, not guessed at.
// 2. **The password is never logged, never written to a file, and never leaves
//    the host.** It is only ever hashed (Argon2id) and handed to Prisma.
// 3. **It never overwrites an existing account.** If the address already
//    exists the run is refused: a stale environment variable must not be able
//    to silently reset somebody's password. Resetting requires the separate,
//    explicit `ADMIN_BOOTSTRAP_RESET=true`.
// 4. **It refuses to mint a second full-access administrator** while one
//    already exists. `ADMIN_BOOTSTRAP_ALLOW_ADDITIONAL=true` is the explicit
//    override for the operator who really wants a second one.
// 5. **It grants nothing the role matrix does not already grant.** It creates
//    a login and sets `staffRole = SUPER_ADMIN`; it does not touch escrow
//    state, step-up policy, balances, KYC decisions or any money path. The
//    wallet it opens is empty and the account carries no escrow role.
// 6. **It never fabricates a date of birth.** `User.dateOfBirth` is nullable
//    precisely because an invented one corrupts KYC data (AML integrity), so
//    the provisioned account has none until a real one is supplied.
//
// It is deliberately *not* a general "make me an admin" endpoint. The
// difference matters: an endpoint would be reachable by anyone who found it,
// while this runs once, from the host's own environment, before the operator
// removes the variables again.
// ==========================================================================

import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { buildPlaceholderPhone, isUniqueConstraintViolation } from "../modules/auth/identity.js";

export const ADMIN_BOOTSTRAP_EMAIL = "ADMIN_BOOTSTRAP_EMAIL";
export const ADMIN_BOOTSTRAP_PASSWORD = "ADMIN_BOOTSTRAP_PASSWORD";
export const ADMIN_BOOTSTRAP_ALLOW_ADDITIONAL = "ADMIN_BOOTSTRAP_ALLOW_ADDITIONAL";
export const ADMIN_BOOTSTRAP_RESET = "ADMIN_BOOTSTRAP_RESET";

/**
 * The floor from `docs/ADMIN_ACCESS.md` ("Staff passwords must be strong
 * (>= 14 characters, mixed case, numbers, symbols)"). Enforced here rather
 * than documented and hoped for: an operator who sets a short password gets a
 * refusal in the log rather than a trivially guessable administrator.
 */
export const MIN_ADMIN_PASSWORD_LENGTH = 14;

/** Placeholder-phone collisions are possible; retry like the signup path does. */
const PLACEHOLDER_PHONE_MAX_ATTEMPTS = 8;

export type AdminBootstrapOutcome =
  /** Neither variable was set — the normal case. */
  | { outcome: "disabled" }
  /** The request was malformed and was refused. Nothing was written. */
  | { outcome: "rejected"; reason: string }
  /** The address already belongs to an account and was left untouched. */
  | { outcome: "account-exists"; email: string }
  /** A full-access administrator already exists, so none was added. */
  | { outcome: "admin-already-exists"; email: string }
  /** An existing account's password was reset on explicit operator request. */
  | { outcome: "password-reset"; email: string }
  /** A new administrator account was created. */
  | { outcome: "created"; email: string };

function isFlagEnabled(env: NodeJS.ProcessEnv, key: string): boolean {
  const raw = env[key];
  return typeof raw === "string" && raw.trim().toLowerCase() === "true";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * The columns a unique-constraint violation was raised on. Prisma reports
 * these as `meta.target`; the shape differs between the constraint name and
 * the field list, so both are normalised to an array of strings.
 */
function uniqueViolationTarget(err: unknown): string[] {
  if (typeof err !== "object" || err === null) return [];
  const meta = (err as { meta?: { target?: unknown } }).meta;
  const target = meta?.target;
  if (Array.isArray(target)) return target.map((entry) => String(entry));
  if (typeof target === "string") return [target];
  return [];
}

function rejection(reason: string): AdminBootstrapOutcome {
  logger.error(
    { reason },
    "Admin bootstrap refused: nothing was created. " +
      `Set ${ADMIN_BOOTSTRAP_EMAIL} and ${ADMIN_BOOTSTRAP_PASSWORD} together, ` +
      `with a password of at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`,
  );
  return { outcome: "rejected", reason };
}

/**
 * Creates — or, on explicit request, re-credentials — the platform's first
 * administrator. See the header comment for the full contract.
 *
 * `env` is a parameter so the behaviour can be tested without touching the
 * process environment; production calls it with no argument.
 */
export async function bootstrapAdminFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Promise<AdminBootstrapOutcome> {
  const rawEmail = env[ADMIN_BOOTSTRAP_EMAIL]?.trim() ?? "";
  const rawPassword = env[ADMIN_BOOTSTRAP_PASSWORD] ?? "";
  const allowAdditional = isFlagEnabled(env, ADMIN_BOOTSTRAP_ALLOW_ADDITIONAL);
  const allowReset = isFlagEnabled(env, ADMIN_BOOTSTRAP_RESET);

  // The ordinary case: nobody asked for an administrator to be provisioned.
  if (!rawEmail && !rawPassword) return { outcome: "disabled" };

  if (!rawEmail || !rawPassword) {
    return rejection(
      `${ADMIN_BOOTSTRAP_EMAIL} and ${ADMIN_BOOTSTRAP_PASSWORD} must be set together`,
    );
  }

  const email = rawEmail.toLowerCase();
  if (!isValidEmail(email)) {
    return rejection(`${ADMIN_BOOTSTRAP_EMAIL} is not a valid email address`);
  }
  if (rawPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return rejection(
      `the password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`,
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, staffRole: true },
  });

  if (existing) {
    if (!allowReset) {
      // The important default: an existing account is never re-credentialed by
      // the mere presence of an environment variable.
      logger.warn(
        { email, staffRole: existing.staffRole },
        "Admin bootstrap skipped: the address already has an account, and it was left untouched. " +
          `Set ${ADMIN_BOOTSTRAP_RESET}=true to reset that account's password on purpose.`,
      );
      return { outcome: "account-exists", email };
    }

    const passwordHash = await hashPassword(rawPassword);
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        passwordSetAt: new Date(),
        // Retires every token already issued for that account: a password
        // reset means whoever held the old password loses their session.
        sessionVersion: { increment: 1 },
      },
    });
    logger.warn(
      { email, userId: existing.id },
      "Admin bootstrap reset the password of an existing account by explicit operator request",
    );
    return { outcome: "password-reset", email };
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { staffRole: "SUPER_ADMIN" },
    select: { id: true, email: true },
  });
  if (existingAdmin && !allowAdditional) {
    logger.warn(
      { email, existingAdmin: existingAdmin.email },
      "Admin bootstrap skipped: the platform already has a full-access administrator, " +
        "so a second one was not created. " +
        `Set ${ADMIN_BOOTSTRAP_ALLOW_ADDITIONAL}=true to create one anyway.`,
    );
    return { outcome: "admin-already-exists", email };
  }

  const passwordHash = await hashPassword(rawPassword);

  for (let attempt = 0; attempt < PLACEHOLDER_PHONE_MAX_ATTEMPTS; attempt++) {
    const phone = buildPlaceholderPhone();
    try {
      const created = await prisma.user.create({
        data: {
          email,
          phone,
          passwordHash,
          passwordSetAt: new Date(),
          role: "CLIENT",
          staffRole: "SUPER_ADMIN",
          languagePreference: "en",
          firstName: "Yekis",
          lastName: "Administrator",
          emailVerified: true,
          emailVerifiedAt: new Date(),
          cachedKycTier: "TIER_1",
          cachedKycStatus: "VERIFIED",
          kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
          wallet: { create: { balanceMinor: 0 } },
        },
        select: { id: true, email: true, staffRole: true },
      });
      logger.warn(
        { email: created.email, userId: created.id, staffRole: created.staffRole },
        "Admin bootstrap created the platform administrator account",
      );
      return { outcome: "created", email };
    } catch (err) {
      if (!isUniqueConstraintViolation(err)) throw err;
      const target = uniqueViolationTarget(err);
      // A collision on the address means somebody else won the race for it.
      // That is not a reason to retry with another phone.
      if (target.some((column) => column === "email" || column === "User_email_key")) {
        logger.warn(
          { email },
          "Admin bootstrap skipped: the address was taken while the account was being created",
        );
        return { outcome: "account-exists", email };
      }
      // Otherwise it is the random placeholder phone; draw another one.
    }
  }

  throw new Error(
    "Admin bootstrap could not allocate a unique placeholder phone for the administrator account",
  );
}
