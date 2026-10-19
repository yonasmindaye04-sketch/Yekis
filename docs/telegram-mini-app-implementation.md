# Telegram Mini App Implementation Guide

This document is the implementation plan and how-to guide for adding a Telegram Mini App experience to Yekis. It must be completed before writing application code for the Mini App.

Primary Telegram reference: https://core.telegram.org/bots/webapps

## 1. Goal

Build a Telegram Mini App that lets users access the Yekis marketplace inside Telegram while preserving the same platform rules around KYC, escrow, disputes, wallet balances, anti-circumvention controls, audit trails, and Ethiopian compliance.

The Mini App should not become a separate product. It should be a Telegram-native entry point into the same backend and trust model.

## 2. Product Scope

The first Mini App release should support:

1. Telegram-based session start using signed Telegram `initData`.
2. Role-aware dashboard for client, freelancer, and mediator users.
3. Job browsing and proposal entry.
4. Escrow milestone status and milestone actions.
5. Freelancer KYC status display using Fayda ID photo plus selfie-with-ID review.
6. Wallet balance display, Telebirr/CBE top-up instructions, and receipt upload.
7. Dispute status display and dispute escalation entry points.
8. English and Amharic language support aligned with the current frontend.

The first release should not require users to submit business/legal registration data inside the Mini App. Clients can start with Telegram identity and receipt-based top-ups. Freelancers must submit a Fayda ID photo and a selfie holding the same ID before payout approval.

## 2.1 Simplified Mini App Operating Model

The Mini App uses a lightweight flow:

1. Telegram identity starts the session.
2. Clients send money outside the app to the displayed Telebirr or CBE Bank account.
3. Clients enter the exact amount sent, the transaction/reference number, and upload the receipt.
4. Admins review the receipt before crediting wallet balance or marking escrow as funded.
5. Freelancers upload their Fayda ID number, a photo of the Fayda ID, and a selfie holding the same ID.
6. Admins review freelancer KYC before enabling freelancer payouts.
7. Escrow release remains controlled by milestone state and client approval.

Do not request TIN, commercial registration, business license, or other legal registration fields in the first Mini App flow.

## 3. Current Project Fit

The repository already has:

1. `apps/frontend`: Vite + React application.
2. `apps/backend`: Express API with versioned routes under `/api/v1`.
3. Existing modules for auth, KYC, jobs, contracts, escrow, disputes, wallet-like state, audit logging, and platform compliance behavior.
4. Environment validation in `apps/backend/src/config/env.ts`.

The Telegram Mini App should reuse this structure:

1. Add Telegram-specific frontend utilities in `apps/frontend/src`.
2. Add Telegram-specific backend auth under `apps/backend/src/modules/auth` or `apps/backend/src/modules/telegram`.
3. Extend existing auth/session behavior instead of replacing it.
4. Keep all sensitive Telegram validation on the backend.

## 4. Telegram Requirements

Telegram Mini Apps are web apps opened from Telegram clients. The frontend is a normal web application, but Telegram injects launch data and exposes a JavaScript bridge.

Implementation requirements:

1. Add the Telegram Web App script to the frontend HTML head:

   ```html
   <script src="https://telegram.org/js/telegram-web-app.js"></script>
   ```

2. Use `window.Telegram.WebApp` on the client for UI integration:
   - `ready()`
   - `expand()`
   - `MainButton`
   - `BackButton`
   - `themeParams`
   - `colorScheme`
   - `initData`
   - `initDataUnsafe`

3. Send raw `initData` to the backend for verification.

4. Never trust `initDataUnsafe` for authentication or authorization. It can be used for optimistic UI display only before the backend responds.

5. Validate launch data server-side using the bot token and Telegram's documented HMAC validation algorithm.

6. Use HTTPS in all deployed environments. Telegram Mini Apps should be served from a secure public URL.

## 5. BotFather Setup

1. Create or choose the platform bot in BotFather.
2. Configure bot name, username, description, and profile visuals.
3. Configure the Mini App web app URL.
4. Configure the menu button behavior so users can open the Mini App from the bot.
   - Use `Menu Button` or `Open App` depending on the BotFather UI.
   - Set a friendly title like `Yekis_jobs`, `Open App`, or `Escrow`.
5. Use the same public Cloudflare Tunnel URL for both the Main App and menu button entry point during local testing.
   - This is required when `Same-Origin Restriction` is enabled and the WebApp origin must match.
   - Example: `https://<random>.trycloudflare.com`
   - Both the Main App URL and the menu button URL should use this same HTTPS URL.
6. Store the bot token securely as `TELEGRAM_BOT_TOKEN` in backend environment variables.
7. Never expose the bot token to frontend code.

