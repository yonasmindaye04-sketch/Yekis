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
