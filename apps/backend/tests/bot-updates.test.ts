import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { createBot } from "../src/modules/bot/bot.service.js";
import { prisma } from "../src/lib/prisma.js";
import { env } from "../src/config/env.js";
import { scopedDelete } from "./helpers/scopedDelete.js";

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

/**
 * The bot does NOT auto-provision (auth.middleware.ts: "C5: Strict Onboarding
 * - Do not auto-provision here"). A member must already exist or the bot answers
 * "You are not registered. Please sign in via the web."
 *
 * These tests therefore need a real member row for TG_ID. It used to be left
 * behind in the DEVELOPMENT database by earlier manual runs, so the suite only
 * passed when pointed at a database that already contained this exact Telegram
 * id — a hidden dependency that made it order- and run-dependent. It now seeds
 * its own member, so a clean database behaves identically.
 */
async function seedMember() {
  await prisma.user.create({
    data: {
      email: `telegram+${TG_ID}@yekis.local`,
      telegramUserId: BigInt(TG_ID),
      phone: `+25190${String(TG_ID).slice(-8)}`,
      passwordHash: "not-a-real-hash",
      role: "FREELANCER",
      firstName: "Tester",
      kyc: { create: { tier: "TIER_1", status: "PENDING" } },
      wallet: { create: { balanceMinor: 0 } },
    } as never,
  });
}

/**
 * Child rows created for the seeded member. Deleted before the user itself
 * because KycRecord/Wallet reference it with ON DELETE RESTRICT.
 */
async function removeMemberChildren(userId: string) {
  const children: Array<[string, Parameters<typeof scopedDelete>[0]]> = [
    ["telegramLoginCode", prisma.telegramLoginCode],
    ["notification", prisma.notification],
    ["auditLog", prisma.auditLog],
    ["transactionFlag", prisma.transactionFlag],
    ["consentRecord", prisma.consentRecord],
    ["conversationParticipant", prisma.conversationParticipant],
    ["featuredLog", prisma.featuredLog],
    ["portfolioItem", prisma.portfolioItem],
    ["userSkill", prisma.userSkill],
    ["passwordResetToken", prisma.passwordResetToken],
    ["walletTopUp", prisma.walletTopUp],
    ["payoutTransaction", prisma.payoutTransaction],
    ["kycRecord", prisma.kycRecord],
    ["wallet", prisma.wallet],
  ];
  for (const [name, delegate] of children) {
    await scopedDelete(delegate as never, { userId }, `bot-updates ${name}`);
  }
}

async function removeMember() {
  const existing = await prisma.user.findUnique({
    where: { telegramUserId: BigInt(TG_ID) },
    select: { id: true },
  });
  if (existing) {
    await removeMemberChildren(existing.id);
    await scopedDelete(prisma.user, { id: existing.id }, "bot-updates user");
  }
  // The legacy email identity is a fallback lookup in the same middleware.
  const legacy = await prisma.user.findUnique({
    where: { email: `telegram+${TG_ID}@yekis.local` },
    select: { id: true },
  });
  if (legacy) {
    await removeMemberChildren(legacy.id);
    await scopedDelete(prisma.user, { id: legacy.id }, "bot-updates user");
  }
}

// File-level, not inside a describe: BOTH suites below drive the bot as this
// member, and grammY derives the session key from the chat, so the row must
// exist before either one runs.
beforeEach(async () => {
  // Each test starts from the same clean state: exactly one member, and no
  // sign-in code or session rows carried over from the previous test.
  await removeMember();
  await seedMember();
});

afterAll(async () => {
  await removeMember();
  await prisma.$disconnect();
});