Recommended environment variables:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_MINI_APP_URL=https://<your-tunnel>.trycloudflare.com
TELEGRAM_ALLOWED_ORIGINS=https://<your-tunnel>.trycloudflare.com
```

### BotFather field guidance

- `Main App` URL: `https://<your-tunnel>.trycloudflare.com`
- `Menu Button` / `Open App` URL: same as the Main App URL
- `Menu Button` label: `Yekis_jobs`, `Open App`, or a brief product name
- Launch mode: `Fullsize` is recommended for the Mini App experience
- `Same-Origin Restriction`: keep enabled for safe WebApp SDK access

## 6. Frontend Architecture

Add a small Telegram integration layer instead of scattering Telegram checks across UI components.

Recommended files:

```text
apps/frontend/src/telegram/types.ts
apps/frontend/src/telegram/webApp.ts
apps/frontend/src/telegram/useTelegramMiniApp.ts
apps/frontend/src/api/client.ts
apps/frontend/src/api/telegramAuth.ts
```

Responsibilities:

1. `types.ts`: Define TypeScript types for Telegram WebApp globals used by the app.
2. `webApp.ts`: Safely read `window.Telegram?.WebApp`, with browser fallback.
3. `useTelegramMiniApp.ts`: React hook for launch state, theme, viewport, and Telegram UI buttons.
4. `api/client.ts`: Shared API fetch wrapper.
5. `telegramAuth.ts`: Send `initData` to the backend and receive Yekis tokens/session.

Frontend startup flow:

1. Load app.
2. Detect whether the app is running inside Telegram.
3. If Telegram exists, call `Telegram.WebApp.ready()`.
4. Optionally call `Telegram.WebApp.expand()` for a fuller workspace.
5. Read `Telegram.WebApp.initData`.
6. POST `initData` to `/api/v1/auth/telegram`.
7. Store returned access token in memory or secure client state.
8. Render the platform dashboard using verified backend user/session data.
9. Use Telegram theme colors where available, while keeping Yekis accessible and readable.

Browser fallback:

1. If `window.Telegram?.WebApp` is absent, show the normal web app experience.
2. In development, allow a mock Telegram user only behind an explicit development flag.
3. Do not accept mocked Telegram authentication in production.

## 7. Backend Architecture

Add a Telegram auth endpoint:

```text
POST /api/v1/auth/telegram
```

Request body:

```json
{
  "initData": "query_id=...&user=...&auth_date=...&hash=..."
}
```

