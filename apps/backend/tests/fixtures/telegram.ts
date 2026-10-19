import { createHash, createHmac } from "node:crypto";

/**
 * Fixture helpers for Telegram's two distinct signature schemes.
 *
 * Telegram signs Mini App `initData` and Login Widget payloads with DIFFERENT
 * secrets derived from the same bot token, which is exactly why the mixed
 * algorithm handling was a critical finding. Tests must be able to produce both,
 * plus deliberately broken variants, without ever touching the network.
 *
 * A throwaway token is used by default. Never reuse the real bot token here: a
 * fixture that signs with it would produce payloads our own verifier accepts,
 * and a leaked fixture would leak the token itself.
 */
export const TEST_BOT_TOKEN = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";

export interface FakeTelegramUser {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

/**
 * The data-check string: every field except `hash`, sorted by key, `k=v` lines
 * joined by newline. Mirrors the verifier so a fixture that this signs is
 * accepted by production code.
 */
function dataCheckString(entries: [string, string][]): string {
  return entries
    .filter(([k]) => k !== "hash")
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
}

/** Mini App secret: HMAC-SHA256(key "WebAppData", msg = bot token). */
function miniAppSecret(botToken: string): Buffer {
  return createHmac("sha256", "WebAppData").update(botToken).digest();
}

/** Login Widget secret: SHA-256(bot token). */
function widgetSecret(botToken: string): Buffer {
  return createHash("sha256").update(botToken).digest();
}

export function signMiniApp(
  params: Record<string, string>,
  botToken: string = TEST_BOT_TOKEN,
): string {
  const p = new URLSearchParams(params);
  p.set(
    "hash",
    createHmac("sha256", miniAppSecret(botToken))
      .update(dataCheckString([...p.entries()]))
      .digest("hex"),
  );
  return p.toString();
}

export function signWidget(
  payload: Record<string, string | number>,
  botToken: string = TEST_BOT_TOKEN,
): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) flat[k] = String(v);
  flat.hash = createHmac("sha256", widgetSecret(botToken))
    .update(dataCheckString(Object.entries(flat)))
    .digest("hex");
  return flat;
}

/** A genuinely signed Mini App initData string. */
export function miniAppInitData(
  user: FakeTelegramUser,
  opts: { botToken?: string; authDateOffsetSec?: number } = {},
): string {
  const { botToken = TEST_BOT_TOKEN, authDateOffsetSec = 0 } = opts;
  return signMiniApp(
    {
      auth_date: String(Math.floor(Date.now() / 1000) - authDateOffsetSec),
      query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
      user: JSON.stringify(user),
    },
    botToken,
  );
}

/** A genuinely signed Login Widget payload (flat, `id`/`first_name`, no `user`). */
export function widgetPayload(
  user: FakeTelegramUser,
  opts: { botToken?: string; authDateOffsetSec?: number } = {},
): Record<string, string> {
  const { botToken = TEST_BOT_TOKEN, authDateOffsetSec = 0 } = opts;
  const flat: Record<string, string | number> = {
    auth_date: Math.floor(Date.now() / 1000) - authDateOffsetSec,
    id: user.id,
  };
  if (user.first_name) flat.first_name = user.first_name;
  if (user.last_name) flat.last_name = user.last_name;
  if (user.username) flat.username = user.username;
  if (user.language_code) flat.language_code = user.language_code;
  return signWidget(flat, botToken);
}

/**
 * initData whose `user` field was swapped after signing. The signature stays
 * valid-looking but must fail, because `user` is part of the signed data.
 */
export function tamperedInitData(
  user: FakeTelegramUser,
  replaceWith: FakeTelegramUser,
  opts: { botToken?: string } = {},
): string {
  const { botToken = TEST_BOT_TOKEN } = opts;
  const p = new URLSearchParams(miniAppInitData(user, { botToken }));
  const originalHash = p.get("hash") ?? "";
  p.set("user", JSON.stringify(replaceWith));
  p.set("hash", originalHash);
  return p.toString();
}

/** initData signed with a different bot's token. */
export function initDataWithWrongToken(user: FakeTelegramUser): string {
  return miniAppInitData(user, { botToken: "987654321:ZZZotherZZZotherZZZotherZZZotherZZZxx" });
}

/** A Login Widget payload rendered as Mini App initData (wrong scheme). */
export function widgetPayloadAsInitData(user: FakeTelegramUser): string {
  return new URLSearchParams(widgetPayload(user)).toString();
}

/** Mini App initData rendered as a flat widget payload (wrong scheme). */
export function initDataAsWidgetPayload(user: FakeTelegramUser): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(miniAppInitData(user)).entries());
}

/**
 * PKCE pair for the web-login flow.
 * challenge = base64url(sha256(verifier)), the S256 variant.
 */
export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = createHash("sha256")
    .update(`verifier-${Math.random()}-${Date.now()}`)
    .digest("base64url")
    .slice(0, 43);
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}
