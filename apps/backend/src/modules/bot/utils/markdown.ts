/**
 * Safe MarkdownV2 escaping for user-generated content
 * Telegram MarkdownV2 special chars: _ * [ ] ( ) ~ ` > # + - = | { } . !
 */
export function escapeMarkdownV2(text: string): string {
  if (!text) return "";
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

/**
 * Escape only the characters that are special in the current context
 * Use this for text that will be inside code blocks or pre-formatted sections
 */
export function escapeMarkdownMinimal(text: string): string {
  if (!text) return "";
  return text.replace(/[_*[\]()~`]/g, "\\$&");
}

/**
 * Bold text in MarkdownV2
 */
export function bold(text: string): string {
  return `*${escapeMarkdownV2(text)}*`;
}

/**
 * Italic text in MarkdownV2
 */
export function italic(text: string): string {
  return `_${escapeMarkdownV2(text)}_`;
}

/**
 * Inline code in MarkdownV2
 */
export function code(text: string): string {
  return `\`${text}\``;
}

/**
 * Code block in MarkdownV2
 */
export function codeBlock(text: string, language = ""): string {
  return `\`\`\`${language}\n${text}\n\`\`\``;
}

/**
 * Link in MarkdownV2
 */
export function link(text: string, url: string): string {
  return `[${escapeMarkdownV2(text)}](${url})`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || "";
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Format number with locale-aware formatting
 */
export function formatNumber(num: number, locale: "en" | "am" = "en"): string {
  return num.toLocaleString(locale === "am" ? "am-ET" : "en-US");
}

/**
 * Format ETB amount from minor units (cents)
 */
export function formatETB(minor: number, locale: "en" | "am" = "en"): string {
  return `${(minor / 100).toLocaleString(locale === "am" ? "am-ET" : "en-US", { minimumFractionDigits: 2 })} ETB`;
}

/**
 * Format date with locale
 */
export function formatDate(
  date: Date | string,
  locale: "en" | "am" = "en",
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(
    locale === "am" ? "am-ET" : "en-US",
    options || { year: "numeric", month: "short", day: "numeric" },
  );
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date | string,
  locale: "en" | "am" = "en",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  const t = {
    en: { min: "min", hour: "h", day: "d", justNow: "just now" },
    am: { min: "ደቂቃ", hour: "ሰዓት", day: "ቀን", justNow: "አሁን" },
  }[locale];

  if (diffMins < 1) return t.justNow;
  if (diffMins < 60) return `${diffMins} ${t.min}`;
  if (diffHours < 24) return `${diffHours} ${t.hour}`;
  if (diffDays < 7) return `${diffDays} ${t.day}`;
  return formatDate(d, locale);
}
