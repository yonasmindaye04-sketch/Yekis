/**
 * Shared connection-target guard for backend CLI scripts.
 *
 * Ensures destructive or development-only scripts cannot silently run against a
 * hosted database when `DATABASE_URL` points outside localhost.
 */
export interface ParsedDatabaseTarget {
  host: string;
  databaseName: string;
  isLocalHost: boolean;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function parseDatabaseTarget(
  rawUrl = process.env.DATABASE_URL,
): ParsedDatabaseTarget {
  if (!rawUrl || !rawUrl.trim()) {
    throw new Error("DATABASE_URL is not set; refusing to connect.");
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL; refusing to connect.");
  }
  const host = parsed.hostname.toLowerCase();
  const databaseName = parsed.pathname.replace(/^\//, "");
  return {
    host,
    databaseName,
    isLocalHost: LOCAL_HOSTS.has(host),
  };
}

export function assertLocalDatabaseTarget(options?: {
  allowRemote?: boolean;
  allowedDbNames?: readonly string[];
  forbidProduction?: boolean;
  forbidStaging?: boolean;
  scriptName?: string;
}): ParsedDatabaseTarget {
  const label = options?.scriptName ?? "script";
  const nodeEnv = (process.env.NODE_ENV ?? "").trim().toLowerCase();
  if (options?.forbidProduction !== false && nodeEnv === "production") {
    throw new Error(`Refusing to run ${label} when NODE_ENV=production.`);
  }
  if (options?.forbidStaging && nodeEnv === "staging") {
    throw new Error(`Refusing to run ${label} when NODE_ENV=staging.`);
  }

  const target = parseDatabaseTarget(process.env.DATABASE_URL);
  if (!target.isLocalHost && !options?.allowRemote) {
    throw new Error(
      `Refusing to run ${label} against non-local host "${target.host}" without --allow-remote.`,
    );
  }
  if (
    options?.allowedDbNames &&
    !options.allowedDbNames.includes(target.databaseName)
  ) {
    throw new Error(
      `Refusing to run ${label}: database "${target.databaseName}" must be one of [${options.allowedDbNames.join(", ")}].`,
    );
  }
  return target;
}
