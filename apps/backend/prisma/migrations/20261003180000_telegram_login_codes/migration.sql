-- Short-lived, single-use codes that let an already-authenticated Telegram
-- member sign in on the web. Needed because the browser cannot present the
-- bot's server-side proof of identity, and the official Login Widget requires
-- the domain to be pre-registered with @BotFather (and is blocked by some
-- networks/ad blockers).
--
-- Only the SHA-256 of the code is stored. usedAt marks single-use consumption;
-- expires_at bounds the replay window.
CREATE TABLE "TelegramLoginCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telegramUserId" BIGINT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLoginCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramLoginCode_codeHash_key" ON "TelegramLoginCode"("codeHash");
CREATE INDEX "TelegramLoginCode_userId_idx" ON "TelegramLoginCode"("userId");
CREATE INDEX "TelegramLoginCode_expiresAt_idx" ON "TelegramLoginCode"("expiresAt");

ALTER TABLE "TelegramLoginCode"
    ADD CONSTRAINT "TelegramLoginCode_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;