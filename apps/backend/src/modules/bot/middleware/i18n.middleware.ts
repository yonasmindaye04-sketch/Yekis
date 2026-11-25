import { BotContext } from "../types.js";
import { resolve } from "node:path";
import * as fs from "node:fs";
import { logger } from "../../../lib/logger.js";

// The backend compiles to CommonJS, so `__dirname` is the directory of THIS
// file — `src/modules/bot/middleware` in development and
// `dist/modules/bot/middleware` in the built image. It is undefined when the
// file is loaded as an ES module (the test runner), which is why the
// working-directory candidates below exist as well.
const moduleDir = typeof __dirname === "string" ? __dirname : undefined;

const localeCandidates = [
  // This candidate works in BOTH source and compiled layouts:
  //   src/modules/bot/middleware/../locales
  //   dist/modules/bot/middleware/../locales
  // The backend build copies the JSON dictionaries into dist, so the Docker
  // runtime does not depend on its working directory or on source files.
  ...(moduleDir ? [resolve(moduleDir, "../locales")] : []),
  resolve(process.cwd(), "src/modules/bot/locales"),
  resolve(process.cwd(), "apps/backend/src/modules/bot/locales"),
  resolve(process.cwd(), "apps/backend/dist/modules/bot/locales"),
];

// Load JSON locales synchronously.
//
// EVERY candidate directory is read, not just the first one that exists: a
// deployment may ship the dictionaries in dist while the source tree is
// absent (or the other way round), and a partial set in one place must not
// shadow a complete set in another.
const locales: Record<string, Record<string, string>> = {};
const supportedLangs = ["en", "am", "om", "ti"] as const;
type SupportedLang = typeof supportedLangs[number];

const localeDirs = localeCandidates.filter((dir) => fs.existsSync(dir));

for (const dir of localeDirs) {
  for (const lang of supportedLangs) {
    const p = resolve(dir, `${lang}.json`);
    if (!fs.existsSync(p)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(p, "utf8")) as Record<
        string,
        string
      >;
      locales[lang] = { ...parsed, ...(locales[lang] ?? {}) };
    } catch (e) {
      logger.error({ err: e, path: p }, "Failed to load a Telegram bot locale file");
    }
  }
}

/**
 * A missing dictionary is not a cosmetic problem.
 *
 * With no translations loaded, every reply is the raw translation KEY. A key
 * such as "help_commands" contains an underscore, which Telegram's Markdown
 * parser reads as an italic delimiter, so the answer is rejected as
 * malformed, the send throws, and the member receives nothing at all. The
 * failure therefore looks like "the bot is dead" rather than "the bot cannot
 * find its translations", so it is logged loudly at start-up.
 */
if (!locales.en || Object.keys(locales.en).length === 0) {
  logger.error(
    {
      candidates: localeCandidates,
      found: localeDirs,
    },
    "No Telegram bot translations were loaded - every reply would be sent as a raw translation key and rejected by Telegram",
  );
}

export function getBotTranslation(locale: string, key: string, params?: Record<string, any>): string {
  let str = locales[locale]?.[key] || locales["en"]?.[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}

export function i18nMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    const resolveLocale = (): SupportedLang => {
      const candidate = ctx.session?.language;
      return candidate && supportedLangs.includes(candidate as SupportedLang)
        ? (candidate as SupportedLang)
        : "en";
    };

    // Inject ctx.t so downstream authMiddleware language updates apply immediately
    ctx.t = (key: string, params?: Record<string, any>) => {
      return getBotTranslation(resolveLocale(), key, params);
    };

    // Inject ctx.i18n with a live locale getter matching types.ts
    const i18nObj = {
      t: (key: string, params?: Record<string, any>) =>
        getBotTranslation(resolveLocale(), key, params),
      setLocale: async (lang: SupportedLang) => {
        if (ctx.session) ctx.session.language = lang;
      },
      get locale(): SupportedLang {
        return resolveLocale();
      },
    };
    ctx.i18n = i18nObj as any;

    await next();
  };
}
