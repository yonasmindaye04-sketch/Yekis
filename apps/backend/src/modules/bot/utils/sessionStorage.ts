import { StorageAdapter } from "grammy";
import { BotSession, SESSION_VERSION } from "../types.js";
import { redis } from "../../../lib/redis.js";
import { logger } from "../../../lib/logger.js";

const SESSION_TTL_SECONDS = 86400; // 24 hours
const SESSION_KEY_PREFIX = "bot:session:";

function sessionKey(id: string): string {
  return `${SESSION_KEY_PREFIX}${id}`;
}

function createInitialSession(): BotSession {
  return {
    version: SESSION_VERSION,
    telegramUserId: 0,
    telegramChatId: 0,
    language: "en",
    notificationSettings: {
      jobs: true,
      proposals: true,
      escrow: true,
      disputes: true,
      wallet: true,
      kyc: true,
    },
  };
}

export function createRedisSessionStorage(): StorageAdapter<BotSession> {
  return {
    async read(key: string): Promise<BotSession | undefined> {
      try {
        const data = await redis.get(sessionKey(key));
        if (!data) return undefined;

        const parsed = JSON.parse(data) as BotSession;

        // Version migration
        if (parsed.version !== SESSION_VERSION) {
          logger.info({ key, oldVersion: parsed.version, newVersion: SESSION_VERSION }, "Migrating session version");
          return migrateSession(parsed);
        }

        return parsed;
      } catch (error) {
        logger.error({ error, key }, "Failed to get session from Redis");
        return undefined;
      }
    },

    async write(key: string, value: BotSession): Promise<void> {
      try {
        const sessionWithVersion = {
          ...value,
          version: SESSION_VERSION,
        };
        await redis.set(sessionKey(key), JSON.stringify(sessionWithVersion), "EX", SESSION_TTL_SECONDS);
      } catch (error) {
        logger.error({ error, key }, "Failed to set session in Redis");
      }
    },

    async delete(key: string): Promise<void> {
      try {
        await redis.del(sessionKey(key));
      } catch (error) {
        logger.error({ error, key }, "Failed to delete session from Redis");
      }
    },
  };
}

function migrateSession(oldSession: BotSession): BotSession {
  const initial = createInitialSession();

  // Preserve important fields during migration
  return {
    ...initial,
    telegramUserId: oldSession.telegramUserId,
    telegramChatId: oldSession.telegramChatId,
    userId: oldSession.userId,
    role: oldSession.role,
    kycTier: oldSession.kycTier,
    kycStatus: oldSession.kycStatus,
    staffRole: oldSession.staffRole,
    language: oldSession.language,
    notificationSettings: oldSession.notificationSettings ?? initial.notificationSettings,
  };
}

export function createInitialSessionData(): BotSession {
  return createInitialSession();
}
