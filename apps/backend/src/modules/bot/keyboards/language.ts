import { InlineKeyboard } from "grammy";

export function languageKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(" English", "lang:en")
    .text(" አማርኛ", "lang:am");
}
