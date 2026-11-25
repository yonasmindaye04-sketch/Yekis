# Deploying Yekis to AletCloud

Last updated: 2026-11-12

A runbook for hosting the platform on **AletCloud** — Ethiopia's first
self-service sovereign cloud — for **testing purposes**. It describes what
AletCloud is, what each Yekis component maps onto, the exact configuration to
enter, how to verify the result, and how to stop paying.

The container image this runbook deploys is built by the repository's own
[`Dockerfile`](../Dockerfile). It serves the SPA and the API from **one
process on one origin**, which is not a convenience — it is what the Telegram
Mini App requires.

---

## 1. What AletCloud is

AletCloud is built and operated by ALET Technologies PLC. Its hardware is its
own, inside **Ethio Telecom's Bole data centre in Addis Ababa**, region
`et-addis-1`. It publishes a 99.5% uptime SLA and its status page runs
outside the data centre, on separate infrastructure in another country, so it
keeps reporting during an outage.

Everything is billed from **one prepaid wallet, in ETB, by the minute**. The
monthly figure printed against each plan is a **ceiling, not a subscription**:
a resource that ran for an afternoon costs an afternoon, and stopping or
deleting it stops the charge at that minute. An exhausted wallet **suspends**
services rather than deleting them; the data is kept while suspended.

