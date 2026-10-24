# Cloudflare Tunnel Playbook

This playbook outlines how to use **Cloudflare Tunnel (`cloudflared`)** for local development
and testing in the Yekis platform. It replaces the previous ngrok-based workflow.

## Quick start

```powershell
pnpm dev:tunnel
```

That is the whole workflow. It starts the tunnel, wires up the Mini App link, and boots
the app. You never change a URL in BotFather or in `.env` again.

- The public URL changes every run (random `trycloudflare.com` hostname). That is
  expected and handled for you.
- Open the Mini App from the **chat menu button** (the button under the message box) or
  the **Open Yekis Jobs** button on `/start`. Both are re-pointed at the current URL
  every time the backend starts.
- Send `/link` to the bot to see the current Mini App URL.
- The bot's *profile* button is the one exception; see [Troubleshooting](#7-troubleshooting).

## What it is and what it does

`cloudflared` is the Cloudflare Tunnel client. A **quick tunnel** (no account required) runs
locally and creates an outbound-only connection to Cloudflare's edge, which publishes a
public `https://<random>.trycloudflare.com` URL that forwards to a local port (e.g. 3000).

What it does for Yekis:

1. **Telegram Mini App testing** — Telegram requires a secure public HTTPS origin to
   launch a Mini App. The tunnel gives the local Vite dev server (`localhost:5173`) a
   public HTTPS URL without deploying anything.
2. **Webhook testing** — payment gateways and the Telegram Bot API can deliver callbacks
   to the local backend through the same origin (via the Vite `/api` proxy) or a
   dedicated backend tunnel.
3. **No account / no auth token** — unlike ngrok free tier, quick tunnels need no signup.
4. **No browser interstitial** — ngrok free shows a "Visit Site" warning page; Cloudflare
   does not, so Telegram Mini App iframes load cleanly.
5. **Unlimited bandwidth** on quick tunnels.

How the data flows:

```
Telegram client
   -> https://<random>.trycloudflare.com  (Cloudflare edge)
   -> cloudflared (local process)
   -> http://localhost:3000 (Vite dev server)
   -> Vite proxy /api -> http://localhost:4000 (Express backend)
```

The backend is never exposed directly in the Mini App flow; only the frontend port is
tunneled, and `/api` is proxied by Vite. This keeps a single public origin, which is
required when `Same-Origin Restriction` is enabled in BotFather.

## 1. Installation

### Windows

```powershell
winget install --id Cloudflare.cloudflared
# or download the installer from:
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
```

Verify:

```powershell
cloudflared --version
```

The binary is also looked up in common locations by `scripts/start-cloudflare-tunnel.ps1`
(`C:\Program Files (x86)\cloudflared\cloudflared.exe`, etc.).

### macOS / Linux

```bash
brew install cloudflared          # macOS
# or
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
```

No authentication is required for quick tunnels.

## 2. Telegram Mini App local testing

### The one-command way (recommended)

```powershell
pnpm dev:tunnel
```

That single command starts the Cloudflare Tunnel, captures the public
`https://<random>.trycloudflare.com` URL, injects it as `FRONTEND_URL`, and boots the
backend and frontend. Nothing to copy, nothing to paste, no `.env` edits.

The URL is only announced once the tunnel has actually registered a connection with
a Cloudflare edge, and the frontend boots first — so by the time the URL is printed,
opening it works. (cloudflared allocates the URL before the edge connection exists;
announcing it earlier handed out links that answered 502 while the handshake was
still running.)

### Transport: HTTP/2 by default

`pnpm dev:tunnel` runs cloudflared with `--protocol http2` rather than QUIC.

On links where UDP 7844 is filtered or lossy, QUIC registers a connection and then
drops it a minute or two later with
`failed to accept QUIC stream: timeout: no recent network activity`, after which the
public URL starts answering **530**. HTTP/2 rides on TCP 7844 and stays up. This is
also what cloudflared's own precheck advises: *"Allow outbound QUIC traffic on port
7844 or use HTTP2."*

Override it if your network prefers QUIC:

```powershell
$env:CLOUDFLARED_PROTOCOL = "quic"   # or "auto" to let cloudflared decide
pnpm dev:tunnel
```

On every backend boot the bot re-points the Telegram **chat menu button** at that live
URL (`setChatMenuButton`), and every Mini App button the bot sends (`/start`, `/menu`,
job and wallet actions) is built from the same value at request time. So the Mini App
always opens on the current tunnel URL without any manual step.

To see the current URL at any time, send `/link` to the bot.

### The manual way (three terminals)

Only if you want to run each piece yourself.

#### Step 1 — Start local servers

```powershell
# Terminal 1
pnpm run dev:backend

# Terminal 2
pnpm run dev:frontend
```

#### Step 2 — Start the Cloudflare Tunnel

```powershell
# Terminal 3
pnpm run tunnel:cloudflare
# equivalent: cloudflared tunnel --url http://localhost:5173
```

