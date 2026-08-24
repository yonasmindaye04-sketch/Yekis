import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { loginWithTelegram, TelegramAuthError, TelegramNotConfiguredError } from "../src/modules/auth/telegram.service.js";
import { env } from "../src/config/env.js";

function generateTestInitData(botToken: string, user: { id: number; first_name?: string; username?: string }) {
  const authDate = Math.floor(Date.now() / 1000).toString();
  const userJson = JSON.stringify(user);
  const queryId = "AAHdF6IQAAAAAN0XohDhrOrc";

  const params = new URLSearchParams();
  params.set("auth_date", authDate);
  params.set("query_id", queryId);
  params.set("user", userJson);

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  params.set("hash", hash);
  return params.toString();
}

describe("Telegram Authentication Service", () => {
  const testBotToken = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";

  it("throws TelegramNotConfiguredError when bot token is not configured", async () => {
    const originalToken = env.TELEGRAM_BOT_TOKEN;
    try {
      (env as Record<string, unknown>).TELEGRAM_BOT_TOKEN = undefined;
      const initData = "query_id=123&user={}&auth_date=1000&hash=abc";
      await expect(loginWithTelegram(initData)).rejects.toThrow(TelegramNotConfiguredError);
    } finally {
      (env as Record<string, unknown>).TELEGRAM_BOT_TOKEN = originalToken;
    }
  });

  it("rejects initData with missing hash", async () => {
    const originalToken = env.TELEGRAM_BOT_TOKEN;
    try {
      (env as Record<string, unknown>).TELEGRAM_BOT_TOKEN = testBotToken;
      const initData = "query_id=123&user=%7B%22id%22%3A12345%7D&auth_date=1000";
      await expect(loginWithTelegram(initData)).rejects.toThrow("Telegram initData is missing hash.");
    } finally {
      (env as Record<string, unknown>).TELEGRAM_BOT_TOKEN = originalToken;
    }
  });

  it("rejects initData with invalid signature/hash mismatch", async () => {
    const originalToken = env.TELEGRAM_BOT_TOKEN;
    try {
      (env as Record<string, unknown>).TELEGRAM_BOT_TOKEN = testBotToken;
      const fakeInitData = generateTestInitData("wrong_bot_token", { id: 987654, first_name: "Abebe" });
      await expect(loginWithTelegram(fakeInitData)).rejects.toThrow("Telegram initData signature is invalid.");
    } finally {
      (env as Record<string, unknown>).TELEGRAM_BOT_TOKEN = originalToken;
    }
  });

  it("successfully authenticates with valid Telegram initData signature and upserts user", async () => {
    const originalToken = env.TELEGRAM_BOT_TOKEN;
    try {
      (env as Record<string, unknown>).TELEGRAM_BOT_TOKEN = testBotToken;
      const telegramUser = { id: 88776655, first_name: "TestUser", username: "test_yekis" };
      const validInitData = generateTestInitData(testBotToken, telegramUser);

      const session = await loginWithTelegram(validInitData, "FREELANCER");
      expect(session).toBeDefined();
      expect(session.accessToken).toBeDefined();
      expect(session.user).toBeDefined();
      expect(session.user.email).toBe("telegram+88776655@yekis.local");
      expect(session.telegram.id).toBe(88776655);
      expect(session.telegram.firstName).toBe("TestUser");
    } finally {
      (env as Record<string, unknown>).TELEGRAM_BOT_TOKEN = originalToken;
    }
  });
});
