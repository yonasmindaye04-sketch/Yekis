import { Bot, type Api } from "grammy";

/**
 * An in-memory stand-in for the Telegram Bot API.
 *
 * Installed via grammY's `api.config.use(transformer)`, so it intercepts every
 * Bot API call the bot makes — including ones inside handlers — without any
 * network access. Tests can then assert what the bot tried to do (which
 * keyboards it attached, whether it answered a callback query) instead of only
 * asserting on thrown errors.
 *
 * `installFakeTelegramApi` returns a recorder whose `calls` array is ordered.
 */
export interface RecordedCall {
  method: string;
  payload: Record<string, unknown>;
}

export interface FakeTelegram {
  calls: RecordedCall[];
  /** Calls for one method, e.g. `of("sendMessage")`. */
  of: (method: string) => RecordedCall[];
  /** The first payload sent to `method`, or undefined. */
  first: (method: string) => Record<string, unknown> | undefined;
  reset: () => void;
  /** Queue a canned result (or error) for the next call to `method`. */
  queue: (method: string, result: unknown) => void;
}

/**
 * Replaces a bot's API transport with a recorder.
 *
 * @param bot   the bot under test
 * @param token bot token used to construct it
 * @returns the recorder
 */
export function installFakeTelegramApi(
  bot: Bot,
  token: string,
): FakeTelegram {
  const calls: RecordedCall[] = [];
  const queued = new Map<string, unknown[]>();
  // Telegram user ids are unique per bot; keep the fixture stable across tests.
  const me = {
    id: 1,
    is_bot: true,
    first_name: "Yekis",
    username: "ye_kis_bot",
    can_join_groups: false,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
    can_connect_to_business: false,
    has_main_web_app: false,
  };

  const recorder: FakeTelegram = {
    calls,
    of: (method) => calls.filter((c) => c.method === method),
    first: (method) => calls.find((c) => c.method === method)?.payload,
    reset: () => {
      calls.length = 0;
      queued.clear();
    },
    queue: (method, result) => {
      const list = queued.get(method) ?? [];
      list.push(result);
      queued.set(method, list);
    },
  };

  bot.api.config.use(async (prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });

    const pending = queued.get(method);
    if (pending && pending.length > 0) {
      const next = pending.shift() as unknown;
      if (next instanceof Error) throw next;
      return next;
    }

    switch (method) {
      case "getMe":
        return me as never;
      // A webhook this bot never registered: makes the code take the polling
      // branch, which is what a test asserting "no webhook call" wants.
      case "getWebhookInfo":
        return {
          url: "",
          has_custom_certificate: false,
          pending_update_count: 0,
          last_error_message: "",
        } as never;
      case "sendMessage":
        return {
          message_id: calls.length,
          date: Math.floor(Date.now() / 1000),
          chat: { id: (payload as { chat_id?: number }).chat_id ?? 0, type: "private" },
          text: (payload as { text?: string }).text ?? "",
        } as never;
      case "editMessageText":
      case "editMessageReplyMarkup":
      case "deleteMessage":
      case "answerCallbackQuery":
      case "setMyCommands":
      case "setMyDescription":
      case "setMyShortDescription":
      case "setChatMenuButton":
      case "setWebhook":
      case "deleteWebhook":
      case "sendPhoto":
      case "sendDocument":
        return true as never;
      default:
        // Anything unexpected still records, and returns a benign shape so the
        // caller does not crash on a missing field.
        return prev(method, payload as never);
    }
  });

  void token;
  return recorder;
}

/**
 * A TelegramApiError-shaped rejection, so handlers exercising the 403/429
 * paths behave exactly as they would against the real API.
 */
export function telegramApiError(
  errorCode: number,
  description: string,
): Error & { error_code: number; description: string } {
  const err = new Error(`TelegramApiError: ${errorCode} ${description}`) as Error & {
    error_code: number;
    description: string;
  };
  err.error_code = errorCode;
  err.description = description;
  return err;
}

export type { Api };
