import { InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";

export interface PaginationOptions {
  baseAction: string;
  page: number;
  totalPages: number;
  showBack?: boolean;
  backAction?: string;
}

/**
 * Create a pagination keyboard with prev/next buttons
 */
export function createPaginationKeyboard(
  ctx: BotContext,
  options: PaginationOptions,
): InlineKeyboard {
  const {
    baseAction,
    page,
    totalPages,
    showBack = true,
    backAction = "menu:main",
  } = options;
  const kb = new InlineKeyboard();

  // Previous page
  if (page > 0) {
    kb.text(ctx.t("back"), `${baseAction}:page:${page - 1}`);
  }

  // Current page indicator (non-clickable)
  kb.text(`${page + 1} / ${totalPages}`, "noop");

  // Next page
  if (page < totalPages - 1) {
    kb.text(ctx.t("next"), `${baseAction}:page:${page + 1}`);
  }

  kb.row();

  // Back button
  if (showBack) {
    kb.text(ctx.t("back"), backAction);
  }

  return kb;
}

/**
 * Calculate pagination metadata
 */
export function getPaginationMeta(
  totalItems: number,
  page: number,
  pageSize: number,
): { totalPages: number; hasNext: boolean; hasPrev: boolean; offset: number } {
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;
  const offset = page * pageSize;
  return { totalPages, hasNext, hasPrev, offset };
}

/**
 * Create a simple prev/next keyboard for inline lists
 */
export function createSimplePagination(
  ctx: BotContext,
  baseAction: string,
  page: number,
  hasNext: boolean,
  backAction = "menu:main",
): InlineKeyboard {
  const kb = new InlineKeyboard();

  if (page > 0) {
    kb.text(ctx.t("back"), `${baseAction}:page:${page - 1}`);
  }
  if (hasNext) {
    kb.text(ctx.t("next"), `${baseAction}:page:${page + 1}`);
  }
  kb.row().text(ctx.t("back"), backAction);
  return kb;
}
