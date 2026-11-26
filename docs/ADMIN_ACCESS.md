# Admin Portal Access Guide

Last updated: 2026-11-26

## How Staff Access Works

Any user whose `staffRole` in the database is `COMPLIANCE_OFFICER` or `ADMIN` is **automatically
redirected** to the Staff Dashboard immediately after logging in — no separate URL, no admin-only
login page is required. They use the same login form as regular users.

```
https://your-domain.com  →  Sign in  →  Automatic redirect to Staff Dashboard
```

> **There is intentionally no self-service staff registration.** Staff accounts must be created
> directly in the database by a database administrator to prevent privilege escalation.

---

## Step 1 — Create a Staff Account

### Option A — SQL (direct Prisma/PostgreSQL)

Run this against your database. Replace the values in `<angle brackets>`.

```sql
-- 1. Insert the user (skip if the account already exists)
INSERT INTO "User" (
  id, ucid, email, phone, "passwordHash", role,
  "dateOfBirth", "languagePreference", "staffRole",
  "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  'STAFF-' || substr(gen_random_uuid()::text, 1, 8),
  '<staff@yourdomain.com>',
  '<+251911000000>',
  -- Argon2id hash of a strong password (generate with: node -e "require('./apps/backend/src/lib/password.ts')..." or see below)
  '<argon2id_hash_here>',
  'CLIENT',            -- marketplace role (not used for staff)
  '1990-01-01',
  'en',
  'COMPLIANCE_OFFICER', -- or 'ADMIN', 'SUPER_ADMIN'
  now(),
  now()
);

-- 2. Create required wallet and KYC rows
INSERT INTO "Wallet" (id, "userId", "balanceMinor", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 0, now(), now() FROM "User" WHERE email = '<staff@yourdomain.com>';

INSERT INTO "KycRecord" (id, "userId", tier, status, "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'TIER_1', 'VERIFIED', now(), now() FROM "User" WHERE email = '<staff@yourdomain.com>';
```

### Option B — Prisma seed script (recommended for local development)

Add a seed entry in `apps/backend/prisma/seed.ts`:

```ts
await prisma.user.upsert({
  where: { email: 'admin@yekis.et' },
  update: {},
  create: {
    email: 'admin@yekis.et',
    phone: '+251911000001',
    passwordHash: await hashPassword('ChangeMe123!'),
    role: 'CLIENT',
    dateOfBirth: new Date('1990-01-01'),
    staffRole: 'ADMIN',
    kyc: { create: { tier: 'TIER_1', status: 'VERIFIED' } },
    wallet: { create: { balanceMinor: 0 } },
  },
});
```

Then run:

```bash
pnpm --filter backend exec prisma db seed
```

### Option C — Provision from inside the application (a host you cannot reach with a database client)

**This is the method to use when the database is not reachable from your machine** — which is the
case for the AletCloud deployment, whose managed PostgreSQL is published with `publicAccess: false`
and is reachable only from the application's own network. Without it, a perfectly healthy host can
be running with no usable administrator at all and nobody able to operate it.

The API process can provision the first administrator for itself, at start-up, when the operator
asks for it through the environment. See `apps/backend/src/bootstrap/admin.ts`.

**Set these two environment variables on the app, then deploy:**

| Variable | Meaning |
|---|---|
| `ADMIN_BOOTSTRAP_EMAIL` | The address the administrator signs in with. |
| `ADMIN_BOOTSTRAP_PASSWORD` | The password. **14 characters minimum.** It is never logged, never written to a file, and never leaves the host. |

Two optional flags, both off by default:

| Variable | Meaning |
|---|---|
| `ADMIN_BOOTSTRAP_ALLOW_ADDITIONAL=true` | Permits creating a *second* full-access administrator while one already exists. Without it, the run is refused. |
| `ADMIN_BOOTSTRAP_RESET=true` | Permits resetting the password of the account that already holds `ADMIN_BOOTSTRAP_EMAIL`. Without it, an existing account is **never** touched. A reset also bumps `sessionVersion`, which retires every session already issued for that account. |

On the next deployment the container creates the account and logs one line:

```
Admin bootstrap created the platform administrator account
```

**Then remove both variables and deploy again.** The account persists; the password stops sitting
in the host's environment. This is the intended end state — the variables are a tool for the moment
an administrator is needed, not a standing configuration.

#### If the address already has an account

This is the common case on a host whose database was seeded and then had its demo credentials
rotated away: the row exists, but its password is a value nobody holds. The bootstrap will refuse
and say so:

```
Admin bootstrap skipped: the address already has an account, and it was left untouched.
```

That refusal is the point — a stale environment variable must never silently reset somebody's
password. To re-credential the account on purpose, add `ADMIN_BOOTSTRAP_RESET=true` to the same
deployment. The log then reads:

```
Admin bootstrap reset the password of an existing account by explicit operator request
```

A reset changes **only** the password hash, the `passwordSetAt` stamp and `sessionVersion` (so
every token already issued for that account stops working). It does not change `staffRole`, the
KYC record, the wallet or the date of birth. If the existing account already holds a staff role,
that role is kept — `ADMIN` and `SUPER_ADMIN` both hold all 30 permissions, so neither is weaker
than the other.

What the bootstrap will **not** do, by design:

- It will not touch an account that already exists (unless `ADMIN_BOOTSTRAP_RESET=true`).
- It will not create a second full-access administrator (unless `ADMIN_BOOTSTRAP_ALLOW_ADDITIONAL=true`).
- It will not invent a date of birth — `User.dateOfBirth` stays empty, because a fabricated one
  corrupts KYC data (AML integrity).
- It will not grant anything the role matrix does not already grant. It creates a login and sets
  `staffRole`; it does not touch escrow state, step-up policy, balances or any money path. The
  wallet it opens is empty.

The account it creates is a `SUPER_ADMIN`, which holds all 30 permissions in the matrix. To grant a
*different*, narrower role instead (`FINANCE_ADMIN`, `SUPPORT`, `COMPLIANCE_ADMIN`, …), set
`ADMIN_BOOTSTRAP_EMAIL` to that operator's address, let the bootstrap create the account, and then
change the role from the Operations Console's **Admins & Permissions** page.

---

## Step 2 — Log In

1. Open the Yekis web app (default local: `http://localhost:3000`)
2. Click **Sign in** (or "Get started" then "Sign in")
3. Enter the staff email and password
4. The app automatically detects `staffRole` from the `/api/v1/auth/me` response and redirects to
   the **Staff Dashboard** — no additional steps needed

---

## Staff Dashboard Capabilities

| Section | What staff can do |
|---|---|
| **Support desk** | Read all user conversations, reply as Yekis team, close/reopen threads |
| **Receipt approvals** | Approve or reject manual top-up receipts |
| **Identity reviews** | Approve or reject Fayda KYC submissions |
| **Open disputes** | View and mediate milestone disputes |
| **Mediation decisions** | Apply RELEASE / REFUND / PARTIAL_SPLIT outcomes |
| **AML review queue** | Review TMS flags, dismiss or record a Suspicious Transaction Report |

---

## Staff Roles

| `staffRole` value | Access level |
|---|---|
| `SUPER_ADMIN` | All 30 permissions. The founder's own account. |
| `ADMIN` | All 30 permissions (legacy full-access). |
| `OPERATIONS_ADMIN` | Operations, contracts, jobs, gigs, escalations. |
| `FINANCE_ADMIN` | Escrow, payouts, ledger, reconciliation, top-ups, receipts. |
| `COMPLIANCE_ADMIN` | KYC decisions, PEP and sanctions. |
| `DISPUTE_MEDIATOR` | Dispute queue and mediation. |
| `COMPLIANCE_OFFICER` | Full access to KYC, top-up, dispute, TMS, and support queues (legacy). |
| `SUPPORT` | Support desk, reports queue, KYC queue (read-mostly). |

The full matrix is in `docs/SYSTEM_DESIGN.md` §3.16 and is served live at
`GET /api/v1/admin/permissions/matrix`.

---

## Staff Chat — Live Inbox Features

The support desk inside the Staff Dashboard provides:

- **Auto-refresh every 8 seconds** — new user messages appear without a page reload
- **Unread badge** — red dot and count shows how many open conversations have unread messages
- **OPEN / ALL filter** — toggle between active and all conversations
- **Close conversation** — mark a resolved thread as CLOSED; reply box locks automatically
- **Reopen** — reopen a closed conversation from the thread view
- **Message preview** — last message body shown in the conversation list row
- **Relative timestamps** — "2 min ago", "3h ago", etc.

---

## Generating a Password Hash

The platform hashes passwords with **Argon2id** (`@node-rs/argon2`, 64 MiB / 3 passes / 4 lanes),
not bcrypt. `apps/backend/src/lib/password.ts` owns the parameters, so a hash generated anywhere
else must use the same ones to verify.

```bash
# From apps/backend, with tsx available:
node_modules/.bin/tsx.CMD -e "import { hashPassword } from './src/lib/password.ts'; hashPassword('YourStrongPassword!').then(console.log);"
```

## Security Notes

- Staff passwords must be strong (≥ 14 characters, mixed case, numbers, symbols)
- Staff accounts should not be shared — create one per operator
- The `staffRole` field cannot be set through any public API endpoint; it requires direct database
  access, the start-up bootstrap, or a privileged seed script
- All compliance decisions (KYC approvals, dispute resolutions, TMS dismissals) are written to the
  immutable `AuditLog` table
