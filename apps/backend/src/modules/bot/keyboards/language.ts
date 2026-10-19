import { InlineKeyboard } from "grammy";

export function languageKeyboard(prefix = "lang"): InlineKeyboard {
  return new InlineKeyboard()
    .text("🇬🇧 English", `${prefix}:en`)
    .text("🇪🇹 አማርኛ", `${prefix}:am`)
    .row()
    .text("🇪🇹 Afaan Oromoo", `${prefix}:om`)
    .text("🇪🇹 ትግርኛ", `${prefix}:ti`);
}
