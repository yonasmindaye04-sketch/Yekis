# Start a Cloudflare quick tunnel (cloudflared) exposing the Vite dev server
# (port 3000) on a public HTTPS URL. No account or auth token required.
#
# Usage:
#   .\scripts\start-cloudflare-tunnel.ps1            # tunnel port 3000
#   .\scripts\start-cloudflare-tunnel.ps1 -Port 4000 # tunnel the backend
#
# The public https://*.trycloudflare.com URL is printed by cloudflared; paste it
# into BotFather (Main App + menu button) and into FRONTEND_URL / CORS origins.

param(
    [int]$Port = 3000
)

# A quick tunnel publishes the target with no access control. Require an
# explicit opt-in so a dev server cannot be exposed by habit.
if ($env:ALLOW_DEV_TUNNEL -ne "1") {
    Write-Error "Refusing to expose a local server by default. Set ALLOW_DEV_TUNNEL=1 only for a short-lived, trusted demo."
    exit 1
}

$cf = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cf) {
    $candidates = @(
        "C:\Program Files (x86)\cloudflared\cloudflared.exe",
        "C:\Program Files\cloudflared\cloudflared.exe",
        "C:\Program Files\Cloudflare\cloudflared\cloudflared.exe",
        "$env:USERPROFILE\cloudflared.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path -LiteralPath $c) { $cf = $c; break }
    }
}
if (-not $cf) {
    Write-Error "cloudflared not found. Install from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    exit 1
}

Write-Host "[cloudflare] Starting quick tunnel -> http://127.0.0.1:$Port"
Write-Host "[cloudflare] Press Ctrl+C to stop."
Write-Host "[cloudflare] WARNING: the URL is public. Stop the tunnel as soon as the demo ends."
& $cf tunnel --url "http://127.0.0.1:$Port"