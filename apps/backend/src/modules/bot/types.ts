import { SessionFlavor } from "grammy";
import { ConversationFlavor } from "@grammyjs/conversations";
import { I18nFlavor } from "@grammyjs/i18n";
import type { StaffRole } from "@prisma/client";

export const SESSION_VERSION = 1;
export const SCENE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface BotSession {
  version: number;
  /**
   * Telegram identifiers are stored as STRINGS, never numbers.
   *
   * grammY delivers `ctx.from.id` as a JS number and Prisma wants a BigInt;
   * storing the intermediate as `number` is what created the H7 hazard. A
   * number cannot represent every integer exactly above 2^53, and a BigInt
   * throws when serialised. A decimal string is exact, JSON-native, and
   * converts back with `BigInt(s)` at the boundary.
   *
   * Empty string means "not yet resolved" — do NOT use 0, which is falsy in
   * the same places but reads like a real id.
   */
  telegramUserId: string;
  telegramChatId: string;
  userId?: string;
  // Set when identity resolution deliberately refused to bind this Telegram
  // account (e.g. the synthetic address belongs to a password-owned account).
  // /start reads it to explain the fix instead of failing silently.
  loginBlocked?: string;
  // Rate-limit bookkeeping for /login so a member cannot orphan a stream of
  // outstanding codes. Epoch seconds.
  codeIssuedAt?: number;
  role?: "CLIENT" | "FREELANCER" | "BOTH" | "STAFF";
  kycTier?: "TIER_1" | "TIER_2" | "TIER_3";
  kycStatus?: "VERIFIED" | "PENDING" | "REJECTED" | "UNDER_REVIEW";
  staffRole?: StaffRole;
  language: "en" | "am";
  scene?: string;
  sceneStep?: number;
  sceneData?: Record<string, any>;
  sceneStartedAt?: number;
  currentMenu?: string;
  pagination?: { type: string; page: number; filters: any };
  notificationSettings?: {
    jobs: boolean;
    proposals: boolean;
    escrow: boolean;
    disputes: boolean;
    wallet: boolean;
    kyc: boolean;
  };
}

// Use a separate context type to avoid circular reference
export interface BotSessionContext extends SessionFlavor<BotSession> {
  i18n: {
    t: (key: string, params?: Record<string, any>) => string;
    locale: "en" | "am";
    setLocale: (locale: "en" | "am") => Promise<void>;
  };
}

export type BotContext = ConversationFlavor<
  Context & SessionFlavor<BotSession> & I18nFlavor
>;

import { Context } from "grammy";

declare module "grammy" {
  interface Context {
    i18n: {
      t: (key: string, params?: Record<string, any>) => string;
      locale: "en" | "am";
      setLocale: (locale: "en" | "am") => Promise<void>;
    };
  }
}

export interface NotificationEvent {
  type: string;
  category: keyof BotSession["notificationSettings"];
  data: Record<string, any>;
  deepLink?: string;
}

export interface PaginationState {
  type: string;
  page: number;
  filters: Record<string, any>;
  totalPages?: number;
}