cloudflared prints a line like:

```
https://random-words-here.trycloudflare.com
```

#### Step 3 — Point the backend at the tunnel origin

Copy that URL into `apps/backend/.env` (local dev) and restart the backend:

```env
FRONTEND_URL=https://<your-tunnel>.trycloudflare.com
# single proxy hop (cloudflared) in front of the API
TRUST_PROXY_HOPS=1
```

#### Step 4 — BotFather: one-time only

You only need to touch BotFather once, and only for the bot-profile button:

1. Message `@BotFather`, select your bot.
2. Set **Main App** URL to the tunnel URL, or clear it if you do not want the
   profile button at all.
3. Do **not** bother setting the menu button by hand — the bot sets it on every boot.

The chat menu button and every in-app button are maintained automatically from
`FRONTEND_URL`, so this is never repeated.

### Important notes

- **No backend tunnel needed** for the Mini App flow. Vite proxies `/api` to
  `http://127.0.0.1:4000`. Tunneling only port 3000 keeps a single public origin.
- **Ephemeral URLs**: quick-tunnel hostnames change on every run.
- **Zero-manual-link mode**: run `pnpm dev:tunnel` instead of starting servers by
  hand. It starts cloudflared, captures the `*.trycloudflare.com` URL, injects it as
  `FRONTEND_URL`, and boots backend + frontend. The backend already reconciles the
  Telegram chat menu button from `FRONTEND_URL` on boot (`setChatMenuButton`), and all
  in-app Mini App buttons are built from `FRONTEND_URL` at request time, so **no
  BotFather changes are required between runs**.
- **The Mini App link changes every run** (random `trycloudflare.com` hostname), but
  you never edit it anywhere. Open the Mini App from the chat **menu button** (button
  under the message box) or the **Open Yekis Jobs** button on `/start`; both are rebuilt
  from the live `FRONTEND_URL` on every boot. Run `/link` in the bot to see the current
  URL at any time.
- **One-time cleanup**: Telegram's bot-profile "Open Yekis Jobs" button uses the
  **BotFather Main App URL**, which is frozen at whatever URL you last set there
  (this is why you saw `ERR_NGROK_3200` on the old ngrok address). The Bot API has no
  method to change it, so set it **once** in BotFather (or clear it) and never again —
  the in-chat menu button is the one to use, and it is automatic.
- **Allowed hosts**: `apps/frontend/vite.config.ts` sets an explicit
  `server.allowedHosts` list (`.trycloudflare.com`, `.ngrok-free.dev`,
  `.ngrok.app`, `.ngrok.io`, `.loca.lt`, `localhost`, `127.0.0.1`). `*.trycloudflare.com`
  Host headers are accepted; anything else is rejected, which is what stops a
  DNS-rebinding Host header from being served. Add another host with
  `VITE_ALLOWED_HOSTS=my.host,other.host`.

## 3. Webhook testing

If an integration must call the backend directly (not through Vite), tunnel port 4000:

```powershell
cloudflared tunnel --url http://localhost:4000
```

Register the resulting URL + path as the webhook, e.g.:

```
https://<tunnel>.trycloudflare.com/api/v1/telegram/webhook
```

The backend validates `TELEGRAM_WEBHOOK_SECRET`; keep it set. When no webhook URL is
configured, the bot falls back to polling (dev only).

## 4. Vite configuration

`apps/frontend/vite.config.ts`:

- `server.host` — `127.0.0.1` by default; the tunnel launcher passes
  `--host=0.0.0.0` explicitly because cloudflared needs a reachable listener.
  Set `VITE_DEV_HOST=0.0.0.0` to do the same outside the tunnel script.
- `server.port: 3000` — frontend runs on port 3000.
- `server.allowedHosts` — explicit allowlist; see the note in section 2.
- `server.fs.deny` — the dev server refuses to serve `backups/`, `*.dump`,
  `*.sql`, `resource_to_read/`, `docs/security/`, `uploads/` and the local
  credential scripts over `/@fs/`. Do not remove these: an OWASP ZAP scan
  confirmed that `/@fs/` served a full PostgreSQL dump before they were added.
