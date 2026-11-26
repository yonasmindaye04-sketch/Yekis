import { describe, it, expect, afterAll, beforeEach } from "vitest";
import {
  createBot,
  markdownFallbackTransformer,
} from "../src/modules/bot/bot.service.js";
import { prisma } from "../src/lib/prisma.js";
import { scopedDelete } from "./helpers/scopedDelete.js";

/**
 * Regression cover for the two failure modes that made the live bot answer
 * NOTHING at all, while Telegram kept retrying the same update:
 *
 * 1. A reply Telegram refuses to format. The bot sent the raw translation key
 *    ("help_commands") because the locale dictionaries were not present in the
 *    built image; an underscore is an italic delimiter in Markdown, so
 *    Telegram answered 400 "can't parse entities", grammY threw, and the
 *    member saw nothing.
 *
 * 2. Any error escaping a handler. grammY's `bot.catch` only guards the
 *    long-polling batch API — the webhook adapter calls `handleUpdate`
 *    directly — so an error became an HTTP 500, which Telegram treats as a
 *    failed delivery and retries, forever.
 *
 * The bot must answer in both cases, and the delivery must be acknowledged.
 */

const TG_ID = 934567894;

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

type Capture = {
  /** Every sendMessage payload, in order. */
  sent: Array<{ text: string; parseMode?: string }>;
};

function instrument(
  bot: ReturnType<typeof buildBot>,
  options: { rejectFormatted?: boolean } = {},
): Capture {
  const capture: Capture = { sent: [] };

  bot.api.config.use(async (prev: any, method: string, payload: any) => {
    if (method === "sendMessage" || method === "editMessageText") {
      const parseMode = payload?.parse_mode;
      if (options.rejectFormatted && parseMode) {
        // What Telegram answers for a message whose markup it cannot parse.
        return {
          ok: false,
          error_code: 400,
          description:
            "Bad Request: can't parse entities: Can't find end of the entity starting at byte offset 4",
        } as any;
      }
      capture.sent.push({ text: String(payload.text ?? ""), parseMode });
      return { ok: true, result: { message_id: capture.sent.length } } as any;
    }
    return prev(method, payload);
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

const run = (bot: any, update: any) =>
  Promise.race([
    bot.handleUpdate(update),
    new Promise((r) => setTimeout(() => r("STALLED"), 15_000)),
  ]);

let uid = 5000;
const nextId = () => ++uid;

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
    await scopedDelete(delegate as never, { userId }, `bot-resilience ${name}`);
  }
}

async function removeMember() {
  const existing = await prisma.user.findUnique({
    where: { telegramUserId: BigInt(TG_ID) },
    select: { id: true },
  });
  if (existing) {
    await removeMemberChildren(existing.id);
    await scopedDelete(prisma.user, { id: existing.id }, "bot-resilience user");
  }
  const legacy = await prisma.user.findUnique({
    where: { email: `telegram+${TG_ID}@yekis.local` },
    select: { id: true },
  });
  if (legacy) {
    await removeMemberChildren(legacy.id);
    await scopedDelete(prisma.user, { id: legacy.id }, "bot-resilience user");
  }
}

beforeEach(async () => {
  await removeMember();
  await seedMember();
});

afterAll(async () => {
  await removeMember();
  await prisma.$disconnect();
});

describe("Telegram bot error resilience", () => {
  it("resends a message Telegram refuses to format, without parse_mode", async () => {
    const calls: Array<Record<string, unknown>> = [];

    // Emulates Telegram: a message that carries `parse_mode` is refused with
    // the answer the Bot API gives for unparseable markup.
    const prev = async (
      _method: string,
      payload: unknown,
    ): Promise<unknown> => {
      const body = payload as Record<string, unknown>;
      calls.push(body);
      if (body?.parse_mode) {
        return {
          ok: false,
          error_code: 400,
          description:
            "Bad Request: can't parse entities: Can't find end of the entity starting at byte offset 4",
        };
      }
      return { ok: true, result: { message_id: 1 } };
    };

    const response = await markdownFallbackTransformer(
      prev,
      "sendMessage",
      { chat_id: 1, text: "help_commands", parse_mode: "Markdown" },
      undefined,
    );

    // The same text went out twice: once formatted, once as plain text.
    expect(calls.length).toBe(2);
    expect(calls[0]?.parse_mode).toBe("Markdown");
    expect(calls[1]?.parse_mode).toBeUndefined();
    expect(calls[1]?.text).toBe("help_commands");
    expect(response).toEqual({ ok: true, result: { message_id: 1 } });
  });

  it("does not resend when Telegram refused the message for another reason", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const prev = async (
      _method: string,
      payload: unknown,
    ): Promise<unknown> => {
      calls.push(payload as Record<string, unknown>);
      return {
        ok: false,
        error_code: 403,
        description: "Forbidden: bot was blocked by the user",
      };
    };

    const response = await markdownFallbackTransformer(
      prev,
      "sendMessage",
      { chat_id: 1, text: "hello", parse_mode: "Markdown" },
      undefined,
    );

    expect(calls.length).toBe(1);
    expect(response).toMatchObject({ ok: false, error_code: 403 });
  });

  it("answers the member and acknowledges the delivery when a handler throws", async () => {
    const bot = buildBot();
    const capture = instrument(bot);

    bot.command("boom", async () => {
      throw new Error("handler exploded");
    });

    const result = await run(bot, messageUpdate("/boom", nextId()));

    // The delivery is acknowledged: the update does not escape as a failure,
    // so the webhook answers 200 and Telegram stops retrying it.
    expect(result).not.toBe("STALLED");
    expect(result).toBeUndefined();

    // And the member is told, in plain text that cannot be rejected for its
    // formatting.
    expect(capture.sent.length).toBe(1);
    expect(capture.sent[0]?.parseMode).toBeUndefined();
    expect(capture.sent[0]?.text).toMatch(/went wrong|temporarily/i);
  });

  it("still answers /help with the localized text", async () => {
    const bot = buildBot();
    const capture = instrument(bot);

    await run(bot, messageUpdate("/help", nextId()));

    expect(capture.sent.length).toBe(1);
    expect(capture.sent[0]?.text).toContain("I can help you manage");
  });
});
