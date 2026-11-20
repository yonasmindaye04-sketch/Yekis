# Phase 0 — Multi-Channel Authentication: Audit & Threat Model

> **Status: Phase 0 audit — no code has been changed.**
> Everything in sections 7–12 is a **proposal awaiting the founder's review**, not implemented behaviour.
> The only live measurements in this document were read-only probes (section 4.5); they created no
> accounts, moved no money and used no production credentials.

---

## 0. Document control

| | |
|---|---|
| Audit date | 2026-11-19 (live probes 19:39–20:40 UTC); document written 2026-11-20 |
| Repository state | `main` = `fix/code-only-compliance-gaps` = `3c794d8`, working tree clean |
| Live app | `https://yekis.app.aletcloud.com` — app `d40f8eff-9cd7-42f2-9c24-01b750def027`, project `7d5a6ab0-1a03-4b2a-b9a8-6accf59a87fa`, branch `fix/code-only-compliance-gaps`, `NODE_ENV=staging` |
| Scope | `apps/backend/src/modules/auth/**`, `apps/backend/src/modules/bot/**`, `apps/backend/src/lib/email/**`, `apps/backend/src/middleware/auth.ts`, `apps/frontend/src/**` sign-in surface, live host configuration |
| Method | Static read of the code + read-only live probes (3 GET/POST calls). No destructive commands. No production credentials used. |
| Next gate | Founder review of this document. **No implementation starts before that.** |

---

## 1. Summary for the founder

1. **The platform already has most of the machinery.** Password auth, phone OTP, an email OTP
   *verification* step, Telegram (widget / Mini App / bot code), real Google-Apple-Facebook ID-token
   verification, JWT access+refresh with `amr`/`auth_time`/`session_version`, audit logging and rate
   limits all exist. The work is **extension, not replacement**.
2. **The live host was returning one-time codes — closed on 2026-11-20.** `POST /api/v1/auth/email/code` on
   the public staging deployment answered `{"sent":true,…,"devCode":"097046"}` — the OTP was returned in the
   HTTP response because the "development only" guard was `NODE_ENV !== "production"`, and staging is a
   public host (**F-01**). The same rule also covered the withdrawal approval code. This was fixed the day
   the audit was delivered, on the same branch, before any new channel was switched on: code disclosure is
   now confined to `development` and `test` by `isDevCodeDisclosureAllowed()`, and the capability endpoint
   reports the configuration instead of the environment name. See F-01/F-02 and the changelog entry.
3. **The live host cannot send email at all.** There are no `SMTP_*` variables, and `sendEmail`
   refuses to pretend outside `development`. Password-reset mail therefore never leaves the box
   (**F-03**). Section 8 solves this for **$0** with a free transactional provider and a truthful
   capability endpoint.
4. **Google is not configured anywhere** — not on the host, not in the frontend build
   (`/auth/oauth/providers` → `google:false`). Section 9 is the exact console runbook; the only
   thing needed from the founder is a Google account and a few minutes in the Google Cloud console.
5. **One dead flow exists.** The Telegram PKCE web-login (`?start=wl_<sid>`) hands out a bot link on
   the live host, but the bot has no `wl_` handler and `approveWebLogin()` is imported and never
   called, so the flow stays `pending` forever (**F-04**).

---

## 2. Decisions locked by the founder (2026-11-19)

| # | Question | Answer | Consequence carried into the design |
|---|---|---|---|
| 1 | Audit first, then implement | **Audit document first**, implementation after review | This document is the gate. No code before approval. |
| 2 | Keep password sign-in | **Yes** | Password stays as one optional method; existing users unaffected. |
| 3 | Passwordless registration | **Allowed** — email-OTP signup may create an account with no password and the reserved `+2510…` phone | Reuses the existing federated sentinel pattern (`identity.ts`); phone remains required for payouts. |
| 4 | Telegram code format | **Recommended option** — add the 6-digit *pushed* OTP, keep the existing 8-character code valid during the transition | Two co-existing Telegram codes; the legacy one is deprecated and removed only after the push path is proven. |
| 5 | Identity storage | **Existing `User` columns** (`googleId`, `telegramUserId`, `email`, `phone`) | **No `user_auth_identities` table.** One identity per provider is already enforced by unique constraints. |
| 6 | Device/session management | **The best and secure option** | A real session registry keyed on the existing `sid` claim, per-device revocation, "sign out everywhere" retained (section 7.7). |
| 7 | Email provider | **No paid provider** — use a free tier, research alternatives | Section 8: Brevo free (300/day, single sender, $0) is the recommendation; three fallbacks documented. |
| 8 | Google | **Configure now** | Section 9: console runbook + deploy + live verification. |
| 9 | Money movement with an email-OTP session | **NO** — an email-OTP session must not be able to move money on its own | `email_otp` is **removed** from the strong-factor set; see section 7.8. |

Two standing constraints from earlier in this engagement still apply and are not re-litigated here:
**never auto-merge accounts** (a provider sign-in that matches an existing address must ask the user
to link it from a signed-in session, exactly as `AccountLinkRequiredError` does today), and
**never weaken escrow permissions**.

---

## 3. What "done" means

One Yekis account, three **optional** ways in, one place to manage them:

- **Email OTP** — sign in with a code sent to the address; may also create a passwordless account.
- **Telegram OTP** — a code pushed to the member's already-linked chat; link Telegram from the web.
- **Google** — real ID-token verification, plus verified linking to an existing account.
- **Password** — unchanged, still supported, still the strong factor for money movement.

Plus an **Account security** surface that shows what is linked, what is verified, and which devices
are signed in, with the ability to unlink a method and revoke a single device.

---

## 4. Current state (verified by reading the code and probing the live host)

### 4.1 What already exists

| Capability | Where | Actual state |
|---|---|---|
| Email/phone + password register & login | `modules/auth/auth.routes.ts` (`/register`, `/login`), `auth.service.ts` | Live. `identifier` accepts an address or a number; `phone` is optional at registration and gets the reserved `+2510…` placeholder. |
| Email OTP (verification only) | `email-verification.service.ts`, `EmailVerificationCode` | 6 digits, 10-minute TTL, 5 attempts, 60-second resend cooldown, one outstanding code per (address, purpose), salted SHA-256, single-use. **Proves address ownership; it never issues a session.** |
| Phone OTP | `phone-verification.service.ts`, `PhoneVerificationCode` | SMS proof of the payout number and the withdrawal-approval code. Unchanged by this work. |
| Telegram auth | bot, Login Widget, Mini App `initData`, 8-character code, `?start=web_auth` | Live and working. `telegramUserId` is the immutable key; the bot refuses to auto-provision. |
| Telegram PKCE web login | `/auth/telegram/web-login/start\|status\|redeem` + Redis | **Dead** — see F-04. |
| Google / Apple / Facebook | `oauth.service.ts`, `/auth/oauth/*` | Real ID-token / JWKS verification with issuer, audience and expiry checks. `AccountLinkRequiredError` instead of auto-merge. **Not configured on the live host.** |
| Unified identity | `User.googleId`, `User.telegramUserId`, `User.email`, `User.phone` (all unique) | One row per person already. No `user_auth_identities` table, and none is proposed. |
| Sessions | `createAuthTokens`, `refreshSession`, `revokeAllSessions` | JWT access + refresh with `sid`, `amr`, `auth_time`, `session_version`; refresh rotation; global revocation only. |
| Step-up for money | `middleware/auth.ts` `requireFreshAuth`, `STRONG_AUTH_METHODS` | `pwd` / `totp` / `email_otp` count as strong — but `totp` and `email_otp` are **never issued** (F-05). |
| Audit & rate limits | `lib/audit.ts`, `lib/rateLimit.ts` (Redis) + `express-rate-limit` on auth routes | Present, with enumeration-safe register and reset responses. |

