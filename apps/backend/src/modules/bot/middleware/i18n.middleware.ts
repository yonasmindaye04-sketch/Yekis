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
try {
  locales["en"] = JSON.parse(
    fs.readFileSync(resolve(localesDir, "en.json"), "utf8"),
  );
  locales["am"] = JSON.parse(
    fs.readFileSync(resolve(localesDir, "am.json"), "utf8"),
  );
} catch (e) {
  console.error("Failed to load JSON locales", e);
}

export function i18nMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    const locale = ctx.session?.language || "en";

    // Inject ctx.t
    ctx.t = (key: string, params?: Record<string, any>) => {
      let str = locales[locale]?.[key] || locales["en"]?.[key] || key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return str;
    };

    // Inject ctx.i18n.setLocale
    ctx.i18n = {
      setLocale: async (lang: "en" | "am") => {
        if (ctx.session) ctx.session.language = lang;
      },
      locale: () => ctx.session?.language || "en",
    } as any;

    await next();
  };
}
