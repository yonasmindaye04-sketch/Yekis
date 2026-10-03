# Yekis_jobs Frontend

React 19, TypeScript, and Vite frontend for the Yekis_jobs browser experience and Telegram Mini App entry path.

## Main Surfaces

- Registration/login and Telegram session bootstrap
- Tier 1 identity upload/status and Tier 2 upgrade request
- Client jobs, proposal decisions, contracts, funding, delivery acceptance, and disputes
- Freelancer discovery, proposals, contract signing, milestone delivery, wallet, and withdrawal
- Notifications, manual top-ups, and support chat
- Staff KYC/top-up queues, dispute resolution, and TMS review

The API adapter is `src/api/client.ts`. The end-to-end workflow UI is split across `FullPlatformApp.tsx`, `WorkflowWorkspace.tsx`, `BrowserVerification.tsx`, `BrowserWallet.tsx`, `StaffDashboard.tsx`, and `StaffCompliancePanel.tsx`.

## Run

Start the backend and local infrastructure first, then:

```bash
pnpm --filter frontend dev
```

Open `http://127.0.0.1:5173`. During local development, Vite proxies relative `/api` requests to the backend.

## Build And Lint

```bash
pnpm --filter frontend build
pnpm --filter frontend lint
```

The production build was verified on 2026-08-07. See the root `WALKTHROUGH.md` for user journeys and `API.md` for current server routes.

## Analytics (GA4)

Google Analytics 4 is wired in `src/analytics.ts` and is **consent- and environment-gated** — gtag.js is injected only when ALL of these hold:

1. **Production build** (`import.meta.env.PROD`). Local `vite dev` and `vite preview` never send real events (preview can be verified via DebugView, see below).
2. **`VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX`** is set in `apps/frontend/.env` (or the host environment). It is never hardcoded — use separate GA4 properties/IDs for dev, staging, and production.
3. **Cookie consent** — the user accepted "Analytics" in the `CookieBanner` (stored in `localStorage.yekis_consent`). Declining or ignoring the banner means zero analytics traffic. Ethiopia has no GDPR-equivalent enforcement yet, but this keeps us compliant for cross-border users.

### Page views

`send_page_view` is disabled in the gtag config. Because this is a state-based SPA (no URL router), `page_view` events are sent manually on every client-side "route" change with virtual paths:

| Virtual path | Meaning |
| --- | --- |
| `/`, `/faq`, `/fees`, `/privacy`, `/terms`, `/about`, `/case-studies`, `/404`, `/thank-you-*` | Marketing pages |
| `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` | Auth screens |
| `/app/overview`, `/app/jobs`, `/app/gigs`, `/app/contracts`, `/app/wallet`, `/app/chat`, `/app/profile`, `/app/profile-edit`, `/app/verification`, `/app/cases`, `/app/settings` | Browser workspace views (not tracked on the staff dashboard) |
| `/mini/welcome`, `/mini/home`, `/mini/jobs`, `/mini/escrow`, `/mini/wallet`, `/mini/kyc`, `/mini/disputes` | Telegram Mini App screens |

Params: `page_name`, `page_title`, `page_location` (origin + virtual path).

### Funnel events

Event parameters are deliberately PII-free: **no emails, names, phone numbers, account identifiers, or user-tied amounts** are ever sent.

| Event | Fires when | Parameters |
| --- | --- | --- |
| `signup_started` | Registration form becomes visible | `method`: `email` \| `mobile`, `user_type`: `client` \| `freelancer` |
| `signup_completed` | Account created (register API succeeded) | `user_type`: `client` \| `freelancer` |
| `login` | Sign-in succeeded | `method`: `email` \| `mobile` \| `telegram` \| `google` \| `apple` \| `facebook` |
| `auth_abandoned` | Auth screen closed without completing, after input was entered (browser: any exit; mini app: back out of the mobile form) | `flow`: `login` \| `register` \| `forgot-password` \| `reset-password` |
| `job_posted` | Client publishes a job | — |
| `proposal_submitted` | Freelancer submits a proposal | — |
| `contract_signed` | Client or freelancer accepts the agreement | `user_type`: signer role |
| `escrow_funded` | Milestone funded from wallet, or gig order funded | `source`: `contract_milestone` \| `gig_order` |
| `milestone_delivered` | Freelancer submits deliverables | — |
| `milestone_accepted` | Client accepts delivery and escrow releases to the freelancer wallet | — |
| `payout_requested` | Freelancer withdrawal request accepted by the backend | — |
| `payout_completed` | Staff member confirms the payout settled on the payment rail (best-effort — fires only if the staff browser has analytics consent) | `provider`: `TELEBIRR` \| `CBE_BIRR` \| `M_PESA` |
| `cta_clicked` | Landing hero CTA clicked ("I Need to Hire" / "I Want to Work") | `cta_label`: `hire` \| `work` |
| `faq_expanded` | FAQ question expanded | `question` (the question text) |

Register `user_type`, `method`, `flow`, `source`, `cta_label`, `question` as event-scoped custom dimensions in GA4 (Admin → Data display → Custom definitions) to break reports down by them. (`language_changed` helper exists in `analytics.ts` for when the language toggle ships.)

### Verifying with GA4 DebugView

1. Set `VITE_GA_MEASUREMENT_ID` in `apps/frontend/.env`, then make a production build: `pnpm --filter frontend build && pnpm --filter frontend preview`.
2. Open the preview URL with **`?ga_debug=1`** appended (or run `localStorage.setItem("yekis_ga_debug", "1")` and reload). This enables gtag `debug_mode` and lifts the localhost block.
3. Accept analytics cookies in the banner.
4. In the GA4 property: **Admin → DebugView** — events appear within ~30 seconds, tagged with `debug_mode`, and stay out of standard reports until you ship to the real domain.

In `vite dev`, calls are printed to the console as `[analytics] <event> <params>` (with PII warnings) and nothing is sent to Google.
