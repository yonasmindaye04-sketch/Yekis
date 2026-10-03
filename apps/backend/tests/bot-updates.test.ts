import { describe, it, expect, afterAll } from "vitest";
import { createBot } from "../src/modules/bot/bot.service.js";
import { prisma } from "../src/lib/prisma.js";

/**
 * Regression cover for the bot failing every update with
 * "Something went wrong. Please try again."
 *
 * grammY derives the session key from the originating chat. An update without
 * one (inline-mode callback query) makes merely READING ctx.session throw
 * "Cannot access session data because this update does not belong to a chat".
 * Because logging, rate-limit, scene-timeout and auth all read the session, that
 * single throw aborted the whole chain and the member only ever saw the generic
 * apology.
 *
 * These tests drive the REAL bot through bot.handleUpdate with the real
 * middleware stack.
 */

const TG_ID = 934567893;

function buildBot() {
  const bot = createBot();
  (bot as any).botInfo = {
    id: 8967646633,
    is_bot: true,
    first_name: "Yekis Jobs",
    username: "ye_kis_bot",
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
  };
  return bot;
}

type Capture = { replies: string[]; alerts: string[]; errors: string[] };

/** Installs a no-network API stub and an error recorder. */
function instrument(bot: ReturnType<typeof buildBot>): Capture {
  const capture: Capture = { replies: [], alerts: [], errors: [] };

  bot.api.config.use(async (prev: any, method: string, payload: any) => {
    if (method === "sendMessage" || method === "editMessageText") {
      capture.replies.push(String(payload.text ?? ""));
      return { ok: true, result: { message_id: capture.replies.length } } as any;
    }
    if (method === "answerCallbackQuery") {
      if (payload.text) capture.alerts.push(String(payload.text));
      return { ok: true, result: true } as any;
    }
    if (method === "answerInlineQuery") {
      return { ok: true, result: true } as any;
    }
    return prev(method, payload);
  });

  // Replace the production handler so the assertion can see the raw error.
  bot.catch(async (err: any) => {
    capture.errors.push(`${err.error?.name}: ${err.error?.message ?? "unknown"}`);
  });

  return capture;
}

const base = {
  date: Math.floor(Date.now() / 1000),
  chat: { id: TG_ID, type: "private", first_name: "Tester" },
  from: { id: TG_ID, is_bot: false, first_name: "Tester", language_code: "en" },
};

const messageUpdate = (text: string, id: number) =>
  ({
    update_id: id,
    message: {
      ...base,
      message_id: id,
      text,
      entities: [{ type: "bot_command", offset: 0, length: text.length }],
    },
  }) as any;

const callbackUpdate = (data: string, id: number, withChat = true) =>
  ({
    update_id: id,
    callback_query: {
      ...base,
      id: String(id),
      ...(withChat
        ? { message: { ...base, message_id: 999, text: "screen" } }
        : {}),
      data,
      chat_instance: "ci",
    },
  }) as any;

/** Inline-mode callback query: has `from` but NO chat, so no session key. */
const inlineCallbackUpdate = (data: string, id: number) =>
  ({
    update_id: id,
    inline_message_id: "inline-abc",
    callback_query: {
      id: String(id),
      from: { id: TG_ID, is_bot: false, first_name: "Tester" },
      data,
      chat_instance: "ci",
    },
  }) as any;

const run = (bot: any, update: any) =>
  Promise.race([
    bot.handleUpdate(update),
    new Promise((r) => setTimeout(() => r("STALLED"), 15_000)),
  ]);

let uid = 1000;
const nextId = () => ++uid;

