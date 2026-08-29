# Admin Portal Access Guide

Last updated: 2026-08-07

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
  -- bcrypt hash of a strong password (generate with: node -e "require('bcrypt').hash('yourpassword',12).then(console.log)")
  '<bcrypt_hash_here>',
  'CLIENT',            -- marketplace role (not used for staff)
  '1990-01-01',
  'en',
  'COMPLIANCE_OFFICER', -- or 'ADMIN'
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
    passwordHash: await bcrypt.hash('ChangeMe123!', 12),
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

---

## Step 2 — Log In

1. Open the Yekis web app (default local: `http://localhost:5173`)
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
| `COMPLIANCE_OFFICER` | Full access to KYC, top-up, dispute, TMS, and support queues |
| `ADMIN` | Same as `COMPLIANCE_OFFICER` (can be extended with platform-wide controls) |

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

## Generating a bcrypt Password Hash

If you need to generate a hash for Option A above:

```bash
node -e "const b=require('bcryptjs'); b.hash('YourStrongPassword!',12).then(h=>console.log(h))"
```

Or with bcrypt:

```bash
node -e "const b=require('bcrypt'); b.hash('YourStrongPassword!',12).then(h=>console.log(h))"
```

---

## Security Notes

- Staff passwords must be strong (≥ 14 characters, mixed case, numbers, symbols)
- Staff accounts should not be shared — create one per operator
- The `staffRole` field cannot be set through any public API endpoint; it requires direct database
  access or a privileged seed script
- All compliance decisions (KYC approvals, dispute resolutions, TMS dismissals) are written to the
  immutable `AuditLog` table