### 4.2 Endpoint inventory as it stands (all under `/api/v1/auth`)

| Method | Path | Notes |
|---|---|---|
| POST | `/register` | Password + address (+ optional number); `202` generic body. |
| POST | `/login` | Password; identifier may be address or number. |
| POST | `/email/code`, `/email/verify` | 6-digit address proof (verification purpose only). |
| GET | `/verification/channels` | Capability discovery — **currently inaccurate** (F-02). |
| POST | `/phone/code`, `/phone/verify` | SMS proof. |
| POST | `/telegram`, `/telegram/miniapp`, `/telegram/miniapp/register`, `/telegram/widget` | Telegram session issuance. |
| POST/DELETE | `/telegram/link` | Link/unlink Telegram from a **signed-in, fresh** session. |
| POST | `/telegram/code` | Redeem the 8-character bot code. |
| POST/GET/POST | `/telegram/web-login/start`, `/status`, `/redeem` | PKCE flow — dead (F-04). |
| GET | `/oauth/providers` | Capability discovery (accurate). |
| POST | `/oauth/google`, `/oauth/apple`, `/oauth/facebook` | Provider verification. |
| POST | `/refresh`, `/logout` | Rotation; logout currently revokes **every** session (F-07). |
| GET | `/me` | Profile. |
| POST | `/change-password`, `/revoke-sessions` | Password change; "revoke all other sessions". |

### 4.3 Identity and data model as it stands

- `User` — `email` (unique, canonical lower-case), `phone` (unique, non-null, reserved `+2510…`
  block for federated accounts), `emailVerified` / `emailVerifiedAt`, `passwordHash` (non-null; a
  sentinel for federated accounts), `passwordSetAt` (null ⇒ the account has no platform password),
  `googleId` / `appleId` / `facebookId` / `telegramUserId` / `telegramChatId` (unique where
  applicable), `sessionVersion`, `isSuspended`, `isGuestContact`.
- `EmailVerificationCode` — `email`, `purpose` (string), `codeHash`, `salt`, `attempts`, `expiresAt`,
  `verifiedAt`. **No foreign key to `User`** on purpose: the proof must work before the account exists.
- `PhoneVerificationCode` — same shape, keyed on `phone`.
- `TelegramLoginCode` — `userId`, `telegramUserId`, `codeHash` (SHA-256), `expiresAt`, `usedAt`.

### 4.4 Session and token model as it stands

`createAuthTokens(user, amr)` mints an access token and a refresh token carrying `sub`, `role`,
`sid`, `amr`, `auth_time` and `session_version`. `refreshSession` copies `amr`/`auth_time` verbatim so
a silent refresh never counts as re-authentication. `requireAuth` verifies the signature and the
session version; `requireFreshAuth` additionally demands a **strong** `amr` within the last 300
seconds. Revocation is all-or-nothing: `revokeAllSessions()` increments `User.sessionVersion`.

### 4.5 Live host facts (probed 2026-11-19)

The probes below were taken **before** the F-01/F-02 fix of 2026-11-20 and are the evidence for those
findings. The post-fix re-probe is recorded in Appendix A (E-10).

| Probe | Result | Meaning |
|---|---|---|
| `GET /api/v1/auth/verification/channels` | `{"email":{"available":true,"label":"Email"},"phone":{"available":true,"label":"Telegram"}}` | The host claims it can send email. It cannot (F-02/F-03). |
| `POST /api/v1/auth/email/code` (throwaway address) | `200 {"sent":true,"expiresAt":"…","retryAfterSec":60,"devCode":"097046"}` | **The live OTP is returned in the response** (F-01). |
| `GET /api/v1/auth/oauth/providers` | `{"google":false,"apple":false,"facebook":false,"telegram":true,"telegramBotUsername":"ye_kis_bot"}` | Google/Apple/Facebook are not configured (F-08). |
| `POST /api/v1/auth/telegram/web-login/start` | `200 {"sid":"…","botUrl":"https://t.me/ye_kis_bot?start=wl_…"}` | The dead PKCE flow is live and advertised (F-04). |
| Host environment | `NODE_ENV=staging`, no `SMTP_*`, no `EMAIL_*`, no `GOOGLE_*`; Telegram and JWT secrets present | Staging behaves like production for secrets but not for the code-leak guards (F-01). |

---

## 5. Findings

Severity: **Critical** = live exposure now · **High** = broken or false capability · **Medium** =
will break or weaken the new channels · **Low** = hygiene.

---

### F-01 — Critical — the live host returns one-time codes in the API response

**Evidence.** `email-verification.service.ts:207` returns `devCode` whenever `env.NODE_ENV !== "production"`;
`email-verification.routes.ts:155` re-checks the same condition and puts it in the body. The live
staging host answered the probe above with `"devCode":"097046"`. In addition,
`email-verification.service.ts:410` prints the code to stdout whenever SMTP is absent and the
environment is not production.

**Impact.** Anyone on the internet can ask for a code for **any** address and read it out of the
response. Today that lets an attacker register an account claiming someone else's mailbox (which
also poisons the address for its real owner) and floods the platform with 10 codes/hour/address rows.
The moment email OTP login exists, the same primitive becomes **account takeover** — so this must be
closed *before* Phase 3, not after.

**Fix.** Gate the code on `NODE_ENV === "development"` (not `!== "production"`), in both the service
and the route; gate the stdout fallback on the same condition; make the capability endpoint report
the truth. Phase 2.

**Resolution — closed 2026-11-20, in the same branch as this document.** The disclosure rule is now
an allowlist in `apps/backend/src/config/env.ts`:

```ts
export function isDevCodeDisclosureAllowed(): boolean {
  return env.NODE_ENV === "development" || env.NODE_ENV === "test";
}
```

`test` is in the allowlist because the suites assert on the code itself
(`tests/email-verification.test.ts`, `tests/phone-verification.test.ts`, `tests/withdrawal-2fa.test.ts`);
neither environment is reachable by the public. Every disclosure site was closed, not only the measured
one: the email OTP service and route, the phone OTP service and route, and the withdrawal OTP route
(now gated independently of the service). The phone service's "no SMS provider, no Telegram chat, print
the code" fallback was confined the same way. On `staging` and `production` a code that cannot be
delivered is not delivered: the row is deleted and the caller is told the message was not sent.

**Consequence to be aware of:** until a mail transport is configured on the staging host, the email
verification step answers `503 EMAIL_UNAVAILABLE` and the signup flow uses Telegram. That is the honest
state — before the fix it "worked" by publishing the code.

---

### F-02 — High — the capability endpoint reports a channel that cannot deliver

**Evidence.** `isEmailDeliveryConfigured()` (`email-verification.service.ts:363-366`) returns `true`
for anything that is not production, so it ignores the actual transport configuration. The live
response claims `email.available: true` while no mail is sent.

**Impact.** The onboarding UI offers a channel that dead-ends, and any client that trusts the flag
promises a delivery that never happens. A capability endpoint that lies is worse than one that is
absent.

**Fix.** Derive availability from the configured transport (SMTP credentials, or an API key for the
selected provider), never from `NODE_ENV`. Phase 2.

**Resolution — partially closed 2026-11-20.** `isEmailDeliveryConfigured()` now answers
`isSmtpConfigured() || isDevCodeDisclosureAllowed()`, and the phone channel is derived from the SMS key
or the Telegram bot in the same way, so the live host reports `email.available:false` instead of
advertising a channel it cannot deliver. The remaining part of F-02 is the transport abstraction of
section 7.3 (one transport behind several providers), which is Phase 1/2 work.

---

### F-03 — High — no mail transport on the live host; password recovery is dead there

