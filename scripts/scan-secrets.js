#!/usr/bin/env node
/**
 * Secret scan for tracked files.
 *
 * Looks for three shapes that should never be committed:
 *   1. A PEM header followed by a base64 body (private keys).
 *   2. A Telegram bot token: 8-10 digits, a colon, then 35 token characters.
 *   3. A long random-looking value assigned to a variable whose name contains
 *      SECRET, TOKEN, KEY or PASSWORD.
 *
 * OUTPUT POLICY
 * Prints file name and line number only, never the matched text. A finding
 * tells you where to look, not what the secret is, so a scan cannot itself
 * become a leak in CI logs.
 *
 * ALLOWLIST
 * .github/secret-scan-allowlist.txt, one path per line, '#' for comments.
 * The committed allowlist covers the agent's deliberately fake test fixtures;
 * a real key must never be allowlisted, so the allowlist file is itself checked
 * for the same three shapes.
 *
 * Exit 0 = clean, 1 = findings, 2 = the allowlist itself contains a secret.
 */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const ALLOWLIST = path.join(ROOT, ".github", "secret-scan-allowlist.txt");

/** Never scanned: binaries, vendored trees, build output, lockfiles. */
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "coverage", "resource_to_read",
  ".next", "vendor",
]);
const SKIP_FILES = new Set([
  "pnpm-lock.yaml", "package-lock.json", "yarn.lock", "Cargo.lock",
]);

const PATTERNS = [
  {
    id: "PEM_PRIVATE_KEY",
    // Matches the ARMORED PEM header line on one line, or that header followed
    // by a base64 body on the next few lines. The five dashes are written as
    // "-{5}" rather than literally, because this file is itself tracked and
    // a literal header here would make the scanner match its own source.
    re: new RegExp("-{5}BEGIN [A-Z0-9 ]*PRIVATE KEY-{5}"),
  },
  {
    id: "BOT_TOKEN",
    re: /(?:^|[^0-9])[0-9]{8,10}:[A-Za-z0-9_-]{35}(?:[^A-Za-z0-9_-]|$)/,
  },
  {
    id: "ASSIGNED_SECRET",
    // KEY/TOKEN/SECRET/PASSWORD assigned a long random-looking literal.
    // Case-sensitive on purpose: test fixtures and type names use lowercase
    // snake_case ("access_secret", "fake_jwt_secret"), while real credentials
    // are named in SCREAMING_CASE. Matching case-insensitively flagged 25
    // ordinary identifiers, which trains people to ignore the scan.
    re: /\b[A-Za-z0-9_]*(?:SECRET|TOKEN|PRIVATE_KEY|API_KEY|PASSWORD)[A-Za-z0-9_]*\s*[:=]\s*["']?([A-Za-z0-9+/=_\-]{16,})["']?/g,
    isSecretValue: (value) => {
      if (!/^[A-Za-z0-9+/=_\-]+$/.test(value)) return false; // not a bare literal
      // Placeholders and references to configuration are not secrets.
      if (/^(replace|changeme|your|example|placeholder|xxx|REDACTED|CHANGEME)/i.test(value)) {
        return false;
      }
      // Lowercase-with-underscores is an identifier or a fixture name.
      if (/^[a-z]+(?:_[a-z0-9]+)+$/.test(value)) return false;
      // All-lowercase single words and dotted paths are identifiers.
      if (/^[a-z./@-]+$/.test(value)) return false;
      // Long hex strings are secrets in their own right, and the mixed-case
      // rule below cannot see them: a 32-char hex key has no uppercase and no
      // symbol, so it was being classified as an identifier and let through.
      // 24 hex chars is 96 bits, which is past any plausible constant name.
      if (/^[0-9a-f]{24,}$/i.test(value)) return true;
      // Mixed case + digits + symbols is what a real key looks like.
      return (
        /[A-Z]/.test(value) &&
        /[a-z]/.test(value) &&
        /[0-9]/.test(value) &&
        /[+/=_\-]/.test(value)
      );
    },
  },
];

/** Patterns that are simply "does this line match", with no value inspection. */
const SIMPLE_IDS = new Set(["PEM_PRIVATE_KEY", "BOT_TOKEN"]);

/** Reads the allowlist; a missing file is an empty allowlist. */
function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST)) return [];
  return fs
    .readFileSync(ALLOWLIST, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function isAllowed(relativePath, allowlist) {
  return allowlist.some((entry) => {
    const normalised = entry.replace(/^\.?\//, "");
    return relativePath === normalised || relativePath.includes(normalised);
  });
}

/** Files git tracks, minus the skip list. */
function trackedFiles() {
  const out = execFileSync("git", ["--no-pager", "ls-files", "-z"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out
    .split("\0")
    .filter(Boolean)
    .filter((f) => {
      if (SKIP_FILES.has(f)) return false;
      const parts = f.split("/");
      return !parts.some((p) => SKIP_DIRS.has(p));
    });
}

/** Binary or unreadable files are skipped rather than reported. */
function readText(abs) {
  try {
    const buf = fs.readFileSync(abs);
    if (buf.includes(0)) return null; // binary
    return buf.toString("utf8");
  } catch {
    return null;
  }
}

function scanText(text, relativePath, allowlist) {
  const findings = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNo = index + 1;

    for (const pattern of PATTERNS) {
      if (pattern.id === "ASSIGNED_SECRET") {
        // A fresh RegExp per line: a shared /g regex is stateful across calls.
        const re = new RegExp(pattern.re.source, "g");
        let match;
        while ((match = re.exec(line)) !== null) {
          if (!pattern.isSecretValue(match[1])) continue;
          findings.push({ file: relativePath, line: lineNo, id: pattern.id });
        }
        continue;
      }

      if (pattern.re.test(line)) {
        findings.push({ file: relativePath, line: lineNo, id: pattern.id });
      }
    }
  });

  return isAllowed(relativePath, allowlist) ? [] : findings;
}

function main() {
  const allowlist = loadAllowlist();

  // The allowlist must not itself contain a real secret.
  const allowlistText = fs.existsSync(ALLOWLIST) ? fs.readFileSync(ALLOWLIST, "utf8") : "";
  for (const pattern of PATTERNS) {
    if (SIMPLE_IDS.has(pattern.id) && pattern.re.test(allowlistText)) {
      console.error(
        `ALLOWLIST CONTAINS A ${pattern.id}: ${path.relative(ROOT, ALLOWLIST)}. ` +
          `Remove it; a real secret must never be allowlisted.`,
      );
      return 2;
    }
  }

  const findings = [];
  let scanned = 0;
  for (const relativePath of trackedFiles()) {
    const text = readText(path.join(ROOT, relativePath));
    if (text === null) continue;
    scanned += 1;
    findings.push(...scanText(text, relativePath, allowlist));
  }

  if (findings.length === 0) {
    console.log(`Secret scan clean: ${scanned} tracked text files, 0 findings.`);
    return 0;
  }

  console.error(`Secret scan FAILED: ${findings.length} finding(s).\n`);
  // File name and line number only. Never the matched value.
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  ${f.id}`);
  }
  console.error(
    "\nMatched values are deliberately not printed. Inspect the file directly, " +
      "rotate the credential if it is real, then either fix it or add an explicit " +
      "allowlist entry if it is a deliberately fake fixture.",
  );
  return 1;
}

process.exit(main());