Response body:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "...",
    "ucid": "...",
    "role": "CLIENT"
  },
  "telegram": {
    "id": 123456789,
    "username": "example",
    "firstName": "Example"
  }
}
```

Recommended backend files:

```text
apps/backend/src/modules/auth/telegram.service.ts
apps/backend/src/modules/auth/telegram.routes.ts
apps/backend/src/modules/auth/telegram.validation.ts
```

Backend responsibilities:

1. Parse the raw `initData` query string.
2. Reject missing `hash`, missing `auth_date`, or malformed `user`.
3. Validate the signature using the bot token.
4. Reject stale launch data using `auth_date`.
5. Find an existing user linked to the Telegram user ID or create/link a platform user according to the onboarding policy.
6. Issue standard Yekis JWT access and refresh tokens.
7. Record audit events for Telegram login and account linking.
8. Apply rate limiting to the endpoint.

## 8. Telegram `initData` Validation

Server-side validation must follow Telegram's documented algorithm:

1. Parse `initData` as URL query parameters.
2. Remove the `hash` parameter.
3. Sort remaining key/value pairs alphabetically by key.
4. Join pairs as `key=value`, separated by newline characters.
5. Create the secret key with HMAC-SHA256 using the text `WebAppData` as the key and the bot token as the message.
6. Create the data check hash with HMAC-SHA256 using the secret key and the sorted data-check string.
7. Compare the generated hash to the received `hash` using a timing-safe comparison.
8. Check `auth_date` freshness.

Recommended freshness rule:

```text
Reject initData older than 24 hours.
```

For high-risk operations such as escrow release, payout withdrawal, or KYC changes, require a normal authenticated API call after Telegram login and rely on existing platform authorization checks. Do not treat Telegram launch validation as a one-time forever identity proof.

## 9. Data Model Changes

Add Telegram account linkage to the backend data model.

Recommended user fields or relation:

```text
telegramId
telegramUsername
telegramFirstName
telegramLastName
telegramPhotoUrl
telegramLinkedAt
telegramLastLoginAt
```

If Prisma schema changes are needed:

1. Add the fields to `User`, or create a separate `TelegramAccount` model if multiple identity providers are expected.
2. Add a unique index on `telegramId`.
3. Create a migration.
4. Update seed/test data if needed.

Recommended safer model:

```text
User 1 - 0..1 TelegramAccount
```

This keeps Telegram identity separate from core user identity and leaves room for email, phone, Fayda, and other login methods.

## 10. Account Linking Policy

Telegram users can arrive before having a full Yekis account. The app needs a clear policy.

Recommended release-one policy:

1. If Telegram ID is already linked, log the user in.
2. If Telegram ID is new and Telegram provides a verified user object, create a limited Yekis account.
3. Set default role to `CLIENT` until the user chooses a role.
4. Require phone/email completion before contract, escrow, KYC, or payout actions.
5. Require existing KYC rules before increasing payout limits or releasing high-risk funds.
6. Allow a logged-in web user to link Telegram from account settings in a later release.

## 11. Security Rules

1. The bot token must only exist on the backend.
2. `initDataUnsafe` must not authorize anything.
3. Use timing-safe hash comparison.
4. Reject stale launch data.
5. Rate-limit `/api/v1/auth/telegram`.
6. Keep existing JWT auth for all platform API actions.
7. Use HTTPS for the Mini App URL.
8. Keep CORS restricted to production frontend origins before launch.
9. Do not send KYC documents, tax IDs, or escrow evidence through Telegram chat messages.
10. Record audit events for login, account creation, account linking, escrow actions, payout actions, and dispute actions.

## 12. Telegram UI Integration

Use Telegram UI controls where they improve the Mini App:

1. `MainButton`: primary action for the current screen, such as Submit Proposal, Fund Escrow, Release Funds, or Continue KYC.
2. `BackButton`: navigate between app screens instead of browser history alone.
3. `themeParams`: align background, text, and buttons with Telegram light/dark mode.
4. `HapticFeedback`: optional confirmation feedback for successful actions.
5. `showAlert` or `showConfirm`: important confirmations, especially payout or release flows.

Do not put every action in `MainButton`. Use it for the dominant action on the current screen only.

## 13. Platform Screen Mapping

Mini App screens should map to existing platform areas:

```text
Dashboard -> Current overview metrics and trust status
Jobs -> Job list, job detail, proposal submission
KYC -> Fayda ID photo, selfie-with-ID upload, review status
Escrow -> Contract milestones and escrow actions
Disputes -> Case status and escalation controls
Wallet -> Balance, payout eligibility, payout entry point
Profile -> Role, language, linked Telegram identity, account completion
```

The Mini App viewport is smaller than desktop, so each area should become a focused mobile workflow rather than the current wide dashboard layout.

## 14. API Integration Plan

Release-one endpoints:

```text
POST /api/v1/auth/telegram
GET  /api/v1/me
GET  /api/v1/jobs
POST /api/v1/jobs/:id/proposals
GET  /api/v1/escrow/milestones
POST /api/v1/escrow/fund
POST /api/v1/escrow/fund-from-wallet
POST /api/v1/escrow/milestones/:id/submit
POST /api/v1/escrow/milestones/:id/accept
POST /api/v1/escrow/milestones/:id/dispute
GET  /api/v1/disputes
GET  /api/v1/wallet
POST /api/v1/escrow/topups/manual
POST /api/v1/kyc/freelancer-fayda-selfie
```

If some endpoints are not implemented yet, the frontend should call a typed API layer so mock/demo state can be replaced cleanly later.

Manual top-up request:

```text
multipart/form-data
amountEtb
   rail = TELEBIRR | CBE_BIRR
senderName
senderReference
receipt
```

Freelancer Fayda review request:

```text
multipart/form-data
faydaIdNumber
idPhoto
selfieWithId
```

## 15. Local Development

1. Start the backend.

   ```powershell
   pnpm run dev:backend
   ```

2. Start the frontend.

   ```powershell
   pnpm run dev:frontend
   ```

3. Start a Cloudflare Tunnel on the frontend port.

   ```powershell
   pnpm run tunnel:cloudflare
   # or: cloudflared tunnel --url http://localhost:5173
   ```

4. Copy the public HTTPS Cloudflare Tunnel URL from the cloudflared output.
   - Example: `https://<random>.trycloudflare.com`

5. In BotFather, set the `Main App` URL to the Cloudflare Tunnel URL.
6. In BotFather, set the menu button / open app URL to the same Cloudflare Tunnel URL.
   - Use a friendly title such as `Yekis_jobs`, `Escrow`, or `Open App`.

7. If `Same-Origin Restriction` is enabled, ensure both URLs use the same origin.
8. Set backend CORS to allow the tunnel origin during testing.
   - Example: `https://<random>.trycloudflare.com`

9. Use real Telegram launch data for authentication tests.
10. Keep the bot token secret and only configured in backend env variables.

### Cloudflare Tunnel troubleshooting

- If cloudflared is not found, install it from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/ and ensure it is on PATH.
- Quick tunnels (`*.trycloudflare.com`) are ephemeral: the URL changes every run. Update BotFather + FRONTEND_URL each time.
- If the frontend cannot reach `/api`, verify that the Vite proxy is running, and that the backend is available on `http://localhost:4000`.
- Do not run a second tunnel for the backend when using this setup; the Vite proxy forwards `/api` to localhost:4000.