**Evidence.** No `SMTP_*` on the host. `sendEmail` (`lib/email/email.service.ts:144-175`) only has the
console fallback in `development`; in staging it returns `{ success: false }`. `requestPasswordReset`
(`auth.service.ts`) correctly **deletes the undelivered token** — so no live credential is orphaned —
but the route still answers with the generic success shape, so the member is told a link was sent
when nothing was sent.

**Impact.** On the live host: password reset, escrow receipts and every other transactional mail are
undeliverable. This is not only an auth problem — money receipts are affected.

**Fix.** Section 8: a provider abstraction with a **$0** provider, plus the `scripts/test-email.mjs`
delivery check and a truthful capability endpoint. Phase 1/2.

---

### F-04 — Medium — the Telegram PKCE web-login flow cannot complete

**Evidence.** `POST /auth/telegram/web-login/start` (live-verified, 200) returns
`https://t.me/ye_kis_bot?start=wl_<sid>`. The bot's `/start` handler only recognises the payload
`web_auth` (`modules/bot/handlers/commands.ts:50`); there is no `wl_` branch anywhere in the bot.
`approveWebLogin` and `denyWebLogin` are imported in `commands.ts:25-26` and `callbacks.ts:1` and
**never called** — a repository-wide search finds only the definitions and the imports. Since
`redeemWebLogin` requires `status === "approved"`, the flow is permanently `pending` → `expired`.

**Impact.** A documented, advertised flow that always times out. Worse, it teaches operators that
Telegram web login "sort of works" (the 8-character code path does work), so the broken half hides.

**Fix.** Wire the `wl_` deep link to an explicit **Approve / Deny** inline keyboard in the bot, calling
`approveWebLogin(sid, telegramUserId, userId)` / `denyWebLogin(sid)`; keep the PKCE verifier check;
show the requester device (browser user-agent) in the prompt. Phase 4.

---

### F-05 — Medium — `email_otp` and `totp` are declared strong factors but are never issued

**Evidence.** `auth-methods.ts` lists `totp` and `email_otp` in `AuthMethod` and in
`STRONG_AUTH_METHODS`. A repository-wide search finds no issuer for either: no TOTP implementation
exists at all, and no endpoint mints a token with `amr: ["email_otp"]`. `middleware/auth.ts:142`
tells the user to "add a password, TOTP or email code" — two of the three things the platform cannot do.

**Impact.** The strong-factor policy is not the policy that is actually enforced, and it is written
down as if it were. This is exactly the kind of drift that a compliance reviewer finds.

**Fix.** `STRONG_AUTH_METHODS` becomes `{ pwd }` (+ `totp` only if/when TOTP exists). `email_otp`
becomes a real, issued, **weak-for-money** method (section 7.8). Phase 2.

---

### F-06 — Medium — 6-digit OTPs are hashed without a server-side pepper

**Evidence.** `hashEmailCode(salt, code) = sha256(salt + ":" + code)`; the phone service uses the same
construction. A 6-digit code has ~20 bits of entropy, and the row also stores the address, the salt
and the creation time.

**Impact.** If the table is ever lifted, every outstanding code for a live address can be recovered
by brute force in seconds (a single SHA-256 over 10^6 candidates is milliseconds of GPU time). The
pepper is the difference between "a leaked table" and "a leaked table with every live OTP".

**Fix.** HMAC-SHA-256 keyed with a server-side `AUTH_OTP_PEPPER`, stored as a versioned value
(`v2:<hmac>`) so rows issued before the change keep verifying while they are in flight; the pepper
is required in staging and production and is never logged. Phase 2.

---

### F-07 — Medium — no session registry, so no single-device revocation

**Evidence.** Tokens carry a `sid` claim (`middleware/auth.ts:114` reads it) but nothing persists it.
`revokeAllSessions()` bumps `User.sessionVersion`; `logoutSession()` calls it, so **logging out of one
browser signs you out everywhere**.

**Impact.** A stolen token cannot be individually killed; the only remedy is signing the user out of
everywhere. It also makes the "active sessions / manage devices" screen impossible, and it makes the
`sid` claim decorative.

**Fix.** Section 7.7: an `AuthSession` table keyed by `sid`, per-device revocation, a device list
endpoint, and "sign out everywhere" kept as an explicit action. Phase 5.

---

### F-08 — Medium — Google is not configured on the live host or in the frontend build

**Evidence.** `/auth/oauth/providers` → `google:false`. The backend gates on `GOOGLE_CLIENT_ID`
(`config/env.ts:293`); the frontend button is hidden unless `VITE_GOOGLE_CLIENT_ID` is present at
**build** time (`SocialSignInButtons.tsx:100,191`). The verified server code is already in place
(`oauth.service.ts`: JWKS against `https://www.googleapis.com/oauth2/v3/certs`, issuer
`accounts.google.com`, audience = `GOOGLE_CLIENT_ID`).

**Impact.** The third channel simply does not exist for users. Nothing to fix in the security code —
only configuration and a linking path.

**Fix.** Section 9 (console runbook) + a verified linking endpoint (section 7.6). Phase 6.

---

### F-09 — Medium — there is no way to link Telegram to an email account from the web

**Evidence.** `POST /auth/telegram/link` requires a verified Widget/Mini App payload; there is no
`link_<token>` deep link and no bot handler for it. The bot only knows `web_auth`.

**Impact.** A member who signed up with email (or Google) cannot attach Telegram, so the Telegram
push-OTP channel cannot be offered to them at all, and "one account, three methods" stays a fiction.

**Fix.** Section 7.5: a short-lived, single-use **link token** minted from an authenticated session,
consumed by the bot through `?start=link_<token>`, bound to exactly one `userId`. Phase 4.

---

### F-10 — Low — no last-method guard and no identities API

**Evidence.** `DELETE /auth/telegram/link` unlinks Telegram with no check that another method remains;
there is no `GET /auth/identities`; the frontend has no account-security view.

**Impact.** A member can remove their only remaining way in and lock themselves out (today: unlink
Telegram from a Telegram-only account). There is also no way to show a member what is linked, which
is the first question a support agent asks.

**Fix.** `GET /auth/identities` + a last-method guard on every unlink + the Account security UI.
Phase 5.

---

### F-11 — Low — OTP rows are never purged

**Evidence.** `purgeExpiredTelegramLoginCodes()` exists (`telegram-code.service.ts:162`) but has no
call site — there is no scheduler for it in `src/queue/`. `EmailVerificationCode` and
`PhoneVerificationCode` rows are never purged at all.

**Impact.** Unbounded growth of rows holding codes, addresses and phone numbers; the PII retention
story is weaker than the erasure feature implies; the table is exactly what F-06 assumes might leak.

**Fix.** One scheduled cleanup job for all three OTP tables, run daily, deleting rows past expiry
plus a short retention tail for audit. Phase 2.

---

### F-12 — Low — access and refresh tokens live in `localStorage`

**Evidence.** `apps/frontend/src/api/client.ts` stores `yekis-api-token` and `yekis-refresh-token` in
`localStorage`.

**Impact.** Any XSS on the origin yields a full session, including money-scoped ones. This is the
standard trade-off for a bearer-token SPA and is the same model the Mini App and API clients use.

**Fix.** **Out of scope for this phase** (it is a breaking change for every client and a project in
its own right). Recorded here so it is a deliberate decision, not an oversight. The per-device
revocation in F-07 is the mitigation that matters most in the meantime.

---

### F-13 — Low — two different Telegram onboarding rules

**Evidence.** The bot's auth middleware refuses to auto-provision (`modules/bot/middleware/auth.middleware.ts`),
while the Mini App path provisions an account from a verified `initData` payload.

**Impact.** Not a vulnerability — the Mini App path verifies the payload cryptographically — but the
difference is invisible to the member and produces support questions.

