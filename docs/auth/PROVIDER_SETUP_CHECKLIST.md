# Provider Setup Checklist — Email And Google

> **STATUS: DONE — 2026-11-20.** Both accounts were created and both keys are
> configured on the live host. This document is kept as the runbook: it is
> what to repeat (or to do for another domain, another sender, or another
> client id), and it records why each step exists.
>
> | | State |
> |---|---|
> | **Brevo account** | Live. Free plan, 300 emails/day, account `emushu70@gmail.com`, company `yekis` |
> | **Sender `emushu70@gmail.com`** | **Verified** — a test message was accepted by the API (`201`, message id `<202611201937…@smtp-relay.mailin.fr>`) |
> | **Brevo transport in the backend** | Live. `EMAIL_TRANSPORT=brevo`, `BREVO_API_KEY=…`, `EMAIL_FROM="Yekis <emushu70@gmail.com>"` |
> | **Google client id** | Live. `GOOGLE_CLIENT_ID` and the build-time `VITE_GOOGLE_CLIENT_ID` are both set to `1040630878719-…apps.googleusercontent.com` |
>
> **What the assistant did afterwards:** set the environment variables on the
> app, redeploy, and verify live — `email.available: true` and `google: true`.
>
> **Never paste a key into the repository.** Each value below is given to the
> assistant and goes straight into the AletCloud app's environment.
> `scripts/scan-secrets.js` gates every commit.

> **Who does what.** You create the two accounts (they need your e-mail, your
> Google sign-in and, for Brevo, a sender address you own). I do everything
> after that: the environment variables on the host, the redeploy, the live
> verification, and the deployment record in `docs/ALETCLOUD_DEPLOYMENT.md`.
>
> Context: `docs/auth/PHASE0_AUTH_AUDIT.md` §8 (mail) and §9 (Google).

---

## Part A — Transactional email (free, no card)

**Recommended: Brevo** — 300 emails/day, one verified sender address, no domain
needed, no payment card. The platform currently has **no mail transport at
all**, so until this is done the e-mail verification step answers `503` and
password-reset mail is undeliverable.

### A1. Create the account

1. Open `https://brevo.com` → **Sign up** (or **Log in** if you already have an
   account).
2. Use **`emushu70@gmail.com`** as the account e-mail.
3. Choose the **Free** plan. Do not enter a card — the free plan does not ask
   for one. Fill in the company field with `Yekis` (or a placeholder; it is not
   verified at this tier).
4. Brevo may ask you to **confirm your e-mail address**: open the message it
   sends to `emushu70@gmail.com` and click the confirmation link. This is the
   one step you cannot do for me.

### A2. Verify the sender address

5. **Senders & Domains → Add a new sender** → choose **"Verify a new sender
   address"** (not a domain).
6. Sender name: `Yekis` · Sender e-mail: `emushu70@gmail.com`.
7. Brevo emails that address with a verification link. **Open it and click
   "Verify"**. (Until this is done, Brevo will not send anything.)

> Why a personal address for now: a domain (`yekis.et`, `yekis.com`) is not
> owned yet, and a verified domain is what buys SPF/DKIM and therefore
> deliverability. When a domain exists, verify it here (or move to Resend, see
> §8 of the audit) and change `EMAIL_FROM` to it. The transport code does not
> change — only the configuration.

### A3. Create the API key

8. **SMTP & API → API Keys → Generate a new API key**.
9. Name it `yekis-staging` and copy the key. **Give it to me here, once.**

### A4. Same-day alternative (no third-party account at all)

If you would rather not sign up for Brevo today:

1. Open `https://myaccount.google.com/apppasswords` (2-Step Verification must be
   on).
2. Create an app password for **Mail** named `yekis`.
3. Give me the 16-character password. I will use it as `SMTP_USER` =
   `emushu70@gmail.com` with `SMTP_PASS` = the app password, host
   `smtp.gmail.com`, port 587.