- `/api` proxy — forwarded to `http://127.0.0.1:4000` via `resilientApiProxyPlugin`.
- Headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`, `Strict-Transport-Security`,
  `Cross-Origin-Opener-Policy: same-origin-allow-popups`,
  `Cross-Origin-Resource-Policy: same-origin`, `Permissions-Policy`.

No `ngrok-skip-browser-warning` header is needed with Cloudflare.

## 5. Reverse proxy / trusted hops

`TRUST_PROXY_HOPS` is a **count**, not a boolean. Express walks `X-Forwarded-For`
right-to-left for that many hops. With one Cloudflare quick tunnel in front of the API
(set only if the API itself is tunneled), use `1`. In production behind nginx/ALB,
use the real hop count. Leaving it unset means "no proxy", correct for bare localhost.

## 6. Named tunnels (persistent hostname) — optional

Quick tunnels change hostname every run. For a stable dev URL, create a named tunnel
(requires a free Cloudflare account):

```powershell
cloudflared tunnel login
cloudflared tunnel create yekis-dev
cloudflared tunnel route dns yekis-dev dev.yekis.et
cloudflared tunnel run --url http://localhost:3000 yekis-dev
```

Then `dev.yekis.et` (or your chosen hostname) stays constant across runs; update
BotFather once.

## 7. Troubleshooting

- **Mini App opens an `ngrok` / dead-tunnel error page (e.g. `ERR_NGROK_3200`)** —
  you opened the bot's *profile* "Open Yekis Jobs" button, which uses the frozen
  BotFather **Main App URL** (set once, cannot be changed by code). Open the Mini App
  from the chat **menu button** or the `/start` "Open Yekis Jobs" button instead — those
  are rebuilt from the live `FRONTEND_URL` on every backend boot. To permanently retire
  the stale profile button, clear or repoint the Main App URL in BotFather once.
- **`cloudflared` not found** — install it and ensure it is on `PATH`; the helper
  script also checks common install paths.
- **502 / connection refused** — Vite must be running on `3000` with `host: "0.0.0.0"`.
  Start `pnpm run dev:frontend` first.
- **530 from the tunnel URL** — the edge connection dropped. The usual cause is QUIC
  (UDP 7844) being filtered on your link; `pnpm dev:tunnel` already defaults to
  HTTP/2 for that reason, so re-run it and confirm the log says `protocol=http2`. If
  it says `protocol=quic`, something set `CLOUDFLARED_PROTOCOL`.
- **"failed to accept QUIC stream: timeout: no recent network activity"** — same
  cause: UDP 7844 is not usable on this network. Use HTTP/2.
- **"Telegram Bot API is UNREACHABLE after retries"** — outbound access to
  `api.telegram.org` failed. The platform keeps serving, and the bot now retries in
  the background (`15s → 30s → 60s → 2m → 5m`), so it comes up by itself once the
  link recovers — no restart needed. "Telegram bot token validation failed" is a
  different problem: the token itself is wrong, and retrying will not help.
- **Invalid Host header** — `allowedHosts` must include the tunnel host. With
  `allowedHosts: true` this is already handled.
- **Telegram Mini App blank / blocked iframe** — `X-Frame-Options` must allow
  embedding; confirm `ALLOWALL` in `vite.config.ts`.
- **Wrong client IP / rate limits collapse** — set `TRUST_PROXY_HOPS=1` when a
  tunnel sits in front of the API.
- **URL changed mid-session** — quick tunnels are ephemeral. Stop and re-run
  `pnpm dev:tunnel`; the menu button is re-pointed automatically on boot. No manual
  URL edit is needed anywhere.
- **CORS errors** — the frontend calls the API through the same tunnel origin via the
  Vite proxy, so this normally does not occur. If it does, make sure the backend is
  running so the proxy target is available.

## 8. Security notes

- Quick tunnels are public; anyone with the URL can reach your dev server. Do not run
  them against production data or with real secrets in `.env`.
- Keep `TELEGRAM_BOT_TOKEN`, DB credentials, and JWT secrets out of frontend code.
- The backend refuses to start in production if `FRONTEND_URL` is not `https:`.
- Named tunnels + Cloudflare Access can restrict who reaches the dev URL.

## 9. Comparison with ngrok

| Concern | ngrok (free) | Cloudflare quick tunnel |
|---|---|---|
| Account required | yes (authtoken) | no |
| Browser interstitial | yes ("Visit Site") | no |
| Bandwidth | limited | unlimited |
| URL stability | random, changes | random, changes |
| Host header handling | `.ngrok-free.dev` | `.trycloudflare.com` |
| Backend proxy needed | no (single origin) | no (single origin) |

## 10. Files touched by this migration

- `apps/frontend/vite.config.ts` — removed `ngrok-skip-browser-warning`, kept
  `allowedHosts: true`.
- `apps/backend/.env.example` — cloudflared example instead of ngrok.
- `apps/backend/src/config/env.ts`, `app.ts`, `modules/bot/bot.service.ts` — comments.
- `apps/backend/src/modules/bot/handlers/commands.ts` — new `/link` command that prints
  the current Mini App URL.
- `apps/backend/src/modules/bot/bot.service.ts` — `/link` registered in the command list.
- `scripts/dev-with-tunnel.mjs` — one-command dev launcher: tunnel + `FRONTEND_URL`
  injection + backend/frontend boot.
- `scripts/start-cloudflare-tunnel.ps1` — helper to launch cloudflared alone.
- `package.json` — `tunnel:cloudflare` and `dev:tunnel` scripts.
- `docs/telegram-mini-app-implementation.md` — Cloudflare-based local dev steps.
- `docs/WALKTHROUGH.md` — removed the stale ngrok header reference.
- `docs/NGROK_PLAYBOOK.md` — deleted, replaced by this document.