**Fix.** Documented in section 7.5; no behaviour change without the founder's agreement.

---

## 6. Threat model

### 6.1 Assets (what an attacker wants)

| Asset | Why it matters |
|---|---|
| A session token | Full access to the member's workspace and, after step-up, to escrow actions. |
| The escrow balance / payout destination | Money. The payout phone number and the withdrawal SMS code are the final controls. |
| The account email | The login identifier, the password-reset destination and the source of OTPs. |
| The Telegram identity | A sign-in factor and a push channel for OTPs. |
| The Google identity | A sign-in factor and a strong proof of email ownership. |
| PII (name, DOB, Fayda ID) | PDPP/AML exposure. |

### 6.2 Actors

- **Anonymous internet user** — can reach every unauthenticated auth endpoint.
- **Attacker with a victim's email inbox** — the realistic OTP-thief (phishing, reused credentials,
  a compromised mail provider).
- **Attacker with the victim's Telegram account** — can answer bot prompts, approve `wl_` flows and
  read pushed codes.
- **Attacker with the victim's Google account** — can mint a valid ID token for the victim's address.
- **Attacker with the victim's browser session** (XSS, shared device) — holds a live bearer token.
- **Malicious insider / leaked database** — reads OTP rows, sessions and PII.
- **Founder/operator error** — misconfiguration (the class of bug that produced F-01 and F-02).

### 6.3 Trust boundaries

```
Internet ──▶ [Edge / AletCloud] ──▶ [Express API] ──▶ [Postgres]
                   │                     │  ▲
                   │                     │  └── Redis (rate limits, PKCE state, queues)
     [Telegram Bot API]                  │
     [Google JWKS]                       └──▶ [Email provider API/SMTP] ──▶ [Member's inbox]
```

Each arrow is a boundary where a proof must be re-checked: the Telegram boundary is a bot token
signature, the Google boundary is a JWKS-verified ID token, the mail boundary is "the code arrived at
the address", and the browser boundary is the bearer token.

### 6.4 Abuse cases and the control that stops each

| # | Abuse case | Control (existing / proposed) |
|---|---|---|
| A1 | Enumerate which addresses have accounts | Every auth response is enumeration-safe today; the new endpoints must keep that property (**S-3**). |
| A2 | Guess a 6-digit code | 5 attempts, 10-minute TTL, per-address + per-IP limiters, plus peppered hashes and rate-limited issues (**S-4**). |
| A3 | Read a victim's code from the API response | **F-01 fix** — no code outside `development` (**S-1**). |
| A4 | Replay a code after it was used | Single-use claim by conditional UPDATE (`verifiedAt` / `usedAt` in the same transaction). |
| A5 | Sign in as a victim by claiming their address | Address ownership is proven by OTP; the account is only found by exact canonical address, never auto-created for a sign-in. |
| A6 | Auto-merge a provider identity into a password account | `AccountLinkRequiredError` + `passwordSetAt` rule; the new email-OTP account is explicitly **not** an auto-merge target (section 7.1). |
| A7 | Move money with a stolen inbox or a Telegram hijack | `email_otp` / Telegram / OAuth are **weak** for step-up; money needs a fresh **password** (section 7.8) and, for payouts, the withdrawal-scoped SMS OTP. |
| A8 | Steal a session from XSS and keep it forever | Short access-token TTL, refresh rotation, session-version check, and (new) per-device revocation (**S-9**). |
| A9 | Hijack a Telegram link flow | Link tokens are single-use, short-lived, bound to one `userId`, and consumed inside the bot by the Telegram-authenticated member (**S-7**). |
| A10 | Fixate a victim's browser session onto the attacker's Telegram | The `wl_` flow binds the approval to a PKCE verifier known only to the requesting browser (**S-8**). |
| A11 | Burn a victim's mail quota | Per-address issue cap (5/hour), 60-second cooldown, per-IP limiter (10/hour). |
| A12 | Phish with a look-alike sender | The From name/domain is fixed by configuration and the OTP body says it is a Yekis code; the transport must be a real domain once one is owned. |
| A13 | Read OTP hashes from a database dump | **F-06 fix** — HMAC with a server-side pepper (**S-5**). |
| A14 | Operator misconfiguration leaves codes readable | **F-01/F-02 fixes** — fail closed, and the capability endpoint tells the truth (**S-1**, **S-2**). |

### 6.5 Security invariants (must hold after implementation; each has a test)

| ID | Invariant | Verified by |
|---|---|---|
| **S-1** | No one-time code is ever returned in an API response, printed to a log, or stored in plaintext outside `NODE_ENV=development`. | Unit test asserting the response body of every code-issuing route in staging/production mode. |
| **S-2** | `GET /auth/verification/channels` and `GET /auth/oauth/providers` report only what can actually deliver. | Integration test with and without transport credentials. |
| **S-3** | No auth response distinguishes "no such account" from "wrong code" or "wrong password". | Integration tests per endpoint. |
| **S-4** | An OTP is single-use, expires, is attempt-capped, and is rate-limited per address and per IP. | Integration tests + Redis limiter tests. |
| **S-5** | OTP hashes are peppered HMACs; the pepper is required outside development and never logged. | Unit test on the hash function + startup guard test. |
| **S-6** | A credential proves exactly one thing: the code's purpose decides what it authorises. | Unit tests per purpose pair. |
| **S-7** | A Telegram link token is single-use, expires in minutes, is bound to one `userId`, and links only an unlinked Telegram identity. | Integration test + bot handler test. |
| **S-8** | A Telegram web-login can only be redeemed by the browser that started it (PKCE) and only after an explicit approval. | Integration test + bot test. |
| **S-9** | A session can be revoked individually, and revoking one device leaves the others valid. | Integration test on the `AuthSession` registry. |
| **S-10** | A weak method (email OTP, Telegram, OAuth) never satisfies a money/step-up gate. | Integration test on every `requireFreshAuth` route. |
| **S-11** | No provider identity is auto-merged into an existing account. | Integration test per provider. |
| **S-12** | An account always keeps at least one way in; unlinking the last method is refused. | Integration test on every unlink route. |
| **S-13** | Every credential event is written to the audit log with the method that produced it. | Audit-log assertions in the auth tests. |
| **S-14** | A suspended or compliance-held account cannot obtain a session through any channel. | Integration test across all new entry points. |

---

## 7. Target design (proposed — awaiting review)

### 7.1 Identity model — no new identity table

One `User` row per person, exactly as today:

- `email` — the login identifier; `emailVerifiedAt` records **platform** proof of the inbox.
- `phone` — the payout number; a passwordless account gets the reserved `+2510…` placeholder until a
  real number is supplied.
- `googleId` / `telegramUserId` — the provider identities, unique, one each.
- `passwordHash` — non-null by schema; a passwordless account stores the same **sentinel** hash the
  federated paths already use, and `passwordSetAt` stays **null**.
- **New column:** `passwordlessEmailAt DateTime?` — set when the account was created by email OTP.