describe("Telegram bot update handling", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("answers /start and provisions the member", async () => {
    const bot = buildBot();
    const cap = instrument(bot);

    await run(bot, messageUpdate("/start", nextId()));

    expect(cap.errors).toEqual([]);
    expect(cap.replies.join(" ")).toContain("Welcome to Yekis Jobs");
    // A usable web sign-in code must be surfaced.
    expect(cap.replies.join(" ")).toMatch(/`[23456789A-Z]{8}`/);

    const row = await prisma.user.findUnique({
      where: { telegramUserId: BigInt(TG_ID) },
      select: { id: true },
    });
    expect(row).not.toBeNull();
  });

  it("answers every command a member can reach from /start", async () => {
    const bot = buildBot();
    const cap = instrument(bot);

    for (const cmd of ["/start", "/menu", "/jobs", "/wallet", "/kyc", "/contracts", "/disputes", "/settings", "/notifications", "/account", "/help", "/language"]) {
      const before = cap.errors.length;
      cap.replies.length = 0;
      await run(bot, messageUpdate(cmd, nextId()));
      expect(cap.errors.slice(before), `${cmd} threw`).toEqual([]);
    }
  });

  it("does not throw on any callback the keyboards can emit", async () => {
    const bot = buildBot();
    const cap = instrument(bot);
    await run(bot, messageUpdate("/start", nextId()));

    const PAYLOADS = [
      "menu:main", "menu:jobs", "menu:my_jobs", "menu:proposals",
      "menu:contracts", "menu:wallet", "menu:kyc", "menu:disputes",
      "menu:notifications", "menu:settings", "menu:help", "menu:staff",
      "lang:en", "lang:am",
      "settings:language", "settings:notifications", "settings:privacy",
      "settings:lang:en", "settings:notif:jobs:off",
      "wallet:withdraw", "wallet:topup", "wallet:transactions", "wallet:history",
      "kyc:upload:id", "kyc:upload:selfie", "kyc:upload:tin", "kyc:upload:business",
      "jobs:filter:clear", "jobs:page:1", "jobs:filter:category:web",
      "jobs:filter:budget:100", "jobs:filter:sort:new",
      "auth:new_code", "withdraw:confirm:yes", "withdraw:confirm:no",
      "topup:upload", "propose:confirm:yes", "proposal:accept:p1",
      "proposal:shortlist:p1", "proposal:reject:p1", "proposal:view:p1",
      "proposal:withdraw:p1", "contract:sign:c1", "contract:view:c1",
      "contract:fund:c1", "contract:deliver:c1", "contract:dispute:c1",
      "contract:mediate:c1", "milestone:fund:m1", "milestone:deliver:m1",
      "milestone:accept:m1", "milestone:dispute:m1", "milestone:view:m1",
      "dispute:evidence:d1", "dispute:negotiate:d1", "dispute:escalate:d1",
      "dispute:accept:d1", "dispute:arbitrate:d1", "dispute:cat:x",
      "dispute:confirm:yes", "noop",
    ];

    for (const data of PAYLOADS) {
      const before = cap.errors.length;
      await run(bot, callbackUpdate(data, nextId()));
      expect(cap.errors.slice(before), `callback "${data}" threw`).toEqual([]);
    }
  });

  // The original crash. An inline-mode callback query has no chat, so grammY
  // has no session key and reading ctx.session throws.
  it("survives an inline-mode callback query instead of failing every handler", async () => {
    const bot = buildBot();
    const cap = instrument(bot);

    const result = await run(bot, inlineCallbackUpdate("menu:main", nextId()));

    expect(result).not.toBe("STALLED");
    expect(cap.errors).toEqual([]);
    expect(cap.errors.join(" ")).not.toMatch(/session key is undefined/i);
    // Inline mode has no chat to reply into, so the only channel is a callback
    // alert — which is what Telegram can actually render there.
    expect(cap.alerts.join(" ")).toMatch(/send \/start|inside our chat/i);
  });

  it("survives an inline query", async () => {
    const bot = buildBot();
    const cap = instrument(bot);

    await run(
      bot,
      {
        update_id: nextId(),
        inline_query: {
          id: "iq-1",
          from: { id: TG_ID, is_bot: false, first_name: "Tester" },
          query: "",
          offset: "",
        },
      } as any,
    );

    expect(cap.errors).toEqual([]);
  });
});