Reference: [aletcloud.com](https://aletcloud.com) ·
[docs](https://aletcloud.com/docs) ·
[pricing](https://aletcloud.com/pricing) ·
[status](https://status.aletcloud.com)

### The products this deployment uses

| Product | What it gives us | Notes |
|---|---|---|
| **App Hosting** | GitHub → container build → HTTPS on `*.app.aletcloud.com` | Automatic TLS, live build and runtime logs, deployment history, path routing, worker-type services |
| **Managed databases** | PostgreSQL 14–18, MySQL, MongoDB | Issued credentials, TLS, metrics, daily backups on paid plans |
| **Object storage** | S3-compatible buckets, `s3.aletcloud.com` | Presigned URLs, scoped access keys, per-bucket visibility |
| **MCP endpoint** | 79–80 tools over `https://mcp.aletcloud.com/mcp` | Browser sign-in (30-day session) or a personal access token |

Two facts shape the whole plan:

1. **There is no managed Redis.** The database engines are PostgreSQL, MySQL
   and MongoDB. Redis is not offered as a product and does not appear in the
   MCP tool list. Yekis needs Redis for its BullMQ workers, its rate-limit
   store and its Telebirr token cache, so the container runs one itself
   (`infra/docker/entrypoint.sh`).
2. **Creating a paid resource requires the wallet to already hold 24 hours of
   that resource's hourly burn.** It is a check at creation, not a hold and
   not a charge: 12 ETB for a Pro app, 150 ETB for a Pro VPS, about 1.7 ETB
   for a 5 GB bucket.

---

## 2. The resource plan

| Yekis component | AletCloud resource | Plan | Cost |
|---|---|---|---|
| SPA + API + Redis (one container) | App Hosting | **Pro** | 0.5 ETB/hr, 360 ETB/mo ceiling |
| Database (Prisma) | Managed PostgreSQL — the existing `yekis-jobs` instance | **Solo** | free, no expiry |
| KYC documents, top-up receipts, contract PDFs | Object Storage, 5 GB, private | 5 GB | 50 ETB/mo ceiling, billed by the minute |

**Why Pro and not the free Solo app.** Solo is genuinely free and never
expires, but it is 250m CPU and **256Mi of memory**, with one replica and no
persistent disk. Yekis's API process holds a Prisma client, ten BullMQ
workers, a WebSocket server and the whole Express app; 256Mi leaves no room,
and the OOM shows up as a container that restarts for no stated reason. Pro
gives 512Mi, two replicas and 1 GB of disk for 0.5 ETB/hr.

**Why the free Solo database is enough.** Ten connections and a gigabyte are
small, but this is a test deployment with a handful of users. The one
adjustment is the connection limit — see §5.

**The bucket is the only unavoidable cost.** KYC document upload and receipt
attachment are core flows, and the object store is where they live. A 5 GB
bucket is 50 ETB/mo, charged by the minute.

### What it costs in practice

| | Per day | Per 30-day month |
|---|---|---|
| App running 8 hours a day | 4.00 ETB | 120 ETB |
| 5 GB bucket (billed whenever it exists) | ~1.66 ETB | 50 ETB |
| **Total** | **~5.7 ETB** | **~170 ETB** |

**Delete the app and the bucket when the test is over and the charge stops at
that minute.** The database can stay: Solo is free forever and holds the
schema, so the next test starts from a migrated database.

---

## 3. Before you start

- The repository pushed to GitHub. **`main` is the canonical branch.** The app
  is connected to `fix/code-only-compliance-gaps`, which is kept **identical to
  `main`**: after every merge to main, fast-forward it with
  `git merge --ff-only main` and push, so the deployed commit and `main` are
  the same. A push to the connected branch is *meant* to redeploy, and it
  usually does — but it is not a guarantee. Commit `2ff173d` sat on the
  connected branch for twenty hours while the host went on serving the
  previous build, and only an
  explicit `redeployApp` built it. **After every push, confirm the host moved:**
  `getApp` shows `status` and `lastDeployedAt`, and the served `index.html` names
  the bundle (`/assets/index-<hash>.js`). If `lastDeployedAt` has not changed,
  call `redeployApp` — it pulls the latest commit on the branch.
- A GitHub account authorised with AletCloud (private repositories are
  supported).
- A wallet balance of at least **15 ETB** (12 for the app, ~2 for the
  bucket) before the paid resources are created.
- The `yekis-jobs` PostgreSQL instance running.

---

## 4. Creating the resources

### 4.1 The database — already done

Open **Databases** in the console and confirm `yekis-jobs` is running. Take
its **connection string** from the panel; §5 needs it.

Note the internal host: it looks like
`yekis-jobs.db-07.svc.cluster.local`. **Apps deployed on AletCloud reach it
over the cluster network** — no public access needed, and none should be
enabled. Leave **Public internet access** off.

### 4.2 The object storage bucket

Open **Object storage** → create a bucket:

- **Plan:** 5 GB
- **Name:** something like `yekis-test-media` (no dots — they break
  virtual-host-style S3 addressing)
- **Visibility:** private. The application hands out short-lived signed URLs
  (`getSignedObjectUrl`) and never public links.

Then **link the bucket to the app** (one action in the console). That mints a
scoped key and injects the S3 variables into the app's environment. §5 sets
the explicit names as well, so the deployment does not depend on the exact
variable names the platform uses.

### 4.3 The app

Open **App hosting** → **Create app**:

1. Connect GitHub, pick the repository and the branch the app should track —
   in this deployment `fix/code-only-compliance-gaps`, kept identical to
   `main` (§3).
2. AletCloud reads the repository and detects a stack. **Ignore what it
   detects** — it will find `vite` and `react-dom` in the root
   `package.json` and offer to build a static site with `npm run build`,
   which fails (the workspace is pnpm and there is no `package-lock.json`).
   The repository's own `Dockerfile` takes precedence over detection, and
   that is what should be built. If the console offers a **Dockerfile** or
   **Build: Dockerfile** option, select it; if it does not, the automatic
   detection will pick up the committed Dockerfile anyway.
3. **Plan:** Pro.
4. **Port:** 8080, or leave it on automatic — the Dockerfile exposes 8080 and
   the platform sets `PORT`, which the API reads.

The console creates the app and starts the first build. Watch the build log:
it will show the pnpm install, the Prisma client generation, the two
TypeScript builds and the Vite bundle.

### 4.4 What the platform does with a Dockerfile

This was verified by deploying, not by reading the documentation, and two of
the answers are counter-intuitive.

**The Dockerfile is used, even though the app's metadata says otherwise.**
After the first deploy the app's record reads `renderType: STATIC`,
`buildCommand: pnpm run build`, `outputDir: build` and `containerPort: 0` —
every field of which is wrong for this repository, because the detection
looked at the root `package.json`, found `vite`, and concluded "static site".
The build ignored all of it: the container ran `infra/docker/entrypoint.sh`,
started the bundled Redis and ran `prisma migrate deploy`. **The metadata is
vestigial when the repository carries a Dockerfile; ignore it.** Confirm it
from the runtime log, which begins with `[yekis] starting the bundled
redis-server`.

**Environment variables must be in place before the app's first successful
start.** This is the one that bites, and it fails in a precise, repeatable
way.

`setAppEnv` writes the variables and `getAppEnv` reads them back
correctly — but on an app that has **never come up**, a deploy re-derives the
environment from the record the app was created with, so a variable added
after creation silently disappears. The symptom is a container that
crash-loops with

```
Prisma schema validation - Environment variable not found: DATABASE_URL
```

while `getAppEnv` cheerfully shows `DATABASE_URL` present. The first
deployment of this repository did exactly that, six times over.

So: pass the whole environment in the `deployApp` call that creates the app.

**Once the app is healthy, the environment can be changed.** `setAppEnv`
followed by `restartApp` applies the change, and it then **persists across
later deploys** — verified twice: `TRUST_PROXY_HOPS` was added that way and
survived the next redeploy, and a later rebuild left all fifty variables in
place, bot token and bucket key included. The rule
that matters is the ordering, not the tool: a variable added before the app
has ever started is lost, and one added after it has started is kept.

`getAppEnv` is the way to see what is actually in effect, and
`connectDatabaseToApp` is the way to get a database's full credential set —
read it, then put it in the environment.

**The platform sets `PORT` itself.** The app's env contains `PORT: 8080`
without anyone setting it, which matches the `EXPOSE 8080` in the Dockerfile.

**The free Solo plan is enough.** The container was measured at **88 MiB**
resident with the API, the ten BullMQ workers, the Prisma client and the
bundled Redis all running — against a 256 MiB limit. The build is the
hungrier part: the Vite build wants more memory than the runtime does, so a
free app can fail at build time where a paid one would not.

**Path-style addressing works against `s3.aletcloud.com`.** The object store
answered a `HeadBucket` on `https://s3.aletcloud.com/<bucket>` with a
**403** — an authorisation error from a bucket that was reached — rather than
a 404 or a DNS failure. So the application's default
(`OBJECT_STORE_FORCE_PATH_STYLE=true`) is the right one for this provider,
and the `false` fallback in §5.2 is not needed.

**What the wallet is checked against.** A free plan needs no balance at all.
The 5 GB bucket is charged at 0.0685 ETB/hr, and creating it is refused
below **1.64 ETB** — exactly 24 hours of its own burn. The Pro app needs
12.00 ETB for the same reason.

---

## 5. The environment variables

Set these in the console under the app's **Environment** settings — or,
preferably, in the `deployApp` call that creates the app, because a variable
added to an app that has never started is lost at the next deploy (§4.4).

**A change to an environment variable triggers a redeploy**, and the `VITE_`
variables are read at **build** time, so a change to one of those needs the
build to run again — which is what a redeploy does.

| Variable | Value | Why |
|---|---|---|
| `NODE_ENV` | `staging` | See the note below. |
| `DATABASE_URL` | the `yekis-jobs` connection string **+ `connection_limit=5`** | See §5.1 |
| `JWT_ACCESS_SECRET` | 32+ random characters | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `JWT_REFRESH_SECRET` | a *different* 32+ random string | Same generator, run again |
| `GUEST_SUPPORT_JWT_SECRET` | a third, *different* 32+ random string | A guest-support token signed with the access key would verify as a full session |
| `OBJECT_STORE_ENDPOINT` | `https://s3.aletcloud.com` | See §5.2 |
| `OBJECT_STORE_REGION` | `et-addis-1` | The bucket's actual region |
| `OBJECT_STORE_BUCKET` | the bucket's name | Set it explicitly rather than relying on the injected variable's name |
| `OBJECT_STORE_ACCESS_KEY` / `OBJECT_STORE_SECRET_KEY` | the scoped key from the linked bucket | The AWS_* names the platform injects are accepted as aliases, but setting these explicitly is deterministic |
| `FRONTEND_URL` | `https://<your-app>.app.aletcloud.com` | The origin the browser uses, and the origin the Telegram bot's web-app button points at |
| `API_PUBLIC_URL` | `https://<your-app>.app.aletcloud.com` | Where provider callbacks are sent |
| `STAFF_CONSOLE_URL` | `https://<your-app>.app.aletcloud.com` | Where the bot's `/staff` command sends staff |
| `HSTS_INCLUDE_SUBDOMAINS` | `false` | See §7 |
| `TRUST_PROXY_HOPS` | `1` | See the note below — **do not leave it unset** |
| `TELEGRAM_ENV` | `staging` | Selects webhook mode over long polling |
| `TELEGRAM_BOT_TOKEN` | the bot token | The Mini App is opened from `@ye_kis_bot` |
| `TELEGRAM_WEBHOOK_URL` | `https://<your-app>.app.aletcloud.com/api/v1/telegram/webhook` | The bot registers this itself at start-up |
| `TELEGRAM_WEBHOOK_SECRET` | a random 32+ character string | Telegram sends it on every update; the route refuses updates without it |
| `VITE_TELEGRAM_BOT_USERNAME` | `ye_kis_bot` | Build-time; the frontend shows the right bot handle |
| `VITE_OBJECT_STORE_ORIGIN` | `https://s3.aletcloud.com` | Build-time; see §5.2 |
| `VITE_GOOGLE_CLIENT_ID` | *optional* | Build-time; the sign-in button is hidden when it is absent |
| `RUN_MIGRATIONS` | `true` | The container applies `prisma migrate deploy` before the API starts |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | *optional* | The SMTP transport. It carries the onboarding OTP (the 6-digit code sent before an account is created) and the password-reset mail |
| `BREVO_API_KEY` | *optional* | The Brevo HTTPS API transport. The API key is the only credential; the sender address is configured through `EMAIL_FROM` and must be a **verified sender** in the Brevo account |
| `EMAIL_TRANSPORT` | `auto` | Which transport carries the mail: `smtp`, `brevo`, or `auto` (SMTP when it is configured, otherwise the Brevo API). An explicit value never silently falls back to the other transport |
| `EMAIL_FROM` | `Yekis Notifications <notifications@yekis.com>` | The sender of every platform mail |
| `SMS_ETHIOPIA_API_KEY` | *optional* | The SMS provider. With it unset, the phone OTP channel reports itself as unavailable and the onboarding falls back to email |

**The onboarding OTP on a testing deployment.** The signup flow proves control
of the signup address with a 6-digit code before the account is created. With
no mail transport at all the code is **not delivered and not disclosed**: the
request answers `503 EMAIL_UNAVAILABLE`, no code row is kept, and the signup
step uses the Telegram channel instead (or the member links a Telegram chat
first, which makes the phone channel deliverable through the bot).

This used to be different, and it was a live exposure. Until 2026-11-20 the
code was written to the container log **and** returned in the API response as
`devCode` on any host that was not `production` — including this public
staging deployment, where anyone could ask for a code for any address and read
it out of the reply. The disclosure affordances now exist only on
`NODE_ENV=development` (a laptop) and `NODE_ENV=test` (the automated suite);
see `isDevCodeDisclosureAllowed()` in `apps/backend/src/config/env.ts`.

**So a mail transport is required for the email channel on any reachable
host.** A free provider is enough — Brevo's free plan (300 emails/day, a
single verified sender, no domain, no card) is the current recommendation, and
`docs/auth/PHASE0_AUTH_AUDIT.md` §8 has the exact setup steps. Gmail with an
app password is the same-day stopgap if no account is available yet. Until one
is configured, `GET /api/v1/auth/verification/channels` reports
`email.available: false`, which is the truth: the platform cannot send mail.

**Why the Brevo API rather than Brevo's SMTP relay.** Both work, and the code
carries both. The API needs nothing but outbound port 443, which the hosted
app already uses for everything else; a raw SMTP connection needs port 587 or
465 open, which a platform container may not have. If SMTP is what you have,
set `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, and use the Brevo API
key as both `SMTP_USER` and `SMTP_PASS`.

`GET /api/v1/auth/verification/channels` reports what the running host can
actually deliver. Check it after deploying: if `email.available` is `false`
the signup step will not be able to send a code.

**Leave the Telebirr, CBE and Fayda credentials blank.** With no Telebirr
credentials the payment client falls back to its deterministic mock mode, so
escrow, webhooks and the receipt flow can be exercised without a merchant
account. Leaving them unset is also what keeps the deployment out of the
`assertProductionSafety` production rules.

**Leave `RUN_MIGRATIONS` on.** The container runs `prisma migrate deploy`
before the API starts, and that step is also the deployment's proof that the
database is reachable and the schema is current. With it on, a database that
cannot be reached or a schema that does not match the branch fails the
container, the deployment fails, and the log says why. With it off, the same
problem produces a container that starts, answers its port, and returns a 500
for every request that touches the database — which looks like a working
deployment until somebody uses it.

> **Why `staging` and not `production`.** `NODE_ENV=production` switches on
> the fail-closed checks in `config/env.ts`, which refuse to boot without a
> real PEP screening provider, without `GUEST_SUPPORT_JWT_SECRET`, without a
> Telegram webhook secret, without an https `API_PUBLIC_URL` and without
> `STAFF_CONSOLE_URL`. A test deployment should not have to fake a sanctions
> screening vendor to boot. `staging` still keeps the rate limiter on and
> still refuses a malformed configuration. Moving to `production` later
> means supplying that whole set and setting `PEP_PROVIDER=real`.

> **`TRUST_PROXY_HOPS` is not optional behind a proxy.** It is a **count of
> proxy hops**, not a boolean. The platform's edge forwards `X-Forwarded-For`
> with the client's address, so one hop is the right number; leaving it unset
> means Express ignores the header entirely and takes the proxy's address as
> the client's. Every visitor then shares **one rate-limit bucket**, so the
> limit applies to the whole platform rather than to each user, and one
> busy client can lock everybody else out. express-rate-limit says so in the
> logs, once per request:
>
> ```
> ValidationError: The 'X-Forwarded-For' header is set but the Express
> 'trust proxy' setting is false (default).
> ```
>
> Setting it too high is the opposite failure: a client could prepend
> forged addresses and choose its own bucket, walking past the limit
> entirely. One hop, matching the platform's edge.

### 5.1 The database connection string

Two things have to be added to the issued string.

**`connection_limit=5`.** Prisma's default pool is `2 × CPUs + 1`, and
inside a container the CPU count is the **host's**, not the plan's — a
sixteen-core host means a pool of thirty-three against a Solo plan that
allows **ten** connections in total. The API and the ten BullMQ workers share
one Prisma client and therefore one pool, so the default exhausts the limit
and the next concurrent request fails with a connection error that looks like
a network fault. Append it to the query string:

```
postgresql://<user>:<password>@yekis-jobs.db-XX.svc.cluster.local:5432/yekis-jobs?connection_limit=5
```

If the issued string already carries a query string, use `&connection_limit=5`
instead of `?`.

**TLS.** The managed instance serves TLS. The issued connection string should
already say so (`sslmode=require`); if it does not, add it. Prisma's default
is `sslmode=prefer`, which negotiates TLS when the server offers it.

### 5.2 The object store

`https://s3.aletcloud.com` and the region `et-addis-1` are what the
platform's own documentation quotes.

**`OBJECT_STORE_FORCE_PATH_STYLE` is the one thing to watch.** The
application's default is `true` (path-style: `https://s3.aletcloud.com/<bucket>/<key>`),
which is what MinIO requires and what the local setup uses. A hosted
S3-compatible endpoint may instead only offer virtual-host style
(`https://<bucket>.s3.aletcloud.com/<key>`), which is what the standard AWS
SDK does and therefore what AletCloud's "the code you already wrote for AWS
keeps working" implies.

The default is left at `true` so nothing changes for the local MinIO setup.
If uploads fail on the deployed app with a 404, a 301 or a signature
mismatch, set `OBJECT_STORE_FORCE_PATH_STYLE=false` and redeploy. Nothing
else depends on it.

**`VITE_OBJECT_STORE_ORIGIN` is not optional, and it is a build-time
variable.** The staff console renders a KYC document as an `<img src>` whose
URL is a presigned object-store URL, so the browser fetches it from the
store's own origin — and the production Content-Security-Policy has to name
that origin in its `img-src` or the browser blocks it. Without it, the
document preview is a broken image and the compliance reviewer cannot review
the document at all. The value is the **origin**, without a trailing slash:
`https://s3.aletcloud.com`.

It is a build-time variable, so setting it triggers a rebuild. AletCloud
redeploys when an environment variable changes, and the build reads the
environment, so setting it in the console is enough.

---

## 6. Verifying the deployment

### 6.1 The automated check

```bash
node scripts/check-deployment.mjs https://<your-app>.app.aletcloud.com
```

It checks the things that fail silently: the health endpoint, the API's
strict JSON-only policy, the SPA being served as HTML, the `frame-ancestors`
allowlist arriving as a response header, the absence of `X-Frame-Options` on
the SPA, a client-side route reaching the SPA, an unknown API route still
answering with JSON, and the API and the SPA sharing an origin. It prints
what it saw for each one, so a failure tells you which contract broke.

### 6.2 The manual checks

```bash
# 1. The API is up and the port contract is satisfied.
curl -i https://<your-app>.app.aletcloud.com/health
#    → HTTP/2 200, {"status":"ok"}

# 2. The API's security headers are the strict JSON ones, not the SPA's.
curl -sI https://<your-app>.app.aletcloud.com/api/v1/auth/oauth/providers \
  | grep -i "content-security-policy"
#    → content-security-policy: default-src 'none'; ...   (the API policy)

# 3. The SPA is served, from the same origin, with the framing allowlist.
curl -sI https://<your-app>.app.aletcloud.com/ \
  | grep -iE "content-security-policy|x-frame-options|content-type"
#    → content-security-policy: frame-ancestors 'self' https://web.telegram.org ...
#    → content-type: text/html
#    → NO x-frame-options header (the Telegram Mini App frames this page)

# 4. A client-side route returns the SPA, not a JSON 404.
curl -s -o /dev/null -w "%{http_code}\n" https://<your-app>.app.aletcloud.com/workspace/jobs
#    → 200

# 5. An unknown API route still answers with JSON, not with a page of HTML.
curl -s https://<your-app>.app.aletcloud.com/api/v1/definitely-not-a-route
#    → {"error":"NOT_FOUND","path":"/api/v1/definitely-not-a-route"}

# 6. The database is reachable and the schema is applied.
curl -s https://<your-app>.app.aletcloud.com/api/v1/skills | head -c 200
```

Then, in the console's **runtime log**, confirm these lines appear:

```
[yekis] starting the bundled redis-server on 127.0.0.1:6379
[yekis] redis-server is up
[yekis] applying Prisma migrations
[yekis] migrations applied
[yekis] starting the API on port 8080
🚀 API listening on port 8080 (staging)
🐘 Database connected to PostgreSQL
```

Finally, open the platform in a browser, sign in, and **upload a KYC
document** — that is the one flow that exercises the object store, and the
one whose failure mode (`OBJECT_STORE_FORCE_PATH_STYLE`, §5.2) is not visible
from the outside. Then open the Mini App from `@ye_kis_bot`. If the Mini App
shows a blank frame, the platform's proxy is sending an `X-Frame-Options`
header that the application does not: see §7.

---

## 7. Known limitations of this deployment

These are properties of the platform or of the chosen plan, not defects. They
are listed here so that nobody has to rediscover them at 2am.

**No managed Redis, so each replica runs its own.** The container starts a
`redis-server` on loopback. On the Pro plan there are **two replicas**, each
with its own Redis, which means the rate-limit counters are per-replica (the
effective limit is twice the configured one) and the BullMQ queue state is
per-replica. The queue still works — a job scheduled on a replica is picked up
by that replica's workers — but it is not the same topology as production.
The remedy, if it matters, is an external Redis: a second app in the same
project, or a VPS, with `REDIS_URL` pointed at it. The container uses an
external Redis automatically when `REDIS_URL` names a host other than
loopback.

**The Solo database has no backups at all.** Not "no automated backups" — no
backups. A Pro database is 150 ETB/mo and keeps 3, 7, 14 or 30 days of daily
backups. Nothing in this deployment should be treated as worth keeping until
that is bought.

**The database role separation does not exist here.** `apps/backend/prisma/README.md`
describes a migration role and a separate application role, so that the
running API cannot delete audit rows. A managed instance issues one set of
credentials, so the API holds DDL rights and the `SECURITY DEFINER` purge
function is owned by the same role that runs it. The "the app cannot delete
audit rows" invariant is therefore **not** enforced on this deployment. It is
enforced on a self-managed PostgreSQL.

**`pgaudit` is absent.** The local image installs it (`infra/postgres/Dockerfile`);
the managed instance does not have it. Nothing in the Prisma schema or the
migrations depends on it — no `CREATE EXTENSION pgaudit` appears in any
migration — so the schema applies cleanly. The audit trail is therefore
complete but not independently verifiable at the database level.

**The container filesystem is replaced on every release.** `uploads/`, the
local-disk fallback copy of chat attachments, does not survive a deploy. The
object-store copy does, and it is the one the serving route reads first.

**HSTS must not carry `includeSubDomains` here.** `HSTS_INCLUDE_SUBDOMAINS`
defaults to `true`, which is right on a dedicated hostname. On a shared
platform hostname, `https://<your-app>.app.aletcloud.com` sending that header
would make the browser require HTTPS for every sibling subdomain of
`app.aletcloud.com` — other tenants' applications. The deployment sets it to
`false`.

**Only one process may poll the bot.** If the application is also running
locally with the same bot token and `TELEGRAM_ENV=dev`, both will try to
long-poll and Telegram will refuse one of them. The deployed app uses a
webhook (`TELEGRAM_ENV=staging` plus `TELEGRAM_WEBHOOK_URL`), which is
authoritative and does not conflict — but the local bot must be stopped, or
must not be given the same token.

**The platform's proxy headers — verified, and fine.** The application sends
`Content-Security-Policy: frame-ancestors …` and does not send
`X-Frame-Options` for the SPA, which is what the Telegram webview needs. The
deployed instance was checked: the edge adds **no** `X-Frame-Options` of its
own, and the `frame-ancestors` allowlist arrives on the response. The
framing allowlist therefore survives the proxy, and the Mini App has what it
needs.

**The platform's proxy must pass WebSocket upgrades.** The chat's live
channel is a WebSocket at `/api/v1/ws`, authenticated with the access token
in the query string. The application side is fine — it binds the upgrade on
the same HTTP server — but if the platform's edge proxy does not forward
upgrades, the socket fails to connect and the chat falls back to nothing
live: messages still send and load over REST, they just do not arrive while
you are looking at the thread. There is no polling fallback, so the symptom
is "the chat never updates" rather than an error.

**Build minutes are metered, and a cold build is not quick.** The plan's
monthly allowance (300 minutes on Pro) is spent only on builds. A cold build
installs the whole pnpm workspace, generates the Prisma client and its
engines, compiles the API and bundles the SPA — ten minutes or more from
Addis Ababa, because the npm registry is a long way off. Twenty-odd deploys
a month is therefore the working budget on Pro, not hundreds. Push to the
deployed branch deliberately rather than on every commit.

---

## 8. Driving the console from an agent (MCP)

AletCloud publishes its control plane over the Model Context Protocol, so
the steps above can be driven from an MCP client instead of the console.

```json
{
  "mcpServers": {
    "aletcloud": {
      "url": "https://mcp.aletcloud.com/mcp",
      "headers": { "Authorization": "Bearer alet_pat_…" }
    }
  }
}
```

The token is created in the console under **AI Agents**. It acts as the
account holder, never expires, is revocable immediately, and every call it
makes is in the audit log.

The tools this deployment uses:

| Step | Tools |
|---|---|
| Check the wallet | `getBalance`, `getUsage`, `getTransactions` |
| The database | `listDatabases`, `getDatabase`, `getDatabaseCredentials`, `connectDatabaseToApp`, `databaseLogs` |
| The bucket | `createBucket`, `connectBucketToApp`, `listBucketAccessKeys`, `createBucketAccessKey`, `bucketUsage` |
| The app | `createHostingProject`, `deployApp`, `setAppEnv`, `getAppEnv`, `appLogs`, `redeployApp`, `deleteApp` |

`deployApp` and `setAppEnv` are the two that matter most: they replace the
console's "Create app" and the environment-variable list. `appLogs` returns
the same stream the console shows, which is where §6's log lines come from.

---

## 9. Stopping and cleaning up

```bash
# Stop the app: it is suspended and keeps its configuration.
# Delete it: the charge stops at that minute.
```

From the console, or over MCP:

1. **Delete the app** (`deleteApp`). Billing stops immediately. The database
   is untouched.
2. **Delete the bucket** (`deleteBucket`) if the test is finished. The bucket
   is charged whenever it exists, so leaving it behind costs 50 ETB/mo.
3. **Keep the database.** `yekis-jobs` is free, has no expiry date and holds
   the migrated schema, so the next test starts from a working database. Use
   **Stop** rather than **Delete** on it — a stopped database is still
   billable on the paid plans, but Solo is free either way.
4. **Revoke the MCP token** if one was created, from **AI Agents**.

---

## 10. What this deployment does *not* do

It is a test environment. It is not the production topology, and the
following are deliberately out of scope for it:

- Real money movement. With no Telebirr credentials the payment client runs
  in its deterministic mock mode. Nothing in this deployment can move or
  lose real money.
- Real KYC. The Fayda client is a mock, so a Tier 1 verification produces a
  stub result.
- Backups. See §7.
- The two-role database separation, `pgaudit`, and the append-only guarantee
  on `AuditLog`. See §7.
- A real sanctions/PEP source. `PEP_PROVIDER` stays `mock`, which is why
  `NODE_ENV` is `staging` and not `production`.
- Scaling. The two replicas of the Pro plan exist so a release does not
  interrupt traffic; they are not a performance strategy, and each carries
  its own Redis.

---

## 11. The deployment as it was actually made

Recorded so the next person does not have to rediscover it.

| | |
|---|---|
| URL | `https://yekis.app.aletcloud.com` |
| Hosting project | `yekis` (`7d5a6ab0-1a03-4b2a-b9a8-6accf59a87fa`) |
| App | `yekis-test` (`d40f8eff-9cd7-42f2-9c24-01b750def027`) |
| Plan | **Solo** — free, no expiry, 250m CPU / 256 MiB, 1 replica |
| Repository | `yonasmindaye04-sketch/Yekis`, branch `fix/code-only-compliance-gaps` — kept identical to `main` (aligned 2026-11-19) |
| Database | `yekis-jobs` — Managed PostgreSQL **18**, Solo, free, internal network only, 10 connections |
| Object storage | `yekis-test-media` (bucket `t1370-yekis-test-media`) — 5 GB, private, 50 ETB/mo |
| Telegram bot | `@ye_kis_bot` — **live** since 2026-11-14; webhook registered at `https://yekis.app.aletcloud.com/api/v1/telegram/webhook` |

What was verified against the live instance:

- `scripts/check-deployment.mjs` passes **11/11**.
- `scripts/e2e-onboarding.mjs` completes the **whole onboarding flow**:
  capability discovery, issue the code, check the code, create the account,
  sign in, and confirm the session works. It is walked with a **mixed-case**
  address on purpose — the form does not lower-case what the person types,
  and every path that reads `User.email` does, so the address is the case
  that breaks if the canonical form is not applied.
- `scripts/e2e-object-store.mjs` completes the **whole object-store round
  trip**: register a throwaway client, sign in, upload a file through the API
  (a real `PutObject` into `t1370-yekis-test-media`), create a conversation,
  attach the file to a message, and read the bytes back out (555/555
  identical).
- The **signup was walked in a real browser**, not only through the API: the
  form offers the code step, the code is requested the moment the step
  opens, the target is shown masked (`U***@Example.COM`), the expiry counts
  down, the code is accepted, the account is created and the workspace loads
  with the session — signed in as `ui.check…@example.com`, the canonical
  form of the address that was typed with capitals.
- The **sign-up was walked in a real browser** against the live instance, not
  only through the API: the details form, the emailed code step (the code is
  returned to the caller outside production), and then the two calls that
  matter — `POST /api/v1/auth/register` answers **202** and
  `POST /api/v1/auth/login` answers **200**, and the workspace loads with a
  real session (`yekis-api-token` holds a real JWT, not the mock's).
- The **phone-collision experiment** was run against the live instance using
  only an account this work created: a new address on a registered number
  answered `202` and could not sign in (`401`), and the same address on a
  free number answered `202` and signed in (`200`). That is the defect
  described above, reproduced rather than reasoned about.
- The **Mini App's fallback** was driven in a simulated Telegram webview: with
  the host unable to verify a Telegram credential, the Mini App shows "Telegram
  sign-in is unavailable", hides the Telegram tab, stores **no** token, and
  signs in through the phone-and-password path with a real JWT. Once the bot
  token was set, the same webview kept **both** tabs, sent its `initData` to
  the host and was refused with `BAD_SIGNATURE` — a real signature check, and
  still no session.
- The **profile-view ownership** was walked against the live instance in a
  real browser: opening a featured talent's profile shows **their** name in
  the breadcrumb and in the section heading, offers **no** "Edit Profile",
  offers "Report Profile", and highlights **no** sidebar item; "My Profile"
  then shows the signed-in account's own profile again, with the editor and
  no report button. The backend was already correct — `getPublicProfile`
  resolves the id it is given, and `recordProfileView` counts the view
  against the **target**, never the viewer (confirmed in the database: the
  viewed talent's `profileViewCount` rose and the viewer's did not).
- The **category artwork is 3D**: the six cards in "Find the right expertise."
  render a transparent WebP each from `/icons/*.webp` (800×800, 23–59 KB), all six
  decode on the live instance, and the footer carries the "Icons by Icons8"
  credit the licence asks for. The image is **20.8 MB lighter** than before —
  the category Lottie animations and their GIF fallbacks are gone and only the
  escrow animation in the about section remains.
- The **marketing pages and the Gigs section** were walked in a real browser against
  the live instance: the Gigs section answers with the Afro-Tech hero, the
  category rail, the search and sort controls and the gig cards, and the
  workspace header's controls are borderless. One animation is left on the page —
  the escrow handshake in the about section — served as a static asset from the
  image (`/lottie/escrow-deal.webm`, with `/lottie/escrow-deal.gif` as its
  fallback). The six category animations are gone with the 3D rework above; those
  paths now fall through to the SPA, which is why they answer `200 text/html`
  rather than `404`.
- The **Jobs / Proposals split** (`2ff173d`) is in the served build: the bundle
  is `/assets/index-DcJqTnD6.js` and it carries the strings that only that commit
  introduced - "Published Hiring Briefs & Proposal Pipeline", "My Published
  Briefs", "{count} new" and the "The briefs you have published" description.
  This one is a build check, not a browser walk: the evidence is that the asset
  containing the feature is the asset the host serves.
- **A profile photo can be saved again** (`4a97470`), deployed
  `2026-11-18T20:02:49Z`. The served bundle is `/assets/index-CvT9-vwH.js` and
  it contains `/api/v1/users/me/avatar`; the container log shows **38**
  migrations found and `Applying migration '20261118190000_user_avatar'`.
  A throwaway account then walked the path end to end on the live host:
  - `POST /api/v1/users/me/avatar` stored a 160-byte JPEG and returned
    `/api/v1/users/avatars/cmwn1oxd7000lhqokcegjcu5c` - **47** characters,
    against a `VARCHAR(500)`.
  - The public `GET` answered **`200 image/jpeg`** with
    `Cache-Control: public, max-age=31536000, immutable` and
    `X-Content-Type-Options: nosniff`, and the bytes matched the upload
    exactly.
  - `PATCH /api/v1/users/me/profile` stored that URL; a 600-character URL and
    a 2 KB data URL answered **`400`** with "Avatar URL cannot exceed 500
    characters" where the previous build answered a bare **`500
    INTERNAL_ERROR`**; another member's avatar id answered **`400`** "That
    avatar does not belong to this account."; and the profile still held the
    real photo after each refusal.
  - Erasure answered **`200`** with `avatarsDeleted: 1`, and the public URL
    then answered **`404`** - the bytes are gone with the account.
  The account was erased in the same run. The defect had been reproduced
  first: a 600-character value, a 2 KB data URL and a 400 KB data URL each
  answered `500 INTERNAL_ERROR`, while a short `https://` URL answered 200.
- The SPA's JavaScript and CSS load; `/api/v1/skills` returns rows from the
  managed PostgreSQL.
- The `frame-ancestors` allowlist arrives as a response header and the edge
  adds no `X-Frame-Options`.
- The container logs show the bundled Redis starting, **37** migrations
  applied, the object-store bucket found (`Object store bucket is ready.`)
  and the database connected.
- A termination signal stops the API gracefully
  (`[yekis] termination signal received; shutting down` → `exited with
  status 143`).

**Reading the onboarding code on this deployment.** With no SMTP credentials
the code is written to the container log and returned as `devCode`. The log
line carries the recipient and the code:

```
to: ui.check.1794591680673@example.com, subject: "Confirm your email address: 378256"
[DEV - NOT SENT] EMAIL OTP
```

Note the recipient is already the canonical form. The transactional mail
(password reset, escrow receipts, chat notifications) is **not** covered by
this fallback: with no SMTP it reports `email NOT delivered`, and the
password-reset path treats that as a failure so it invalidates the token
rather than leaving a valid credential nobody can receive.

### The Telegram bot — live since 2026-11-14

**`TELEGRAM_BOT_TOKEN` is set**, for the bot `@ye_kis_bot` (id `8967646633`,
"Yekis Jobs"). `TELEGRAM_BOT_USERNAME=ye_kis_bot` is set too, which is what
`botUsername()` reads — a hardcoded or missing handle produces deep links to
the wrong bot and stops the Login Widget rendering, because the widget
refuses a handle that does not match the bot whose token signs the payload.

The bot registered its own webhook on boot and the app confirms it:

```
{"msg":"Bot webhook set","webhookUrl":"https://yekis.app.aletcloud.com/api/v1/telegram/webhook"}
{"msg":"🤖 Telegram bot started"}
```

`getWebhookInfo` reports that URL with no delivery error, and the bot's
**menu button is already a `web_app` pointing at
`https://yekis.app.aletcloud.com/`** ("Open Yekis Jobs"), so the Mini App
opens from the bot's menu.

**What was verified against the live instance once the token was set:**

- `GET /api/v1/auth/oauth/providers` answers
  `{"telegram": true, "telegramBotUsername": "ye_kis_bot"}` — the Mini App's
  capability probe now sees a host that can verify a Telegram credential.
- `POST /api/v1/auth/telegram` with a **forged** `initData` answers
  **`401 {"error":"TELEGRAM_AUTH_FAILED","message":"BAD_SIGNATURE"}`** — not
  `503`. The signature is genuinely checked against the bot's token, and the
  Mini App stores **no** session when it fails.
- The Mini App in a browser shows **both** tabs ("Telegram Login" and
  "Mobile Phone") and no "unavailable" notice, because the host can now
  verify a Telegram credential.

**The token is in the app's environment, never in the repository.** It was
applied with `setAppEnv` (which replaces the whole set, so the 48 existing
variables were read and merged first) and a restart — no rebuild. It is a
live credential: **rotate it from @BotFather if it is ever exposed**, and
keep it out of `apps/backend/.env` in a commit.

**What the person in the Mini App saw before the token was set.** The host
answered `503 TELEGRAM_NOT_CONFIGURED` to `POST /api/v1/auth/telegram`. That
answer was swallowed by the frontend's offline mock, which stood in for it
and handed back `accessToken: "mock-jwt-access-token"` — a session the server
had never issued. The Mini App looked signed in, every request that followed
was refused with a 401, and the error on screen was a developer instruction
("TELEGRAM_BOT_TOKEN is missing or empty in your environment…") that the
person could not act on and that did not describe what had happened. The
client defect and the message are both fixed (`docs/CHANGELOG.md`): the
Mini App now says that Telegram sign-in is unavailable and offers the
phone-and-password path, and no authentication call can fabricate a session.

**One limit to know about while testing.** The sign-in route allows 10
attempts per 15 minutes per IP. Repeated probes answer `429
TOO_MANY_LOGIN_ATTEMPTS` rather than `401`, which looks like a different
failure than it is.

**If the token ever has to be set again**, it comes from @BotFather for the
bot named `ye_kis_bot`:

```
TELEGRAM_BOT_TOKEN=<the token @BotFather gives you>
```

Apply it with `setAppEnv` — reading the current variables first, because it
**replaces** the whole set — and restart the app (§4.4). No rebuild. The
Mini App URL in BotFather must be `https://yekis.app.aletcloud.com`. The
webhook is already configured on the host
(`TELEGRAM_WEBHOOK_URL=https://yekis.app.aletcloud.com/api/v1/telegram/webhook`,
and `TELEGRAM_WEBHOOK_SECRET` is set), and the app re-registers it on boot.
**Do not use a token belonging to a different bot**: the `initData` HMAC is
keyed on the bot's own token, so a token from another bot fails every
signature check.

### The second dead end: a registration that disappeared

Testing sign-up on this instance found a defect that has nothing to do with
Telegram. `registerUser` checked for duplicates with a single `OR` over the
address and the number, so the two collisions were the same event and the
route answered `202` for both. With a **new address on a number that was
already registered**, no account was created at all: the address that had
just been proven never became an account, the sign-in that followed answered
`401`, and the page told the person to sign in with an address that had no
account. The signup could never complete, and there was nothing on screen
that named the cause.

The two collisions are separate now. An address that is already on file still
answers `202` with the same body as a successful registration — nothing
about the account is disclosed. A number that is already on file, with an
address that is not, answers `409 {"error":"PHONE_IN_USE"}` and names the
action: use a different number, or sign in to the account that has it.

**What this means for the instance:** an account that was created against a
number which has since been used elsewhere can only be recovered by using
the number it was created with. The password-reset path cannot recover it on
this instance, because transactional mail needs SMTP credentials (§5) that
are not configured — with no SMTP the reset token is never delivered and is
invalidated, by design.

### Sign-in takes a number, and an address can create an account

Deployed as `1ccffc9` (`feat(auth): sign in with a number, and sign up with an
address`). Two things a person could not do on this instance, both of them in
the form rather than in the server.

**Sign-in refused a phone number.** The API has always accepted one —
`identifier`, `email` and `phone` are all read, and `normalizeLoginIdentifier`
turns `0911223344`, `251911223344` and `+251911223344` into the same `+251…`
before the lookup — but the **sign-in field was `type="email"`**, so the
browser's own validation refused the number ("Please include an '@' in the
email address") and the request never left the page. The field now takes
either, sends the value as `identifier`, and is labelled **"Email / Phone"**
in every language.

**An address could not create an account.** The Mini App's sign-up took a
number only and derived a synthetic `@yekis.local` address from it. An address
is accepted now, and it is **proven with the same six-digit code** the web
sign-up uses (`OnboardingVerification`, which is channel-generic) before the
account exists — an unproven address is somebody else's inbox, and it is the
login identifier.

**The account gets the reserved placeholder number.** `User.phone` is non-null
and unique because it is the payout destination, so it cannot be left empty;
an account created from an address alone is given the `+2510…` block no
operator is allocated, exactly what the federated sign-ins use. Such an
account can use the platform and is identified by its address, but it cannot
receive a payout until a number is claimed for it — a KYC step, not a sign-up
one.

**What was verified against the live instance after the deploy:**

- `scripts/check-deployment.mjs` passes **11/11**, and
  `scripts/e2e-onboarding.mjs` completes the whole onboarding flow.
- `POST /api/v1/auth/register` with **no number** answers `202`, and
  `POST /api/v1/auth/login` with `identifier` set to the address answers
  `200` with a real JWT. `GET /api/v1/auth/me` then reports the reserved
  placeholder (`+2510537361`) and the address that was typed.
- `POST /api/v1/auth/register` **with** a number answers `202`, and the same
  account signs in with `0983397699` and answers `200` with a real JWT. A
  wrong password answers `401`.
- The **Mini App's email sign-up** was walked in a simulated Telegram webview
  against this instance: the address is accepted, the six-digit code step
  replaces the panel ("We sent a 6-digit code to m***@example.com"), the code
  is accepted, the account is created and the workspace loads with a real
  session (`yekis-api-token` is a JWT, not the mock's). `GET /auth/me` then
  reports `phone=+2510386706` — the reserved block — with the KYC tier still
  `PENDING`.
- The **web sign-in was walked with a phone number** in a browser: the field
  reads "Email / Phone", the workspace loads, and the profile button shows
  the account that was created with that number.
- The deployed bundle is the new one (`/assets/index-DW4Isqrs.js`, carrying
  "Phone or Email", "Sign In with Phone or Email" and "Create an Account").
- The app came back **LIVE** with all **50** environment variables, the bot
  token and `TRUST_PROXY_HOPS=1` included.

**What this means for the instance:** a person can now sign in with the
number they registered with, and can create an account with an address alone.
An account created that way has no payout number yet — it is identified by
its address, and the number has to be claimed before it can receive money.

### The merge to main — one deployed commit, 2026-11-19

The fix branch was merged into `main` (`0965326`, then `b7774e7` for the
featured-talent work), and `fix/code-only-compliance-gaps` was fast-forwarded
to the same commit. **The host now serves the same tree as `main`** — the app
branch and `main` both point at `b7774e7`, so there is no longer a code path
that exists only on the deployed branch.

What the merge put on the host that the previous build did not have:

- **The fee engine.** Quote and settlement arithmetic is computed once in the
  backend (`modules/fees`), with the 7.5% platform fee and the 0.5% payment
  provider fee, instead of being redrawn in each screen.
- **The helpdesk and dispute SLAs.** `Conversation.firstRespondedAt`,
  `Conversation.resolvedAt` and `Dispute.firstRespondedAt` are written when the
  obligation is met, and the deadlines are derived from
  `SUPPORT_FIRST_RESPONSE_SLA_HOURS`, `SUPPORT_RESOLUTION_SLA_HOURS`,
  `DISPUTE_FIRST_RESPONSE_SLA_BUSINESS_DAYS` and
  `DISPUTE_RESOLUTION_SLA_BUSINESS_DAYS`. The ops console reads the server's
  clock (`sla` on the conversation and dispute rows); it does not compute one.
  `GET /api/v1/admin/sla/summary` is the reporting endpoint behind it.
- **The featured-talent redesign**, whose cards now carry `skills`, `bio` and
  `kycTier`.
- **The ten launch categories**, including Video Production, Accounting &
  Bookkeeping, Legal Research and Data Analytics.

**What was verified against the live instance after the merge:**

- `scripts/check-deployment.mjs` passes **11/11**.
- The app came back **LIVE** at `2026-11-19T18:56:41Z`, serving
  `/assets/index-HHEAoNJM.js`.
- That bundle carries `yekis_saved_talents` (the redesigned carousel),
  `7.5%` (the fee engine's platform fee), `/api/v1/users/me/avatar` and both
  "Video Production" and "Data Analytics" (all ten categories).
- `GET /api/v1/featured` answers `200` with two cards, and each one carries
  `skills`, `bio` and `kycTier` — the merged card builder, not the old one.
- `GET /api/v1/admin/sla/summary` answers **`401`** with
  `Missing or malformed Authorization header`, while an unknown API route
  answers `404` with `{"error":"NOT_FOUND"}`. The SLA route is therefore
  mounted on the live instance; the console reads the same clocks inline on
  each conversation and dispute rather than calling that endpoint, which is
  why the path is not in the browser bundle.

The SLA migration (`20261112140000_sla_tracking`) ships in this commit and is
applied by the container's start-up `prisma migrate deploy`. The platform did
not retain the start-up lines for this build, so the migration output is not
quoted here; what the host proves is the mounted route and the inline SLA
fields on the rows it returns.

### The one-time code disclosure fix — 2026-11-20

The staging deployment was handing out one-time codes. `POST
/api/v1/auth/email/code` answered `{"sent":true,…,"devCode":"097046"}` (probed
2026-11-19), because the guard was `NODE_ENV !== "production"` — and staging is
a publicly reachable host. The same rule covered the **withdrawal approval
code**, the second factor in front of a payout. It was fixed before any new
sign-in channel was switched on.

**What was deployed:** `57dc847` on `main`, fast-forwarded to
`fix/code-only-compliance-gaps`; both branches point at the same commit. The
commit range is `3c794d8..57dc847`:

| Commit | What it carries |
|---|---|
| `66e4ea5` | The fix itself — `isDevCodeDisclosureAllowed()` (disclosure only on `development` and `test`), every disclosure site gated (email OTP service and route, phone OTP service and route, withdrawal OTP route), and a capability endpoint that answers from the transport configuration instead of the environment name. |
| `5e2520b` | The merge of the four commits that landed on `main` after the last deployment (`aa2434b`, `0878c76`, `681ae5f`, `636151e`). |
| `4d9a825` | The build fix — those four commits left `main` un-buildable (see below). |
| `57dc847` | The founder's provider setup checklist (`docs/auth/PROVIDER_SETUP_CHECKLIST.md`). |

**The build break that had to be fixed first.** `aa2434b` added
`@google/genai` to the root `package.json` without regenerating
`pnpm-lock.yaml`, and the image runs `pnpm install --frozen-lockfile` — so
**every build from that commit failed before it started**. The same commit's
Mini-Me co-pilot code referenced schema fields that do not exist
(`Conversation.createdById`, `Milestone.sequenceNumber`, `GigStatus.PUBLISHED`,
`EscrowState.DELIVERED`/`FUNDED`), which the backend `tsc` build in the image
turned into thirteen type errors. Both are fixed in `4d9a825`. Without that
commit, the deployed branch could not have been fast-forwarded to `main` at
all, and a deploy of `main` would have failed in the image build.

**What was verified against the live instance after the redeploy:**

- The app came back **LIVE** at `2026-11-20T13:15:51Z` (previously
  `2026-11-19T19:14:51Z`), serving `/assets/index-DJckh7C0.js` (previously
  `/assets/index-DW4Isqrs.js`), with all **50** environment variables intact.
  The host was rebuilt once more at `2026-11-20T14:19:02Z` after the
  documentation commit below, and the verification here was taken against that
  build (the code is identical — the follow-up commit touches documentation
  only, so the bundle hash is the same).
- `POST /api/v1/auth/email/code` now answers **`503`
  `{"error":"EMAIL_UNAVAILABLE","message":"Could not send an email to that
  address. Check it and try again."}`** — **no code, no `devCode`**. The row is
  deleted and the caller is told the message was not sent, because there is no
  mail transport on this host.
- `GET /api/v1/auth/verification/channels` now answers
  `{"email":{"available":false,"label":"Email"},"phone":{"available":true,"label":"Telegram"}}`
  — the capability endpoint is telling the truth: no mail transport, so no
  email channel; the Telegram bot is configured, so the phone channel is real.
- `POST /api/v1/auth/phone/code` answers **`503 SMS_UNAVAILABLE`** — no SMS
  provider and no linked Telegram chat, so the code is neither delivered nor
  disclosed.
- `GET /api/v1/auth/oauth/providers` answers
  `{"google":false,…,"telegram":true,"telegramBotUsername":"ye_kis_bot"}` —
  unchanged and correct; Google is still not configured.
- `node scripts/check-deployment.mjs https://yekis.app.aletcloud.com` passes
  **11/11**.

**What this means for the instance:** the onboarding step now steers to the
**Telegram** channel instead of email, and it no longer "works" by publishing
the code in the response. The email channel comes back as soon as a mail
transport is configured — the steps are in `docs/auth/PROVIDER_SETUP_CHECKLIST.md`
(Brevo free, or a Gmail app password as the same-day alternative). The
**withdrawal approval code** is likewise unavailable on staging for members
with no linked Telegram chat, because there is no SMS provider on the host
either. That is the payout control working as intended, and it is the reason
the two-provider setup is the next task rather than an optional extra.

### The mail transport and Google sign-in — 2026-11-20

The founder created the two provider accounts that only they could create and
supplied the two credentials. This commit (`d6f2c30`) carries the Brevo
transport and the deployment that puts it, and the Google client id, on the
host.

**What was set on the host** (55 environment variables — the previous 50, all
preserved, plus five):

```
BREVO_API_KEY=<the founder's key>
EMAIL_TRANSPORT=brevo
EMAIL_FROM="Yekis <emushu70@gmail.com>"
GOOGLE_CLIENT_ID=1040630878719-…apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=<the same id>     # build-time: the frontend bundle
```

**A note on the ordering, because it cost a build.** The push to the deployed
branch starts a build on its own, and that build **restores the environment it
had when it started**: the first attempt set the variables while the
push-triggered build was already running, and the completed build overwrote
them (the app came back with the original 50 variables and none of the five
new ones). The variables were set again once the app was `LIVE` and idle, and
the redeploy was triggered explicitly. **On this platform, set the
environment first and deploy afterwards — never during a build.**

**What was verified against the live instance after the redeploy:**

- The app came back **LIVE** at `2026-11-20T20:28:42Z`, serving
  `/assets/index-DS674qxc.js`, with **55** environment variables.
- `GET /api/v1/auth/verification/channels` answers
  `{"email":{"available":true,"label":"Email"},"phone":{"available":true,"label":"Telegram"}}`
  — the email channel is now genuinely deliverable, and it says so because a
  transport is configured, not because the environment name says so.
- `POST /api/v1/auth/email/code` answers **`200 {"sent":true,"expiresAt":…,
  "retryAfterSec":60}`** — and **no `devCode`**. The message was accepted by
  the Brevo API and is in the founder's inbox. The code was delivered by mail
  and was not disclosed to the caller.
- `GET /api/v1/auth/oauth/providers` answers
  `{"google":true,…,"telegram":true,"telegramBotUsername":"ye_kis_bot"}`.
- The served bundle **contains the client id**, so the "Continue with Google"
  button is present — `VITE_GOOGLE_CLIENT_ID` is a build-time variable, and a
  backend-only value would have left the button hidden.
- `POST /api/v1/auth/phone/code` still answers **`503 SMS_UNAVAILABLE`** — no
  SMS provider and no linked Telegram chat, so the code is neither delivered
  nor disclosed. The payout control is unchanged by the mail work.
- `node scripts/check-deployment.mjs https://yekis.app.aletcloud.com` passes
  **11/11**.

**What this means for the instance:** the onboarding step now offers **email
and** Telegram, and the email code arrives by mail. Password recovery is
deliverable for the first time. The sender is still a personal address, so
the next improvement is a `yekis.*` domain verified in Brevo for SPF/DKIM —
a configuration change, not a code change.

### The Google link flow — 2026-11-22

The founder asked why a member whose account already existed could not keep
signing in with the Google button. The live instance answered
`409 ACCOUNT_LINK_REQUIRED` — *"Sign in with your password first, then link
this provider from your account settings"* — **and the place that message
pointed to did not exist**: no endpoint could link Google, and no screen could
link it from. The refusal itself was correct; the exit it offered was missing.

The work is in `5bc6bf6` (the link flow) and `2cfe5f0` (a one-line fix so a
Google button that cannot load says so instead of doing nothing). **No
environment variable changed**: the host still carries **55** variables, and
the Google client id and the Brevo key are the ones set on 2026-11-20.

**What was verified against the live instance after the redeploy:**

- The app came back **LIVE** at `2026-11-22T17:43:44Z`, serving
  `/assets/index-CEmbHoGT.js`, with **55** environment variables. The final
  build (`2cfe5f0`, the one-line fallback fix) came back **LIVE** at
  `2026-11-22T18:18:18Z`, serving `/assets/index-BcSyJWS5.js`, again with
  **55** environment variables.
- `GET /api/v1/auth/identities` answers **`401`** without a session and
  **`200`** with one. Before the deploy it was a **`404`** — the route did not
  exist, which is the same fact the 409 message was hiding.
- `POST /api/v1/auth/oauth/google/link` answers **`401`** without a session
  and **`403 {"error":"STEP_UP_REQUIRED"}`** for a session opened with a
  provider credential. Linking changes how a member gets in, so it needs a
  fresh **strong** session.
- The served bundle carries the new screen: it contains **"Linked Accounts"**,
  **"Google is linked"** and both new endpoint paths
  (`/api/v1/auth/identities`, `/api/v1/auth/oauth/google/link`).
- The production CSP now reads
  `frame-src https://appleid.cdn-apple.com https://accounts.google.com`.
  Google's own button is an **iframe**, and the old policy named only Apple's
  CDN — so the browser refused the frame and the button silently did nothing.
  `script-src` and `connect-src` already allowed `*.google.com`; only the
  frame directive was missing.
- `GET /api/v1/auth/oauth/providers` still answers
  `{"google":true,…,"telegram":true,"telegramBotUsername":"ye_kis_bot"}`.
- `node scripts/check-deployment.mjs https://yekis.app.aletcloud.com` passes
  **11/11**.

**What this means for the instance:** a member whose account owns a password
can now use the Google button — sign in with the password, open **Settings →
Security → Linked Accounts**, press the Google button there, and the Google
button on the sign-in card works from then on. The provider credential must be
the one whose address matches the account, the session must be fresh, and the
**no-auto-merge rule is unchanged**: a Google sign-in that merely matches the
address of a password account is still refused. The decisions are in
`docs/DECISIONS.md` (2026-11-22) and the evidence is in
`docs/auth/PHASE0_AUTH_AUDIT.md` Appendix A (E-20, E-21).

### The merged full version and the two remaining Google-button policies — 2026-11-23

The work that had been sitting on `feat/multi-channel-auth` (`6b44f04`) is now
merged into `main`, and `fix/code-only-compliance-gaps` — the branch the host
builds from — is fast-forwarded to the same commit. **The host now serves the
full, final version**: the glass dashboard redesign and the ops console rebuilt
on it, beside the Google link flow, the Brevo mail transport and the
one-time-code fixes that were already on `main`.

**What the merge changed on the host:**

- **The glass UI kit and the ops console.** `apps/frontend/src/components/ui-v2/`
  (`GlassCard`, `GlassChartTooltip`, `PageShell`, `ShinyBadge`, `StatCard`) and
  the **23** ops-console pages rebuilt on it, with
  `apps/frontend/src/styles/ops-console.css`.
- **The landing escrow steps** now fit their words (the Amharic, Oromo and
  Tigrinya labels no longer clipped), and **the Settings section switcher** is
  a real ARIA tablist with a `settings-tabbar`.
- **Nothing on the backend.** `git diff d438c8a...6b44f04 -- apps/backend` is
  **empty**: no route, no guard, no schema, no money path. The 200-route
  baseline is unchanged and the route audit passes.

**Two policies that still stopped the Google button** — the founder's browser
console named both:

- **The worker.** Google Identity Services runs part of itself in a **Web
  Worker served from `accounts.google.com`**. The production CSP's `worker-src`
  was `'self' blob:` — no Google — so the browser refused to construct it:
  *"Failed to construct 'Worker': Script at
  'https://accounts.google.com/gsi/client' cannot be accessed from origin …"*.
  `worker-src` now names `https://accounts.google.com` as well (one hostname,
  not a wildcard).
- **The opener.** The API sent helmet's default
  `Cross-Origin-Opener-Policy: same-origin`, which severs the OAuth popup from
  the page that opened it: *"Cross-Origin-Opener-Policy policy would block the
  window.open call"*. The SPA's responses now send
  `Cross-Origin-Opener-Policy: same-origin-allow-popups` explicitly — the
  value Chrome already assumes when the header is absent, made explicit so a
  platform proxy cannot sever the popup — and the dev server sends the same
  header, so local behaviour matches the deployed host. The API's stricter
  `same-origin` is left alone: it serves JSON, never a document that opens a
  popup.

**One blocker remains, and it is the founder's to clear:** the Google Cloud
OAuth client must list `https://yekis.app.aletcloud.com` under **Authorized
JavaScript origins**, or Google answers *"The Google origin is not allowed for
the client ID"* and refuses to issue a credential. The runbook is
`docs/auth/PROVIDER_SETUP_CHECKLIST.md` §B3. The *"The request has been
aborted"* and *"fedcm get() aborted without reason"* lines were the FedCM flow
being cut off by the two blocks above, not a third defect.

**No environment variable changed.** The host still carries the **55** variables
set on 2026-11-20, including the Google client id and the Brevo key.

**What was verified against the live instance after the redeploy:**

- The app came back **LIVE** at `2026-11-23T19:46:01Z`, serving
  `/assets/index-BNkU2lOs.js` and `/assets/index-DR9okXdP.css`, with **55**
  environment variables. The CSS hash is **identical** to the local production
  build of the merged tree, which is what proves the host is serving the
  merged source and not the previous build.
- The merged work is in the served assets: the CSS carries the glass UI kit
  (31 `glass` rules), the ops console's **7** `.ops-root .crumb` rules, the
  Settings tab bar (`settings-tabbar`) and the landing escrow's `word-fit`;
  the bundle carries **"Linked Accounts"**, **"Google is linked"** and both
  new endpoint paths.
- `GET /api/v1/auth/identities` answers **401** without a session, and
  `POST /api/v1/auth/oauth/google/link` answers **401** without a session.
- `GET /api/v1/auth/oauth/providers` answers
  `{"google":true,…,"telegram":true,"telegramBotUsername":"ye_kis_bot"}`.
- `node scripts/check-deployment.mjs https://yekis.app.aletcloud.com` passes
  **11/11**.
- The start-up log reports **"No pending migrations to apply."** — the merge
  carried no schema change, as the empty backend diff predicted.
- `/` now sends **`Cross-Origin-Opener-Policy: same-origin-allow-popups`**,
  and the served HTML's policy now reads
  `worker-src 'self' blob: https://accounts.google.com`.

**What a real browser on the live host now shows** (Chromium, the sign-in
card open):

- The Google Identity Services script **loads**
  (`https://accounts.google.com/gsi/client`), the button's **iframe is live**
  (`https://accounts.google.com/gsi/button?...client_id=1040630878719-…`) and
  it carries the Amharic label *"በGoogle አዝራር ይግቡ"*. There is **no** worker
  error and **no** opener-policy error any more — the two console lines the
  founder's screenshot carried are gone.
- One policy still blocked part of it: the console carried *"Loading the
  stylesheet 'https://accounts.google.com/gsi/style' violates the following
  Content Security Policy directive"* — the button rendered unstyled.
  `style-src` now names `https://accounts.google.com`, and that is fixed in
  the commit after this one.
- **After the `style-src` fix** (`1de9070`, the app back **LIVE** at
  `2026-11-23T20:48:08Z`, 55 environment variables, the same bundle — the
  policy lives in `index.html`, so the JavaScript and CSS hashes did not
  change), the browser was driven through the sign-in card again and
  **every CSP violation is gone**: the console carries no worker error, no
  opener-policy error and no blocked-stylesheet error. Google's own
  stylesheet is now in the document's stylesheet list, the button renders
  with its own styling next to the Telegram button, and the only lines left
  are the known cosmetic `frame-ancestors`-in-a-`<meta>` notice and the two
  Telegram version notices.
- **One blocker remains, and it is the founder's to clear.** The console's
  **"[GSI_LOGGER]: The given origin is not allowed for the given client ID"**
  and the **400** on `accounts.google.com/gsi/button` are the **same single
  cause**: the Google Cloud OAuth client refuses the origin, because
  `https://yekis.app.aletcloud.com` is not in its **Authorized JavaScript
  origins**. Nothing on the platform can change that — it is a setting in the
  founder's Google Cloud project. The runbook is
  `docs/auth/PROVIDER_SETUP_CHECKLIST.md` §B3.

### The platform-wide responsiveness work goes live - 2026-11-25

**The third merge, and the first deployment of the responsiveness work.** Five
commits landed on `feat/multi-channel-auth` after the 2026-11-23 deployment
(`58b76d3`, `1940cd2`, `529edfe`, `37fcab1`, `7b82df6`). They are merged into
`main` as **`b4634b5`** (a real merge, parents `c4c3fe5` and `7b82df6`) and the
deployed branch is fast-forwarded to the same commit:

```bash
git push origin main                                  # c4c3fe5..b4634b5
git push origin main:fix/code-only-compliance-gaps    # c4c3fe5..b4634b5
```

Both refs are at `b4634b5`, and the app is **LIVE** at
`2026-11-25T07:17:46Z` (previous `2026-11-23T20:48:08Z`), still with **55**
environment variables and still deploying `fix/code-only-compliance-gaps`.
The docs commit that records this deployment triggers one more build of the
same tree; the served assets stay identical, so `lastDeployedAt` moves a few
minutes past the timestamp above without the code changing.

**The lockfile was the one dangerous part, and it was repaired deliberately.**
Their branch's `pnpm-lock.yaml` recorded `react-icons` in the **root** importer,
while `main` had removed the root declaration in `f2149c0`. That mismatch is
exactly what makes `pnpm install --frozen-lockfile` fail with
`ERR_PNPM_OUTDATED_LOCKFILE`, before the image build starts — it was reproduced
on the merged tree, then the lockfile was regenerated with the repository's
pinned pnpm **9.0.0** (the version the image installs). The regeneration removed
**exactly three lines** — the orphan root entry — and nothing else. The merged
tree now installs cleanly, `kenat@4.0.2` is present, and
`scripts/check-lockfile-parity.mjs` was extended to compare **both** directions
so this class of merge damage cannot pass a gate again.

**One compliance fix was restored by hand.** Their corporate-email commit put
back the *"Escrow Protection Policy"* wording that `main` had deliberately
replaced, claiming the platform holds funds *"securely"* in escrow — a promise
the segregated NBE account cannot back yet. The receipt now carries `main`'s
compliant copy (**"How this payment is held"**, the auto-release window and the
dispute outcome) inside their HTML shell, the total row reads **"Total held"**,
and the shell footer no longer says *"Secure Ethiopian Escrow"*. Their own test
still asserted the compliant wording, so the merge would otherwise have shipped
a regression.

**What was verified before the push:**

- Frontend type-check and production build clean, with `kenat` installed.
- Backend type-check clean.
- `privacy-data-rights` + `oauth-account-link` + `google-auth-and-email`
  **26/26 pass**. (The privacy suite needs a working Redis: the local `.env`
  password was stale and every session call waited out the 30 s timeout; a
  throwaway Redis on `127.0.0.1:6380` proved the suite itself is green.)
- Route audit **passed** against the **201**-route baseline.
- Doc parity **complete alignment**; secret scan **0 findings** across 1040
  tracked files; lockfile parity **clean** in both directions.

**What was verified against the live instance after the redeploy:**

- The app came back **LIVE** at `2026-11-25T07:17:46Z`, serving
  `/assets/index-CMm-YkrB.js` and `/assets/index-5W81mL1d.css`.
- The CSS hash is **identical** to the local production build. The JavaScript
  hash is not, and that is expected: the host bakes its `VITE_*` values in at
  build time (`VITE_GOOGLE_CLIENT_ID`, `VITE_OBJECT_STORE_ORIGIN`,
  `VITE_TELEGRAM_BOT_USERNAME`), so the bundle content — and therefore its
  hash — differs from a local build made without them. The CSS has no `VITE_*`
  input, so it is the reliable fingerprint.
- The served bundle carries the new work: `erasure/blockers` (**2**),
  `Deactivate Account` (**3**) and `settings-tabbar` (**1**).
- `GET /api/v1/auth/identities` → **401**;
  `POST /api/v1/auth/oauth/google/link` → **401**;
  `GET /api/v1/users/me/erasure/blockers` → **401**;
  `GET /api/v1/auth/oauth/providers` →
  `{"google":true,…,"telegram":true,"telegramBotUsername":"ye_kis_bot"}`.
- `node scripts/check-deployment.mjs https://yekis.app.aletcloud.com` passes
  **11/11**.
- The start-up log reports the bundled Redis up, **40 migrations found**,
  **"No pending migrations to apply."**, the API listening on 8080 and the bot
  started. `GET /api/v1/telegram/health` answers **200** with
  `"pendingUpdateCount":0`.

**The Google origin blocker is unchanged.** `https://yekis.app.aletcloud.com`
still has to be added to the OAuth client's **Authorized JavaScript origins**
(`docs/auth/PROVIDER_SETUP_CHECKLIST.md` §B3). The CSP, worker and opener fixes
from 2026-11-23 are all still in the deployed tree.

### Teardown

```bash
# Over MCP:
deleteApp(appId: "d40f8eff-9cd7-42f2-9c24-01b750def027")        # free plan
deleteBucket(bucketId: "2719e571-5b50-445d-bf63-154aacb4c549")  # 50 ETB/mo
deleteDatabase(instanceId: "da073380-7423-44a4-a907-e310672cf5bf")  # free plan
```

The app and the database are free, so deleting them costs nothing — but
deleting the database throws away the migrated schema, and the next
deployment would have to apply all 36 migrations again. **The bucket is the
one that bills**: delete it, or the wallet keeps paying 50 ETB a month for
it.