describe("Telegram bot update handling", () => {

  it("answers /start and provisions the member", async () => {
    const bot = buildBot();
    const cap = instrument(bot);

    await run(bot, messageUpdate("/start", nextId()));

    expect(cap.errors).toEqual([]);
    expect(cap.replies.join(" ")).toContain("Welcome to Yekis Jobs");
    // A usable web sign-in code must be surfaced. The bot replies with
    // parse_mode: "HTML", so the code is wrapped in <code>…</code> — it used to
    // be Markdown backticks, and this assertion was missed by d66bc97 when the
    // bot was converted to HTML.
    expect(cap.replies.join(" ")).toMatch(/<code>[23456789A-Z]{8}<\/code>/);

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

/**
 * Telegram rejects an inline keyboard button URL that is not a public https
 * origin:
 *
 *   400 Bad Request: inline keyboard button URL 'http://localhost:5173/?...' is
 *   invalid: Wrong HTTP URL
 *
 * The rejection applies to the WHOLE sendMessage, so a single bad button means
 * the member receives no message at all — which presented as a completely dead
 * bot. Every button the bot renders must therefore be acceptable to Telegram.
 */
describe("Telegram bot inline keyboard URLs", () => {
  const originalFrontendUrl = env.FRONTEND_URL;

  afterAll(async () => {
    (env as Record<string, unknown>).FRONTEND_URL = originalFrontendUrl;
  });

  /** Flattens every button URL out of a captured reply. */
  function buttonUrls(payload: any): string[] {
    const rows = payload?.reply_markup?.inline_keyboard ?? [];
    return rows.flat().map((b: any) => b?.url).filter(Boolean) as string[];
  }

  async function captureReplies(frontendUrl: string, commands: string[]) {
    (env as Record<string, unknown>).FRONTEND_URL = frontendUrl;
    const bot = buildBot();
    const urls: string[] = [];
    const texts: string[] = [];

    bot.api.config.use(async (prev: any, method: string, payload: any) => {
      if (method === "sendMessage" || method === "editMessageText") {
        texts.push(String(payload.text ?? ""));
        urls.push(...buttonUrls(payload));
      }
      if (
        method === "sendMessage" ||
        method === "editMessageText" ||
        method === "answerCallbackQuery"
      ) {
        return { ok: true, result: { message_id: texts.length } } as any;
      }
      return prev(method, payload);
    });
    bot.catch(async () => {});

    let id = 5000;
    for (const cmd of commands) {
      await run(
        bot,
        messageUpdate(cmd, id++),
      );
    }
    // Also exercise the callback paths that build keyboards.
    for (const data of ["menu:contracts", "menu:disputes", "menu:main", "auth:new_code"]) {
      await run(bot, callbackUpdate(data, id++));
    }
    return { urls, texts };
  }

  const COMMANDS = [
    "/start", "/menu", "/login", "/contracts", "/disputes",
    "/proposals", "/jobs", "/wallet", "/kyc", "/settings",
  ];

  it("emits no button URL Telegram would reject when FRONTEND_URL is localhost", async () => {
    const { urls, texts } = await captureReplies(
      "http://localhost:5173",
      COMMANDS,
    );

    for (const url of urls) {
      // This is precisely the check Telegram performs.
      expect(url, `rejected URL: ${url}`).toMatch(/^https:\/\//);
      expect(() => new URL(url)).not.toThrow();
      const host = new URL(url).hostname.toLowerCase();
      expect(["localhost", "127.0.0.1", "0.0.0.0"]).not.toContain(host);
      expect(host).not.toMatch(/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/);
    }

    // The member must still be told how to sign in on the web.
    expect(texts.join(" ")).toMatch(/[23456789A-Z]{8}/);
  });

  it("still emits the one-tap button when FRONTEND_URL is publicly reachable", async () => {
    const { urls } = await captureReplies(
      "https://app.yekis.et",
      ["/start", "/login"],
    );

    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url).toMatch(/^https:\/\/app\.yekis\.et/);
    }
    expect(urls.some((u) => u.includes("tg_code="))).toBe(true);
  });

  it("never emits an http:// or localhost button under any configuration", async () => {
    for (const frontendUrl of [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://localhost:5173",
      "https://192.168.1.20:5173",
      "http://192.168.1.20:5173",
      "not-a-url",
      "",
    ]) {
      const { urls } = await captureReplies(frontendUrl, ["/start", "/login"]);
      for (const url of urls) {
        expect(url.startsWith("https://"), `${frontendUrl} -> ${url}`).toBe(true);
        const host = new URL(url).hostname.toLowerCase();
        expect(
          ["localhost", "127.0.0.1", "0.0.0.0"].includes(host) ||
            /^192\.168\./.test(host),
          `${frontendUrl} -> ${url}`,
        ).toBe(false);
      }
    }
  });
});