This works immediately and costs nothing. Two caveats: Google caps it at about
500 messages a day, and outbound port 587 may be blocked by the host — if the
delivery test fails, Brevo (HTTPS API) is the fallback.

### A5. What I set on the host

```
EMAIL_TRANSPORT=brevo        # or smtp, per A4
BREVO_API_KEY=<the key>      # A3  — or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS per A4
EMAIL_FROM="Yekis <emushu70@gmail.com>"
```

Then: redeploy → `node scripts/test-email.mjs emushu70@gmail.com` → confirm the
message arrives → `GET /api/v1/auth/verification/channels` must report
`email.available: true`.

---

## Part B — Google sign-in

The backend verification is already written and correct (ID token checked
against Google's JWKS, issuer, audience and expiry). Only a client id is
missing, and the same id has to be in two places: the backend environment and
the frontend **build** environment.

### B1. Create the project

1. Open `https://console.cloud.google.com` → **Create a project**.
   - Project name: `Yekis Auth` · organisation: your personal one.
   - Create. (A billing account is **not** required for an OAuth client id.)

### B2. Configure the consent screen

2. **APIs & Services → OAuth consent screen** (Google Auth Platform).
   - User type: **External**.
   - App name: `Yekis` · user support e-mail: `emushu70@gmail.com` ·
     developer contact e-mail: `emushu70@gmail.com`.
   - **Scopes**: add `openid`, `email`, `profile`. Nothing else — no sensitive
     scope, so no verification review is needed.
   - Save and continue.
3. Leave the consent screen in **Testing**. Under **Test users**, add
   `emushu70@gmail.com` — in Testing mode only listed accounts can complete the
   flow.

### B3. Create the client id

4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Name: `Yekis Web`.
   - **Authorized JavaScript origins**: `https://yekis.app.aletcloud.com`
     (and `http://localhost:5173` for local development).
   - **Authorized redirect URIs**: leave empty — the button uses the Google
     Identity Services popup, which returns the ID token to the page; no
     redirect URI is involved.
   - Create, then copy the **Client ID** (it ends in `apps.googleusercontent.com`).

### B4. Give me the client id

Paste the client id here. **No client secret is needed** for this flow: the
backend verifies the token's signature against Google's public keys. (The
environment still accepts a secret for a future code exchange; it is optional.)

### B5. What I set on the host

```
GOOGLE_CLIENT_ID=<the client id>
VITE_GOOGLE_CLIENT_ID=<the same client id>   # build-time: the frontend bundle
```

Then: redeploy → `GET /api/v1/auth/oauth/providers` must report
`google: true` → the "Continue with Google" button appears → one real sign-in
from `emushu70@gmail.com` → the account is created or, if the address already
has a password account, the API answers `409 ACCOUNT_LINK_REQUIRED` and the
member links Google from their signed-in session (never an automatic merge).

---

## Part C — What happens next, and what is already done

| Step | State |
|---|---|
| Phase 0 audit and threat model | **Done** — `docs/auth/PHASE0_AUTH_AUDIT.md` |
| The live code-disclosure leak (the staging host returned the OTP in the response) | **Fixed on 2026-11-20**, before any new channel was switched on |
| E-mail transport configured | **Done 2026-11-20** — Brevo over the HTTPS API; the live host reports `email.available: true` and the onboarding code is delivered by mail |
| Google configured | **Done 2026-11-20** — the client id is set in both the backend and the frontend build; the live host reports `google: true` |
| Email OTP sign-in, Telegram push OTP, identities API, device sessions | **Not started** — they wait for your review of the audit document (the founder decision was: audit first, then implement) |

### The one thing still worth doing later
Buy a `yekis.*` domain and verify it in Brevo (SPF + DKIM), then switch
`EMAIL_FROM` to it. The transport code does not change — only the
configuration. Until then the platform sends from a personal address, which
delivers but is less trustworthy to a receiving mailbox than a signed domain.

