// === IMPORTS ===
import pino, { type Logger, type DestinationStream } from "pino";
import { env } from "../config/env.js";

/**
 * Key names whose VALUES are always replaced with [REDACTED], at any depth.
 *
 * Lower-cased for comparison so `accessToken`, `access_token` and
 * `AccessToken` are all caught.
 */
const SECRET_KEYS = new Set([
  // Telegram signed payloads are bearer credentials: anyone holding one can
  // impersonate the member until it expires.
  "initdata",
  "init_data",
  "initdataunsafe",
  "hash",
  // OAuth / PKCE.
  "verifier",
  "code_verifier",
  "codeverifier",
  "challenge",
  "code_challenge",
  "idtoken",
  "accesstoken",
  "refreshtoken",
  // Session identifiers and one-time codes.
  "sid",
  "token",
  "code",
  "otp",
  "otpcode",
  "authcode",
  // Credentials.
  "password",
  "passwordhash",
  "currentpassword",
  "newpassword",
  "secret",
  "clientsecret",
  "tokenhash",
  "codehash",
  // Bot + webhook secrets, in case they are ever logged by name.
  "bottoken",
  "telegram_bot_token",
  "telegram_webhook_secret",
  "jwt_access_secret",
  "jwt_refresh_secret",
]);

/**
 * Header paths redacted by pino itself.
 *
 * Only the header cases are expressed as pino paths. Key-based redaction for
 * everything else is done by {@link scrubLogObject} instead, because pino's
 * wildcards do not cover arbitrary depth: `*.key` matches a key nested one
 * level down but NOT at the root of the object, and `**.key` is only honoured
 * as the final segment, so neither reaches `body.user.password`. Enumerating
 * every possible parent path is not a maintainable way to close that.
 */
const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers.set-cookie",
  "headers.authorization",
  "headers.cookie",
  "res.headers.set-cookie",
];

/**
 * Telegram bot token shape: `<digits>:<30+ chars of [A-Za-z0-9_-]>`.
 *
 * No leading `\b`: in a real leak the token is glued to the preceding path
 * segment (`https://api.telegram.org/bot<token>/getMe`), where 't' and the
 * first digit are both word characters, so no word boundary exists there and a
 * `\b`-anchored pattern would let the token through. `(?<!\d)` instead stops
 * the match from beginning part-way through a longer digit run.
 */
const BOT_TOKEN_RE = /(?<!\d)\d{4,}:[A-Za-z0-9_-]{30,}/g;

const MAX_DEPTH = 8;

/**
 * Removes a bot token from free text (error messages, URLs, stack traces).
 *
 * Needed because key-based redaction cannot see a secret embedded in a string
 * value: an axios error to api.telegram.org carries the token in the URL path,
 * and grammY embeds it in several error messages.
 */
export function redactText(input: string): string {
  return input.replace(BOT_TOKEN_RE, "[REDACTED_BOT_TOKEN]");
}

/**
 * Recursively redacts a value for logging: secret keys lose their value, and
 * every string is scanned for an embedded bot token.
 *
 * Depth is bounded so a cyclic or pathological structure cannot hang the
 * serialiser and cost us the whole log line.
 */
export function scrubLogValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[TRUNCATED]";
  if (typeof value === "string") return redactText(value);
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date || value instanceof Error) {
    return scrubLogValue({ ...(value as object) }, depth);
  }
  if (Array.isArray(value)) return value.map((v) => scrubLogValue(v, depth + 1));

  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(source)) {
    out[key] = SECRET_KEYS.has(key.toLowerCase())
      ? "[REDACTED]"
      : scrubLogValue(v, depth + 1);
  }
  return out;
}

/**
 * Builds a logger with the production redaction configuration.
 *
 * Exported as a factory so tests exercise the REAL options instead of a copy
 * that can silently drift from what ships.
 */
export function createLogger(destination?: DestinationStream): Logger {
  return pino(
    {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      base: undefined,
      redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
      serializers: {
        err: (v: unknown) => scrubLogValue(v) as object,
        error: (v: unknown) => scrubLogValue(v) as object,
      },
      hooks: {
        // Applied last, to the merged arguments of every logger call, so
        // `logger.info("...token...")` and deeply nested secrets are both
        // covered. `apply` preserves arity so `%o`/`%d` interpolation still
        // receives its arguments.
        logMethod(
          this: unknown,
          args: unknown[],
          method: (this: unknown, ...a: unknown[]) => void,
        ) {
          const scrubbed = args.map((a) =>
            typeof a === "string" ? redactText(a) : scrubLogValue(a),
          );
          return method.apply(this, scrubbed);
        },
      },
    },
    // pino 9 takes a stream directly as the second argument; the
    // `{ stream }` wrapper form is not supported and fails at write time.
    destination,
  );
}

export const logger: Logger = createLogger(
  env.NODE_ENV === "development"
    ? // Pretty output for local development only; in every other environment
      // this is plain JSON on stdout, which is what a log shipper wants.
      pinoPrettyStream()
    : undefined,
);

function pinoPrettyStream(): DestinationStream {
  // Required lazily: pino-pretty is a devDependency and must never be pulled
  // into a production image.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pretty = require("pino-pretty");
  return pretty({ colorize: true }) as DestinationStream;
}
