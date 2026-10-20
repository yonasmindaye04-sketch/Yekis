// Dev launcher: starts a Cloudflare quick tunnel to the Vite port, captures the
// public HTTPS URL, injects it as FRONTEND_URL, then runs backend + frontend.
// Result: the bot reconciles its Mini App menu button from FRONTEND_URL on boot,
// so no manual BotFather URL updates are needed between runs.
import { spawn } from "node:child_process";

const PORT = Number(process.env.TUNNEL_PORT || 5173);
const URL_RE = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;

let tunnelProc = null;
let backendProc = null;
let frontendProc = null;
let tunnelUrl = null;

function killAll() {
  for (const p of [backendProc, frontendProc, tunnelProc]) {
    if (p && !p.killed) {
      try { p.kill("SIGTERM"); } catch {}
    }
  }
}
process.on("SIGINT", () => { killAll(); process.exit(0); });
process.on("SIGTERM", () => { killAll(); process.exit(0); });

function spawnLogged(cmd, args, opts = {}) {
  const p = spawn(cmd, args, { stdio: "inherit", shell: true, ...opts });
  p.on("exit", (code) => {
    // keep others running; log
  });
  return p;
}

// 1. Start cloudflared and wait for the public URL.
tunnelProc = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${PORT}`], {
  stdio: ["ignore", "pipe", "pipe"],
});

function handleTunnelLine(line) {
  if (tunnelUrl) return;
  const m = line.match(URL_RE);
  if (m) {
    tunnelUrl = m[0];
    console.log(`[tunnel] Cloudflare Tunnel URL: ${tunnelUrl}`);
    startApps();
  }
}
tunnelProc.stdout.on("data", (d) => process.stdout.write(d));
tunnelProc.stderr.on("data", (d) => {
  const text = d.toString();
  process.stderr.write(d);
  for (const line of text.split(/\r?\n/)) handleTunnelLine(line);
});

tunnelProc.on("exit", (code) => {
  if (!tunnelUrl) console.error(`[tunnel] cloudflared exited (${code}) before producing a URL`);
});

let started = false;
function startApps() {
  if (started) return;
  started = true;
  const env = { ...process.env, FRONTEND_URL: tunnelUrl };

  // infra (docker) is assumed already up; run compose up -d quickly.
  spawnLogged("docker", ["compose", "up", "-d"], { cwd: process.cwd() });

  frontendProc = spawnLogged("pnpm", ["--dir", "apps/frontend", "dev"], { env });
  backendProc = spawnLogged("pnpm", ["--filter", "backend", "dev"], { env });
}
