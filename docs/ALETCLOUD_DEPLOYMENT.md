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

- The repository pushed to GitHub, on a **testing branch** — not `main`.
  Every push to the connected branch redeploys.
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

1. Connect GitHub, pick the repository and the **testing branch**.
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

**Environment variables must be set when the app is created.** This is the
one that bites. `setAppEnv` writes them — `getAppEnv` reads them back
correctly — and they are in the record. But **every deploy resets the app's
env to the set it was created with**, so a variable added after creation
silently disappears at the next deploy, and the container starts without it.

The symptom is precise and repeatable: the container crash-loops with
`Prisma schema validation - Environment variable not found: DATABASE_URL`,
even though `getAppEnv` shows `DATABASE_URL` present.

So: pass the whole environment in the `deployApp` call. If a variable has to
change later, the app has to be deleted and recreated with the new set. The
`setAppEnv` tool is still the right way to *read* what is in effect
(`getAppEnv`), and `connectDatabaseToApp` is still the way to get a
database's full credential set — read it, then put it in the creation-time
environment.

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

Set these in the console under the app's **Environment** settings — **or,
preferably, in the `deployApp` call that creates the app**, because a deploy
resets the environment to the set it was created with (§4.4).

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
| `TELEGRAM_ENV` | `staging` | Selects webhook mode over long polling |
| `TELEGRAM_BOT_TOKEN` | the bot token | The Mini App is opened from `@ye_kis_bot` |
| `TELEGRAM_WEBHOOK_URL` | `https://<your-app>.app.aletcloud.com/api/v1/telegram/webhook` | The bot registers this itself at start-up |
| `TELEGRAM_WEBHOOK_SECRET` | a random 32+ character string | Telegram sends it on every update; the route refuses updates without it |
| `VITE_TELEGRAM_BOT_USERNAME` | `ye_kis_bot` | Build-time; the frontend shows the right bot handle |
| `VITE_OBJECT_STORE_ORIGIN` | `https://s3.aletcloud.com` | Build-time; see §5.2 |
| `VITE_GOOGLE_CLIENT_ID` | *optional* | Build-time; the sign-in button is hidden when it is absent |
| `RUN_MIGRATIONS` | `true` | The container applies `prisma migrate deploy` before the API starts |

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
testing branch deliberately rather than on every commit.

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
| App | `yekis-test` (`d1c542c8-b30f-4987-8ec1-0c61ef396fcc`) |
| Plan | **Solo** — free, no expiry, 250m CPU / 256 MiB, 1 replica |
| Repository | `yonasmindaye04-sketch/Yekis`, branch `fix/code-only-compliance-gaps`, commit `2bf58a7` |
| Database | `yekis-jobs` — Managed PostgreSQL **18**, Solo, free, internal network only, 10 connections |
| Object storage | **not created** — needs 1.64 ETB of wallet balance |
| Telegram bot | **not configured** — no bot token was available |

What was verified against the live instance: `scripts/check-deployment.mjs`
passes **11/11**; the SPA's JavaScript and CSS load; `/api/v1/skills` returns
rows from the managed PostgreSQL; the `frame-ancestors` allowlist arrives as
a response header and no `X-Frame-Options` is added by the edge; the
container logs show the bundled Redis starting, 36 migrations applied and the
database connected.

### Two things are still open

**The object store.** The bucket was not created because the wallet holds
0 ETB. Until it exists, the app runs with placeholder credentials and every
object-store call fails with a 403 — which means **document upload, receipt
attachment and the staff KYC preview do not work**. The API still boots, and
everything else is unaffected.

To close it: top up the wallet (1.64 ETB covers 24 hours of the bucket;
more gives it a longer life), create the bucket, then **delete and recreate
the app** with the real credentials in the creation-time environment — a
deploy resets the environment to the set the app was created with (§4.4), so
`setAppEnv` alone will not do it.

**The Telegram bot.** No bot token was available, so `TELEGRAM_BOT_TOKEN` is
unset. The Mini App's URL is configured in BotFather and the app serves it
fine, but Telegram sign-in inside the Mini App cannot verify its `initData`
without the token, so a user has to sign in with email and password. The
bot's own commands, the `/staff` link and the webhook are all off.

### Teardown

```bash
# Over MCP:
deleteApp(appId: "d1c542c8-b30f-4987-8ec1-0c61ef396fcc")   # free plan
deleteDatabase(instanceId: "da073380-7423-44a4-a907-e310672cf5bf")  # free plan
```

Both are free, so deleting them costs nothing — but deleting the database
throws away the migrated schema, and the next deployment would have to
apply all 36 migrations again.
