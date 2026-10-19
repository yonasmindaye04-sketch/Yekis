import { BotContext } from "../types.js";
import { resolve } from "path";
import * as fs from "fs";

const localeCandidates = [
  resolve(process.cwd(), "src/modules/bot/locales"),
  resolve(process.cwd(), "apps/backend/src/modules/bot/locales"),
];
const localesDir = localeCandidates.find((dir) => fs.existsSync(dir)) ?? localeCandidates[0]!;

// Load JSON locales synchronously
const locales: Record<string, Record<string, string>> = {};
const supportedLangs = ["en", "am", "om", "ti"] as const;
type SupportedLang = typeof supportedLangs[number];

try {
  for (const lang of supportedLangs) {
    const p = resolve(localesDir, `${lang}.json`);
    if (fs.existsSync(p)) {
      locales[lang] = JSON.parse(fs.readFileSync(p, "utf8"));
    }
  }
} catch (e) {
  console.error("Failed to load JSON locales", e);
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
    const locale = (ctx.session?.language || "en") as SupportedLang;

    // Inject ctx.t
    ctx.t = (key: string, params?: Record<string, any>) => {
      return getBotTranslation(locale, key, params);
    };

    // Inject ctx.i18n
    ctx.i18n = {
      t: (key: string, params?: Record<string, any>) => getBotTranslation(locale, key, params),
      setLocale: async (lang: SupportedLang) => {
        if (ctx.session) ctx.session.language = lang;
      },
      locale: () => ctx.session?.language || "en",
    } as any;

    await next();
  };
}