### Recommended local command sequence

```powershell
pnpm run dev:backend
pnpm run dev:frontend
pnpm run tunnel:cloudflare
```

Then set BotFather URLs to the Cloudflare Tunnel HTTPS URL and test from Telegram.

## 15.1 Current Progress

The current implementation has completed these Telegram Mini App setup and local development steps:

- Added `apps/frontend/vite.config.ts` proxy configuration to forward `/api` requests to `http://localhost:4000`.
- Updated `apps/frontend/src/api/client.ts` and `apps/frontend/src/api/telegramAuth.ts` to default `VITE_API_BASE_URL` to `""`, enabling relative `/api` requests through the Vite proxy.
- Confirmed local Telegram Mini App testing can use a single Cloudflare Tunnel to `5173`.
- Confirmed BotFather `Main App` and menu button URLs should point to the same public Cloudflare Tunnel URL.
- Confirmed `Same-Origin Restriction` should remain enabled for safe WebApp SDK usage.
- Confirmed the frontend tunnels through Cloudflare while the backend continues to run on `localhost:4000`.
- Vite `allowedHosts` is set to `true`, so Cloudflare Tunnel (`*.trycloudflare.com`) Host headers are accepted during local testing.
- Added the wallet-funded escrow path used by the Mini App's `Fund with Approved Balance` action.
- Added the missing authenticated milestone listing route used by the Mini App.
- Added separate private object storage paths for payment receipts instead of classifying receipts as KYC documents.
- Made multipart `amountEtb` parsing accept the string fields sent by browser `FormData`.
- Approved Fayda ID plus selfie-with-ID review now promotes the KYC record to payout-eligible Tier 2.

## 16. Testing Plan

Backend tests:

1. Valid `initData` is accepted.
2. Modified user payload is rejected.
3. Modified `auth_date` is rejected.
4. Missing `hash` is rejected.
5. Stale `auth_date` is rejected.
6. Unknown Telegram user creates or enters onboarding according to policy.
7. Existing Telegram user receives normal JWT tokens.

Frontend tests:

1. App renders outside Telegram without crashing.
2. App detects Telegram WebApp when present.
3. Raw `initData` is sent to the backend.
4. Failed Telegram auth shows a recoverable error.
5. Theme values are applied without breaking readability.
6. Back button and main button are registered and cleaned up per screen.

Manual Telegram tests:

1. Open app from bot menu.
2. Confirm `ready()` removes Telegram loading state.
3. Confirm viewport expansion works.
4. Confirm login session is created.
5. Confirm role and KYC gates still block restricted actions.
6. Confirm escrow and payout confirmation prompts are clear.

## 17. Rollout Checklist

Before launch:

1. `TELEGRAM_BOT_TOKEN` is configured in production.
2. Mini App URL is HTTPS.
3. BotFather menu button points to production URL.
4. Backend validates `initData` server-side.
5. CORS allows only approved frontend origins.
6. Helmet and rate limits are active.
7. Audit logs capture Telegram login and linked account events.
8. Freelancer payouts require approved Fayda/selfie review.
9. Receipt uploads are private and reviewed by admins before balance credit.
10. Privacy policy mentions Telegram account data, uploaded receipts, Fayda ID photos, and selfie-with-ID images.
11. Support path exists for users who linked the wrong Telegram account.

## 18. Implementation Order

1. Add this documentation.
2. Add backend environment variables for Telegram config.
3. Add backend Telegram `initData` validation utility.
4. Add backend `POST /api/v1/auth/telegram` endpoint.
5. Add or migrate Telegram account linkage in Prisma.
6. Add backend tests for signature validation and auth flow.
7. Add Telegram script to frontend HTML.
8. Add frontend Telegram WebApp types and hook.
9. Add frontend Telegram auth client.
10. Connect app startup to Telegram login.
11. Adapt existing dashboard into a mobile-first Mini App layout.
12. Add manual top-up receipt upload to the wallet flow.
13. Add freelancer Fayda ID plus selfie-with-ID upload to the KYC flow.
14. Add Telegram MainButton and BackButton behavior for the main workflows.
15. Run typecheck, tests, and a local Telegram tunnel test.

## 19. Acceptance Criteria

The Telegram Mini App is ready when:

1. It opens from Telegram and shows the Yekis experience.
2. It authenticates using verified Telegram launch data.
3. It does not trust client-only Telegram data for protected actions.
4. It works outside Telegram for development and normal web access.
5. It preserves role, receipt approval, freelancer KYC, escrow, payout, and dispute gates.
6. It passes backend validation tests and frontend build/type checks.
7. It has a clear deployment checklist and BotFather setup path.