**Why the new column.** `identity.ts` decides "may this federated identity auto-merge?" with
`passwordSetAt IS NULL`. An email-OTP account also has `passwordSetAt === null`, so without a second
marker it would become an auto-merge target — which the founder has ruled out. With
`passwordlessEmailAt`, auto-merge eligibility becomes "`passwordSetAt IS NULL AND passwordlessEmailAt
IS NULL`" (federated-owned accounts only), and an email-OTP account that later signs in with Google
gets `409 ACCOUNT_LINK_REQUIRED` and links it deliberately from a signed-in session.

**No `user_auth_identities` table.** The columns already enforce one identity per provider, they are
already used by every query, and a second table would create two sources of truth plus a backfill.

### 7.2 Shared OTP primitives (Phase 2)

One module, `modules/auth/otp.ts`, used by the email and Telegram channels:

- **Peppered, versioned hash**: `v2:` + `HMAC-SHA-256(AUTH_OTP_PEPPER, purpose + ":" + identifier + ":" + code)`.
  Verifier accepts `v1:` (legacy salted SHA-256) so in-flight codes keep working, and issues only `v2:`.
- **Purpose separation**: `EMAIL_VERIFICATION`, `EMAIL_LOGIN`, `EMAIL_PASSWORD_SET`, `TELEGRAM_LOGIN`.
  One outstanding code per (identifier, purpose); a code issued for one purpose is not redeemable for another.
- **Policy**: 10-minute TTL, 5 verification attempts, 60-second resend cooldown, ≤5 issues per
  address per hour, per-IP limiter on top.
- **Cleanup**: one daily job purging expired rows from `EmailVerificationCode`,
  `PhoneVerificationCode`, `TelegramLoginCode` and the new `TelegramOtpCode`.
- **Entropies**: email 6 digits (readable), Telegram 6 digits (typed on a phone keypad).

### 7.3 Email transport (Phase 1/2)

`lib/email/email.service.ts` becomes a thin façade over a transport chosen by `EMAIL_TRANSPORT`:

| `EMAIL_TRANSPORT` | Credentials | Notes |
|---|---|---|
| `smtp` (default) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | Works with every provider below, including Mailtrap and Gmail app passwords. |
| `resend` | `RESEND_API_KEY` | HTTPS. Best DX; needs a verified domain (section 8). |
| `brevo` | `BREVO_API_KEY` | HTTPS. Works with a single verified sender and no domain — the $0 recommendation. |
| `log` | `EMAIL_ALLOW_LOG_TRANSPORT=true` | **Refused in production.** Development only; the code is written to stdout and never to the API response. |

Rules:

- `sendEmail()` keeps its current signature and returns `{ success }`; the caller keeps the
  "delete the token if it was not delivered" behaviour.
- The **log** transport requires `NODE_ENV !== "production"` **and** an explicit opt-in flag.
- `isEmailDeliveryConfigured()` becomes "is a transport configured *and* usable", not "is this not production".
- `scripts/test-email.mjs <address>` sends one real message through the configured transport and prints
  the provider's response id — the acceptance test for Phase 1.

### 7.4 Email OTP: sign-in and passwordless registration (Phase 3)

Reuse the existing `/email/code` and `/email/verify` routes by adding a `purpose` to their body
(defaulting to `EMAIL_VERIFICATION`, so no existing client changes), and add two routes:

| Method | Path | Purpose | Behaviour |
|---|---|---|---|
| POST | `/api/v1/auth/email/code` | extended | `{ email, purpose? }` → issues the code for that purpose. Generic body; never says whether the address is registered. |
| POST | `/api/v1/auth/email/verify` | extended | `{ email, code, purpose? }` → checks the code. Existing `EMAIL_VERIFICATION` behaviour unchanged. |
| POST | `/api/v1/auth/email/login` | **new** | `{ email, code }` → verifies an `EMAIL_LOGIN` code; if no account exists for the address → the same `400 INVALID_CODE` shape as a wrong code (no enumeration). On success: a session with `amr: ["email_otp"]`, `emailVerifiedAt` set, audit event `EMAIL_OTP_LOGIN`. |
| POST | `/api/v1/auth/register/email` | **new** | `{ email, code, role, dateOfBirth, languagePreference, consents }` → creates a **passwordless** account: sentinel password hash, `passwordSetAt = null`, `passwordlessEmailAt = now`, reserved `+2510…` phone, `emailVerifiedAt` set, consents and age gate enforced exactly as `/register` does. If the address already has an account → the same generic `202` shape as `/register` (no enumeration, no session). |
| POST | `/api/v1/auth/email/password/set` | **new** | Authenticated + a fresh `EMAIL_PASSWORD_SET` code → sets a password, sets `passwordSetAt`, revokes other sessions. This is how a passwordless member acquires a strong factor. |

The passwordless account is otherwise identical to any other account: the phone is still required
before a payout, KYC still applies, and the money rules in 7.8 apply unchanged.

### 7.5 Telegram: push OTP, link tokens, and the dead PKCE flow (Phase 4)

| Method | Path | Behaviour |
|---|---|---|
| POST | `/api/v1/auth/telegram/otp/request` | `{ email }` → looks up the account; if it has a linked `telegramChatId`, the bot pushes a 6-digit code. The response is **always** the same shape (`{ sent: true }`) whether or not a code was sent, so the endpoint is not a "is Telegram linked" oracle. Rate-limited per address and per IP. |
| POST | `/api/v1/auth/telegram/otp/verify` | `{ email, code }` → single-use claim, then a session with `amr: ["tg_otp"]` (weak — Telegram is never strong). |
| POST | `/api/v1/auth/telegram/link/request` | Authenticated → mints a **link token**: random 32 bytes, stored hashed, single-use, 10-minute TTL, bound to `userId`. Returns the deep link `https://t.me/<bot>?start=link_<token>`. |
| — | Bot: `?start=link_<token>` | The bot consumes the token. It links the Telegram identity to the **bound** `userId` only. If the Telegram identity is already linked to a different account → refuse and say so (no merge, no steal). The token is burned either way. |
| — | Bot: `?start=wl_<sid>` | **Repairs F-04.** Shows "Approve sign-in? (browser: <UA>)" with **Approve / Deny** buttons → `approveWebLogin(sid, telegramUserId, userId)` / `denyWebLogin(sid)`. The PKCE verifier still has to match at redeem time. |

The existing **8-character bot code stays valid** during the transition (founder decision 4) and is
marked deprecated; the bot keeps minting it on `/login` and `?start=web_auth` until the push path has
proven itself in production.

The bot reuses `sendNotification`-style delivery to `User.telegramChatId`; if the chat is gone, the
row's `telegramChatId` is cleared and the code is refused.

### 7.6 Google (Phase 6)

- The existing `/auth/oauth/google` verification is already correct and stays as it is.
- **New:** `POST /auth/oauth/google/link` — authenticated + fresh session → verifies the ID token and
  binds `googleId` to the **current** account. Refuses if that `googleId` already belongs to another
  account (no merge). The "no auto-merge" rule in 7.1 applies here too.
