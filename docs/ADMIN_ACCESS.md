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

## Removing the seeded demo world and automated test accounts

A host that was seeded for a demonstration still contains the demo staff, seller and clients from
`prisma/seed.ts` / `prisma/demoActivity.ts`, plus the accounts the end-to-end scripts created under
`@example.com` (reserved for testing by RFC 2606). Neither belongs on a platform real members use.

`apps/backend/src/bootstrap/demoCleanup.ts` removes them from inside the API process — the same way
the administrator bootstrap works, because the managed database on AletCloud is not reachable from a
database client. It is inert unless `DEMO_CLEANUP` is set.

| Variable | Meaning |
|---|---|
| `DEMO_CLEANUP=dry-run` | Reports the plan and deletes nothing. |
| `DEMO_CLEANUP=confirm` | Performs the delete. |

**Run the dry run first.** Set `DEMO_CLEANUP=dry-run` before the deployment that carries the
feature, deploy, and read the start-up log:

```
Demo cleanup dry run: nothing was deleted
```

The structured fields on that line are the plan: `targetCount`, `targets`, `userCountBefore`,
`totalRows`, `counts` (per table) and `blockers`. A non-empty `blockers` list means a row in the set
is shared with an account that is not a target; the run refuses and deletes nothing. Resolve that
row by hand (or narrow the target list) before continuing.

Then set `DEMO_CLEANUP=confirm` and deploy again. The log line is:

```
Demo cleanup finished: the seeded demo and automated test data are gone
```

with `deleted` (per table), `totalDeleted`, `totalRowsPlanned`, `cascaded` and `userCountAfter`.
**Remove `DEMO_CLEANUP` and deploy once more**; the cleanup is a one-off, not a standing
configuration.

### What is deleted, and what is not

Targets are the six seeded demo addresses (`compliance@`, `support@`, `seller@`, `client@`,
`freelancer@` and `newbie@yekis.et`) and every `@example.com` address. The purge reads the live
foreign-key graph and removes the rows those accounts own: contracts, milestones, payments,
payouts, wallets, top-ups, gigs and their packages, orders, jobs, proposals, reviews, disputes and
their evidence, conversations and messages, KYC records and documents, notifications, consent
records, verification codes, profile views, skills, avatars and portfolio items.

Three things are deliberately kept:

- **`admin@yekis.et`** is excluded in SQL, checked again in TypeScript and asserted before any
  delete. The run also refuses any *other* staff account except the two seeded demo identities
  (`compliance@` and `support@`).
- **Audit history.** `AuditLog.userId` is `ON DELETE SET NULL`, so audit rows survive with a null
  actor. Deleting them would destroy the compliance trail. The per-record `KycReviewEvent` rows that
  belong to a demo KYC record are removed with that record (the foreign key is `RESTRICT`); the
  `AuditLog` entry for the same decision remains. For the same reason, a support ticket that a real
  member opened and a demo agent was merely *assigned* to is kept and unassigned; only tickets the
  demo account opened are removed.
- **Real-member domains.** `@guest.invalid`, `@erased.invalid` and `@yekis.local` (Telegram) never
  match the selector. The two GDPR erasure tombstones are evidence and stay.

If any contract, review, gig order, job or proposal in the set names a member who is not a target,
the run refuses **before writing anything** and reports the table. That is the guard against a demo
account that once transacted with a real member.

**Chat is decided by who owns the thread.** A support ticket belongs to whoever opened it:

- A ticket a demo or automated-test account opened is dummy data in full, so it goes with
  everything in it — including a staff member who was auto-assigned to it, and including a reply
  that staff member wrote in it. The staff account itself keeps everything else it owns. The
  start-up log lists each absorbed row under `absorbedChatRows`, so the operator can see exactly
  what went.
- A ticket a **real member** opened is their data and is never deleted. If a demo account
  participated in it, only that demo account's participant row and messages are removed; the
  thread and the member's own messages stay.

So a real member never loses a conversation they started, and a demo ticket never survives
because a staff member happened to be assigned to it.

The delete is deliberately not one transaction: a foreign-key violation aborts a transaction, and
the engine instead retries each row in dependency order. A partial run is safe to repeat — the plan
is recomputed from what is left. After the deletes it re-queries every planned id, asserts the
administrator still exists, and asserts the user count fell by exactly the number of targets.

**A busy database is waited out, not treated as a failure.** The purge runs at start-up, and a
start-up overlaps the deployment it replaces: for a few seconds the outgoing process and the
incoming one hold connection pools at the same time, and the managed PostgreSQL refuses new
connections until the outgoing process lets go of its pool. When that happens the run logs
`the database was busy; the demo cleanup waits and tries again` and tries again every five seconds
for up to eight attempts. Every step is idempotent, so a retry finishes the job rather than
repeating it — and the end state is checked the same way whether the run took one attempt or
several. Only a non-connection failure (a shared row, a missing primary key) stops the run
immediately, and it stops it **before** anything is written.

On a machine that *can* reach the database, the same engine has a manual runner:

```bash
pnpm --filter backend exec tsx scripts/purge-demo-data.ts            # dry run
pnpm --filter backend exec tsx scripts/purge-demo-data.ts --confirm  # delete
```

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
| `OPERATIONS_ADMIN` | Support desk, contracts, payments, payouts settlement, users/suspensions, system health; view-only disputes and escrow. |
| `FINANCE_ADMIN` | Payments, payouts settlement, reconciliation, ERCA withholding, ledger, reports & analytics, audit logs, view-only users and escrow. |
| `COMPLIANCE_ADMIN` | KYC review, Risk/AML (`TMS`), profile reports moderation (including atomic `RESOLVED_PROFILE_BANNED` suspension of non-staff accounts and session revocation under `profiles.moderate`), top-up receipts, audit logs, system health, dispute view/claim, assigned support threads. |
| `DISPUTE_MEDIATOR` | Dispute claiming and binding settlement, plus read-only contracts and users. |
| `COMPLIANCE_OFFICER` | Legacy compliance permission set matching `COMPLIANCE_ADMIN`. |
| `SUPPORT` | Full support desk queue visibility and handling, read-only user directory, own profile. |

The full matrix is in `docs/SYSTEM_DESIGN.md` §3.16 and is served live at
`GET /api/v1/admin/permissions/matrix`. For the complete per-role reference of
all 23 sidebar pages and the Overview Command Center, see
[docs/ADMIN_STAFF_SIDEBAR_FEATURES_REFERENCE.md](./ADMIN_STAFF_SIDEBAR_FEATURES_REFERENCE.md)
and
[docs/ADMIN_STAFF_DASHBOARD_CONTENTS_REFERENCE.md](./ADMIN_STAFF_DASHBOARD_CONTENTS_REFERENCE.md).

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
