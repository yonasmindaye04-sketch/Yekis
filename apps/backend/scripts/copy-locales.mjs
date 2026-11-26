import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copy the Telegram bot's locale JSON files into the compiled backend.
 *
 * TypeScript only emits the .ts files it compiles. The locale dictionaries are
 * runtime data loaded with fs.readFileSync(), so without this step a Docker
 * image that contains only apps/backend/dist has no translations at all.
 *
 * That failure is especially deceptive: ctx.t() falls back to the key, so a
 * command can still reach Telegram, but a Markdown reply such as
 * "help_commands" is rejected as malformed entity syntax. grammY then turns
 * the failed sendMessage into a webhook error, Telegram retries the same
 * update, and the member receives nothing.
 *
 * The catalogues are validated before they are copied. A missing dictionary,
 * malformed JSON, a non-string value, or a language with a different key set
 * fails the image build instead of producing another subtly broken bot.
 */
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = resolve(backendRoot, "src/modules/bot/locales");
const targetDir = resolve(backendRoot, "dist/modules/bot/locales");
const localeNames = ["en", "am", "om", "ti"];

const catalogues = new Map();

for (const locale of localeNames) {
  const path = resolve(sourceDir, `${locale}.json`);
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read Telegram bot locale ${path}`, { cause: error });
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Telegram bot locale ${path} must contain a JSON object`);
  }

  const invalidValue = Object.entries(parsed).find(([, value]) => typeof value !== "string");
  if (invalidValue) {
    throw new Error(
      `Telegram bot locale ${path} has a non-string value for key ${invalidValue[0]}`,
    );
  }

  catalogues.set(locale, parsed);
}

const englishKeys = Object.keys(catalogues.get("en")).sort();
for (const locale of localeNames) {
  const keys = Object.keys(catalogues.get(locale)).sort();
  const missing = englishKeys.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !englishKeys.includes(key));
  if (missing.length || extra.length) {
    throw new Error(
      `Telegram bot locale ${locale}.json has a different key set from en.json ` +
        `(missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"})`,
    );
  }
}

// Remove the old target first so a renamed or deleted locale cannot survive as
// stale runtime data in a local dist directory.
await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });

console.log(
  `Copied ${localeNames.length} Telegram bot locales (${englishKeys.length} keys each) to ${targetDir}`,
);