- Configuration is in section 9. `GOOGLE_CLIENT_SECRET` is **not** needed for ID-token verification
  (the backend checks the signature against Google's JWKS and the audience against the client id), but
  it stays in the env schema for the future code-exchange flow.

### 7.7 Sessions and device management (Phase 5)

**New model `AuthSession`** — the registry the `sid` claim has been waiting for:

| Field | Purpose |
|---|---|
| `id` (`sid`, cuid) | The token's `sid` claim; primary key. |
| `userId` | Owner; indexed. |
| `amr` | The method that created the session (`Json` or `String[]`). |
| `authTime` | When the credential was presented. |
| `userAgent`, `ip` | Device label for the security screen. |
| `createdAt`, `lastSeenAt` | Age and activity. |
| `expiresAt`, `revokedAt` | Lifetime and per-device revocation. |
| `rotatedFrom` | Refresh rotation chain, so a stolen refresh token's successor can be traced. |

**New endpoints:**

| Method | Path | Behaviour |
|---|---|---|
| GET | `/api/v1/auth/sessions` | The member's active devices (label, created, last seen, current?). |
| DELETE | `/api/v1/auth/sessions/:sid` | Revoke **one** device. The caller's own session cannot be revoked this way (use logout). |
| POST | `/api/v1/auth/sessions/revoke-others` | Revoke every session except the caller's (the existing `/revoke-sessions` behaviour, kept). |
| POST | `/api/v1/auth/logout` | **Behaviour change:** revokes **only the caller's** session. "Sign out everywhere" becomes the explicit `revoke-others` action. *Flagged for the founder: this is a deliberate change from today's all-or-nothing logout.* |
| POST | `/api/v1/auth/sessions/revoke-all` | The old all-or-nothing behaviour, under an explicit name. |

`requireAuth` additionally checks that the `sid` is a live row, so a revoked device's access token
dies immediately instead of waiting for its TTL.

### 7.8 Step-up and money movement (the founder's "NO")

The rule that answers decision 9:

- `STRONG_AUTH_METHODS` becomes `{ pwd }` (and `totp` only if TOTP is ever implemented). **`email_otp`
  is removed from the strong set.**
- A session created by email OTP, Telegram or OAuth satisfies `requireAuth` but **fails**
  `requireFreshAuth` with `403 STEP_UP_REQUIRED` — the same answer a Telegram-only member already gets.
- Money movement therefore requires a **fresh password** (or the payout-scoped SMS OTP that the
  withdrawal flow already demands).
- A passwordless member can use the platform immediately; to move money they must **set a password**
  (`/email/password/set`) or complete phone verification, after which the normal payout rules apply.
- Consequence to state plainly: **a compromised inbox is a compromised account, but not a compromised
  wallet.** That is the trade the founder chose, and it is the reason the password method stays.

### 7.9 Endpoint map — new and changed (summary)

| Method | Path | New/changed | Phase |
|---|---|---|---|
| POST | `/auth/email/code` | changed (adds `purpose`; no code in the response outside development) | 2 |
| POST | `/auth/email/verify` | changed (adds `purpose`) | 2 |
| GET | `/auth/verification/channels` | changed (truthful availability) | 2 |
| POST | `/auth/email/login` | **new** | 3 |
| POST | `/auth/register/email` | **new** | 3 |
| POST | `/auth/email/password/set` | **new** | 3 |
| POST | `/auth/telegram/otp/request` | **new** | 4 |
| POST | `/auth/telegram/otp/verify` | **new** | 4 |
| POST | `/auth/telegram/link/request` | **new** | 4 |
| — | bot `?start=link_<token>` | **new** handler | 4 |
| — | bot `?start=wl_<sid>` | **repaired** handler (F-04) | 4 |
| GET | `/auth/identities` | **new** | 5 |
| DELETE | `/auth/identities/telegram` | changed (last-method guard) | 5 |
| DELETE | `/auth/identities/google` | **new** | 5 |
| GET | `/auth/sessions` | **new** | 5 |
| DELETE | `/auth/sessions/:sid` | **new** | 5 |
| POST | `/auth/sessions/revoke-others` | **new** (alias of today's `/revoke-sessions`) | 5 |
| POST | `/auth/sessions/revoke-all` | **new** (old logout semantics, explicit) | 5 |
| POST | `/auth/logout` | **changed** (current session only) | 5 |
| POST | `/auth/oauth/google/link` | **new** | 6 |

Every new route is added to the route-audit baseline in the same commit
(`pnpm --filter backend route-audit:baseline`).

### 7.10 Environment variable delta

| Variable | Purpose | Default |
|---|---|---|
| `AUTH_OTP_PEPPER` | Server-side key for OTP HMACs | required outside development |
| `EMAIL_TRANSPORT` | `smtp` \| `resend` \| `brevo` \| `log` | `smtp` |
| `BREVO_API_KEY` | Brevo HTTPS API key | optional |
| `RESEND_API_KEY` | Resend HTTPS API key | optional |
| `EMAIL_ALLOW_LOG_TRANSPORT` | Allows the log transport outside development | `false` |
| `GOOGLE_CLIENT_ID` | Google audience (exists) | optional |
| `VITE_GOOGLE_CLIENT_ID` | Frontend build-time client id (exists) | optional |
| `AUTH_EMAIL_LOGIN_ENABLED` | Feature flag for the email channel | `false` until Phase 3 is verified |
| `AUTH_TELEGRAM_PUSH_OTP_ENABLED` | Feature flag for Telegram push OTP | `false` until Phase 4 is verified |
| `AUTH_DEVICE_SESSIONS_ENABLED` | Feature flag for the session registry | `false` until Phase 5 is verified |

### 7.11 Schema delta (additive only)

| Change | Detail |
|---|---|
| `User.passwordlessEmailAt` | New nullable `DateTime`; marks an email-OTP-created account (blocks auto-merge). |
| `AuthSession` | New model (section 7.7) with `@@index([userId])`, `@@index([expiresAt])`. |
| `TelegramOtpCode` | New model: `userId`, `telegramUserId`, `purpose`, `codeHash`, `salt`, `attempts`, `expiresAt`, `usedAt`, `createdAt`. |
| `EmailVerificationCode.purpose` | **No schema change** — it is already a `String`; new purpose values are data, not a migration. |

All migrations are additive (`CREATE TABLE` / `ADD COLUMN`), so a rollback is a code revert, not a
data migration. No table is dropped or rewritten.

### 7.12 Frontend delta

- `apps/frontend/src/api/client.ts` — client methods for the new endpoints; the token storage model
  is **not** changed (F-12 stays out of scope).
- `apps/frontend/src/BrowserSecurity.tsx` (+ `.css`) — the Account security view: linked methods,
  verification state, active devices, unlink/revoke actions. It follows the existing
  `BrowserWallet.tsx` / `BrowserVerification.tsx` pattern (same directory, same CSS conventions,
  same theme rules: no low-opacity pills, theme-invariant layout).
- `apps/frontend/src/FullPlatformApp.tsx` — the sign-in screen gains "Email code" and "Telegram code"
  options next to the existing password form and `SocialSignInButtons`; the workspace gains the
  Account security view.
- `apps/frontend/src/components/SocialSignInButtons.tsx` — unchanged in shape; it already hides
  Google when `VITE_GOOGLE_CLIENT_ID` is absent, and it will start rendering once it is present.
- `apps/frontend/src/i18n.ts` — new strings in **all four languages** (`am`, `en`, plus the two
  others the dictionary carries), because the repo's rule is that user-visible strings are translated
  in the same commit.

### 7.13 Bot delta

- `modules/bot/handlers/commands.ts` — handle `?start=link_<token>` and `?start=wl_<sid>`.
- `modules/bot/handlers/callbacks.ts` — the Approve/Deny callbacks for `wl_` (the functions are
  already imported there and never used).
- `modules/bot/handlers/notifications.ts` — the push-OTP sender (reuse the existing chat delivery and
  the "user blocked the bot → clear `telegramChatId`" behaviour).
- `modules/bot/middleware/auth.middleware.ts` — unchanged. The bot keeps refusing to auto-provision.

---

## 8. Free email delivery — options and recommendation

All quotas below were read from the providers' own pricing pages on 2026-11-19/20.

| Provider | Free allowance | Domain needed? | Interface | Verdict |
|---|---|---|---|---|
| **Brevo** (Sendinblue) | **300 emails/day**; free plan assigned automatically, and "once we approve your account for sending" | **No** — a single sender address can be verified on its own | SMTP + HTTPS API v3 | **Recommended.** $0, no card, no domain, works from a cloud host over HTTPS. Caveat: Brevo approves new accounts before sending, so allow a few hours. |
| Elastic Email | 100 emails/day (free plan, up to 1,000 contacts, 3,000/month) | No — single sender verification | SMTP + HTTPS API | Good fallback. |
| Mailtrap (Live Sending) | 4,000 emails/month, 150/day | No | SMTP + HTTPS API | Good fallback; also has a separate **Email Testing** sandbox for CI. |
| Resend | 3,000/month, 100/day | **Yes** — a verified domain, except `onboarding@resend.dev`, which may only send to the account owner's own address | HTTPS API | Best developer experience, but blocked until a domain is owned. **Recommended later**, when a `yekis.*` domain is bought. |
| Gmail SMTP + app password | ~500/day (Google's cap) | No | SMTP | Zero third-party signup, but needs a 2FA app password and outbound port 587 may be blocked by the host. Useful as a same-day stopgap. |
| Mailjet | Commonly a free daily allowance | No | SMTP + HTTPS API | Not verified here (the pricing page blocked automated fetches) — check before relying on it. |

**Recommendation.** Implement the transport abstraction (section 7.3) with `smtp` and `brevo` first
(the two that cover the free, no-domain cases), then add `resend` when a domain exists.

**Exact setup for Brevo ($0, about 10 minutes):**

1. Sign up at `brevo.com` (free plan, no card required).
2. **Senders → Add a new sender** → verify one real address you own (e.g. the founder's inbox).
   No domain is required for a single verified sender.
3. **SMTP & API → SMTP** → copy host, port, login and password; or **API keys → Generate a new key**
   for the HTTPS transport (`BREVO_API_KEY`).
4. Set on the host: `EMAIL_TRANSPORT=brevo`, `BREVO_API_KEY=<key>`, `EMAIL_FROM="Yekis <no-reply@verified-sender>"`.
5. Run `node scripts/test-email.mjs <your-inbox>` → expect `{"success":true,"messageId":"…"}` and one
   real message.
6. When a `yekis.*` domain is bought: verify it in Brevo (SPF + DKIM), switch `EMAIL_FROM` to it, and
   move to `resend` if preferred.

**If no provider can be configured yet.** The platform must fail closed, not pretend: `email.available`
becomes `false`, the email code endpoint answers `503 EMAIL_UNAVAILABLE`, and the console fallback is
unavailable outside development. The founder's other channels (Telegram, Google, password) keep
working. This is the honest state and it is strictly better than today's (F-01/F-02).

---

## 9. Google configuration runbook (no credentials in the repository)

**What the code needs**

| Where | Variable | Value |
|---|---|---|
| Backend env | `GOOGLE_CLIENT_ID` | the OAuth client id (`…apps.googleusercontent.com`) |
| Frontend build env | `VITE_GOOGLE_CLIENT_ID` | **the same value** |
| Backend env | `GOOGLE_CLIENT_SECRET` | optional — not used by ID-token verification (kept for a future code exchange) |

**Console steps**

1. Open `console.cloud.google.com` → create a project (e.g. **Yekis Auth**) if none exists.
2. **APIs & Services → OAuth consent screen** (Google Auth Platform): type **External**, app name
   **Yekis**, user support email and developer contact email. Add the scopes `openid`, `email`,
   `profile` — nothing else is needed, and no sensitive scope requires verification.
3. While the consent screen is in **Testing**, add the founder's Google account under **Test users**
   (up to 100). Only test users can complete the flow in Testing mode.
4. **Credentials → Create Credentials → OAuth client ID → Web application**:
   - **Authorized JavaScript origins**: `https://yekis.app.aletcloud.com` (and `http://localhost:5173`
     for local development).
   - **Authorized redirect URIs**: leave empty — the frontend uses the Google Identity Services popup,
     which returns the ID token to the page; no redirect URI is involved.
5. Copy the **Client ID**. Put it in the backend env and in the frontend build env.
6. **Deploy** (the frontend bundle is built at deploy time, so `VITE_*` needs a rebuild, not a restart).
7. **Verify**: `GET https://yekis.app.aletcloud.com/api/v1/auth/oauth/providers` must return
   `{"google":true,…}`, and the "Continue with Google" button must render and complete a sign-in.

**Caveats to expect**

- In **Testing** mode Google shows an "unverified app" warning and only allows test users — normal and
  expected; the app is not published, so no verification review is needed.
- The backend checks issuer, audience, expiry and the JWKS signature on **every** token; a tampered or
  foreign token is rejected. No client secret is required for that path.
- Google sign-in **does not merge** into an existing account: a matching address that belongs to a
  password account returns `409 ACCOUNT_LINK_REQUIRED`, and the member links Google from a signed-in
  session (section 7.6).

---

## 10. Implementation plan — phases and gates

Every phase ships its documentation **in the same commit as its code**, and no phase starts before
the previous phase's gate is met.

| Phase | Deliverable | Exit gate | Rollback |
|---|---|---|---|
| **0 — Audit** | This document | **Founder approval** | n/a (docs only) |
| **1 — Prerequisites** | Email transport abstraction + `scripts/test-email.mjs`; Google client id obtained; local Postgres/Redis up | One real email delivered; `/oauth/providers` shows `google:true` | Feature flags stay off |
| **2 — Foundations** | Close F-01, F-02, F-05, F-06, F-11: no codes outside development, truthful capabilities, peppered OTP hashes, cleanup job | S-1, S-2, S-5 tests green; the live probe that leaked `devCode` now returns no code | Revert the commit; the old behaviour is only "leaky", not broken |
| **2a — Done 2026-11-20** | **F-01 and the disclosure half of F-02 are closed** (the allowlist, every disclosure site, the truthful capability endpoint). F-05, F-06 and F-11 remain: the pepper, the strong-factor policy and the cleanup job | The live re-probe (Appendix A, E-10) returns no code; the auth suites show no new failures | Revert the commit |
| **3 — Email OTP** | `/email/login`, `/register/email`, `/email/password/set`; frontend email-code sign-in | E2E: sign in, register passwordless, set a password; enumeration and rate-limit tests green | `AUTH_EMAIL_LOGIN_ENABLED=false` |
| **4 — Telegram** | Push OTP, link token + bot handler, `wl_` repair (F-04), legacy 8-char code kept | Bot + link tests green; no duplicate accounts created; the `wl_` flow completes end to end | `AUTH_TELEGRAM_PUSH_OTP_ENABLED=false`; the legacy path still works |
| **5 — Identities & devices** | `/auth/identities`, Account security UI, `AuthSession` registry, per-device revocation, last-method guard | S-9, S-10, S-12 tests green; the device list renders and a revoked device stops working | `AUTH_DEVICE_SESSIONS_ENABLED=false`; logout falls back to today's behaviour |
| **6 — Google** | Client id in env, `/oauth/google/link`, the button renders | Live Google sign-in completes; linking works; no auto-merge | Unset the env var → the button hides again |
| **7 — Release** | Full suite, doc parity, secret scan, route baseline, deployment, live smoke, rollback note in `docs/ALETCLOUD_DEPLOYMENT.md` | 669-test baseline with **no new failures**; `check-deployment.mjs` 11/11; route baseline regenerated | Redeploy the previous build (branch fast-forward policy makes this one command) |

**Branch and deploy policy (unchanged from the merged baseline):** work happens on
`feat/multi-channel-auth` branched from `main`; `main` is canonical; the deployed branch
`fix/code-only-compliance-gaps` is fast-forwarded to `main` only after the phase is verified.

---

## 11. Test plan

**Local infrastructure** (currently down — the first task of Phase 1):

```powershell
docker compose up -d          # Postgres on :5433, Redis on :6379, MinIO on :9000/:9001
pnpm --filter backend prisma:generate
pnpm --filter backend test
```

**Known baseline:** 669 tests, 657 passing, **12 pre-existing failures** unrelated to auth. The gate
for every phase is *no new failures*, not "all green".

**New test files (proposed)**

| File | Covers |
|---|---|
| `apps/backend/tests/auth-otp-primitives.test.ts` | Hash versions, pepper requirement, TTL, attempts, purpose separation, cleanup. |
| `apps/backend/tests/auth-email-login.test.ts` | `/email/login`, `/register/email`, `/email/password/set`, enumeration safety, rate limits, `devCode` absence (S-1). |
| `apps/backend/tests/auth-telegram-otp.test.ts` | Push request/verify, generic responses, single-use claim, link-token binding (S-7). |
| `apps/backend/tests/auth-telegram-web-login.test.ts` | The repaired `wl_` flow: approve, deny, PKCE mismatch, expiry (S-8). |
| `apps/backend/tests/auth-identities.test.ts` | The identities API, unlink guards, last-method guard (S-12), no auto-merge (S-11). |
| `apps/backend/tests/auth-sessions.test.ts` | The session registry, per-device revoke, "revoke others", suspended accounts (S-9, S-14). |
| `apps/backend/tests/auth-step-up-policy.test.ts` | `email_otp` / Telegram / OAuth never satisfy a money gate (S-10). |
| `apps/backend/tests/auth-email-transport.test.ts` | Transport selection, fail-closed behaviour, `log` transport refusal in production. |

**Live smoke checks after each deploy** (read-only except the OTP request):

```powershell
Invoke-WebRequest https://yekis.app.aletcloud.com/api/v1/auth/verification/channels
Invoke-WebRequest https://yekis.app.aletcloud.com/api/v1/auth/oauth/providers
Invoke-WebRequest -Method POST https://yekis.app.aletcloud.com/api/v1/auth/email/code `
  -Body '{"email":"smoke-probe@example.com"}' -ContentType application/json
node scripts/check-deployment.mjs https://yekis.app.aletcloud.com
```

The third call must return **no code** in the body (S-1). `scripts/e2e-onboarding.mjs` covers the
signup flow end to end once the mail transport works.

---

## 12. Rollout and rollback

- **Flags first.** Each new channel ships behind its flag, default **off**, and is switched on only
  after its phase gate passes on the live host.
- **Additive migrations.** The three schema changes are additive; a rollback is a code revert.
- **Deploy branch.** `main` → fast-forward `fix/code-only-compliance-gaps` → redeploy. One command
  back to the previous build.
- **Documentation.** `docs/ALETCLOUD_DEPLOYMENT.md` gets the deployment record for each phase;
  `docs/CHANGELOG.md` gets the audit-log entry for each phase; `docs/API.md`, `docs/DATABASE.md`,
  `docs/SYSTEM_DESIGN.md` and `docs/COMPLETENESS_CHECKLIST.md` are updated **in the same commit** as
  the code they describe.

---

## 13. Risks, assumptions and open items

| # | Item | Status |
|---|---|---|
| R-1 | The email provider's approval delay (Brevo reviews new accounts) | Plan for a same-day stopgap: Gmail SMTP with an app password, or Mailtrap for staging. |
| R-2 | A free plan's daily cap (300/day) is enough for a test environment but not for a launch | Revisit at launch; the transport abstraction makes swapping providers a config change. |
| R-3 | Sender reputation: sending from a free mailbox address hurts deliverability | Solve with a real domain later; the `From` name and SPF/DKIM configuration are part of Phase 7. |
| R-4 | The founder must create the Google Cloud project (Phase 6 needs ~10 minutes in the console) | Section 9 is the runbook; the assistant can drive the browser if the founder asks. |
| R-5 | `logout` semantics change (current session vs all sessions) — **needs the founder's explicit OK** | Flagged in 7.7; default implementation revokes the current session only. |
| R-6 | The session registry writes a row per sign-in | Bounded by a 30-day expiry and the daily cleanup job. |
| R-7 | `localStorage` tokens (F-12) remain | Deliberate, documented, out of scope; mitigated by per-device revocation. |
| R-8 | Local Postgres/Redis are down, so no test run is possible yet | Phase 1 task 1: `docker compose up -d`. |

**Still open, and needed from the founder**

1. Approve or amend this document (the design decisions in section 7 are the substance of the review).
2. Confirm **R-5** (logout semantics).
3. Provide (or authorise the assistant to create) the **Brevo account** and the **Google Cloud project**;
   the credentials are added to the host environment, never to the repository.
4. Confirm the sender address to use while no domain is owned (an inbox the founder owns is enough).

---

## 14. Explicit non-goals

- No second bot, no second user table, no parallel session system.
- No `user_auth_identities` table.
- No automatic account merging, ever.
- No auto-provisioning from the bot.
- No weakening of `requireFreshAuth`, the withdrawal SMS OTP, the KYC gates or the age gate.
- No move of tokens out of `localStorage` in this phase.
- No published Google consent screen, no sensitive OAuth scopes, no Apple/Facebook configuration
  (both stay hidden until configured).
- No real money movement and no production credentials in testing.

---

## Appendix A — evidence log (2026-11-19)

| # | Check | Result |
|---|---|---|
| E-1 | `GET /api/v1/auth/verification/channels` | `{"email":{"available":true,…},"phone":{"available":true,"label":"Telegram"}}` |
| E-2 | `POST /api/v1/auth/email/code` (throwaway address) | `200 {"sent":true,…,"devCode":"097046"}` → F-01 |
| E-3 | `GET /api/v1/auth/oauth/providers` | `{"google":false,"apple":false,"facebook":false,"telegram":true,"telegramBotUsername":"ye_kis_bot"}` → F-08 |
| E-4 | `POST /api/v1/auth/telegram/web-login/start` | `200 {"sid":"…","botUrl":"https://t.me/ye_kis_bot?start=wl_…"}` → F-04 (no bot handler) |
| E-5 | Repository search for `approveWebLogin` / `denyWebLogin` | definitions + imports only, no call site → F-04 |
| E-6 | Repository search for `email_otp`, `totp` | declared in `auth-methods.ts` only; no issuer → F-05 |
| E-7 | Repository search for `purgeExpiredTelegramLoginCodes` | definition only, no scheduler → F-11 |
| E-8 | Read of `email-verification.service.ts`, `email.service.ts`, `auth.service.ts`, `oauth.service.ts`, `identity.ts`, `middleware/auth.ts`, `auth-methods.ts`, bot handlers | the findings above |
| E-9 | Provider pricing pages (Brevo, Elastic Email, Mailtrap, Resend) fetched 2026-11-19/20 | section 8 table |

## Appendix B — file map

| Concern | File |
|---|---|
| Auth routes | `apps/backend/src/modules/auth/auth.routes.ts` |
| Password auth, tokens, refresh, revocation | `apps/backend/src/modules/auth/auth.service.ts` |
| Email OTP (verification) | `apps/backend/src/modules/auth/email-verification.service.ts`, `email-verification.routes.ts` |
| Telegram codes, PKCE state | `apps/backend/src/modules/auth/telegram-code.service.ts` |
| Telegram identity, link/unlink | `apps/backend/src/modules/auth/telegram.service.ts` |
| Provider verification | `apps/backend/src/modules/auth/oauth.service.ts` |
| Shared identity rules | `apps/backend/src/modules/auth/identity.ts` |
| Strong-factor policy | `apps/backend/src/modules/auth/auth-methods.ts` |
| Step-up middleware | `apps/backend/src/middleware/auth.ts` |
| Mail transport | `apps/backend/src/lib/email/email.service.ts` |
| Redis limiter | `apps/backend/src/lib/rateLimit.ts` |
| Bot handlers | `apps/backend/src/modules/bot/handlers/{commands,callbacks,notifications}.ts` |
| Bot auth middleware | `apps/backend/src/modules/bot/middleware/auth.middleware.ts` |
| Schema | `apps/backend/prisma/schema.prisma` |
| Env | `apps/backend/src/config/env.ts` |
| Frontend sign-in | `apps/frontend/src/FullPlatformApp.tsx`, `components/SocialSignInButtons.tsx`, `api/client.ts`, `i18n.ts` |
| Deployment runbook | `docs/ALETCLOUD_DEPLOYMENT.md` |
