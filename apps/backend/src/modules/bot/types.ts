import { SessionFlavor } from "grammy";
import { ConversationFlavor } from "@grammyjs/conversations";
import { I18nFlavor } from "@grammyjs/i18n";
import type { StaffRole } from "@prisma/client";

export const SESSION_VERSION = 1;
export const SCENE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface BotSession {
  version: number;
  telegramUserId: number;
  telegramChatId: number;
  userId?: string;
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
