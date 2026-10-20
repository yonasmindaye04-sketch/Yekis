# Start a Cloudflare quick tunnel (cloudflared) exposing the Vite dev server
# (port 5173) on a public HTTPS URL. No account or auth token required.
#
# Usage:
#   .\scripts\start-cloudflare-tunnel.ps1            # tunnel port 5173
#   .\scripts\start-cloudflare-tunnel.ps1 -Port 4000 # tunnel the backend
#
# The public https://*.trycloudflare.com URL is printed by cloudflared; paste it
# into BotFather (Main App + menu button) and into FRONTEND_URL / CORS origins.

param(
    [int]$Port = 5173
)

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

Write-Host "[cloudflare] Starting quick tunnel -> http://localhost:$Port"
Write-Host "[cloudflare] Press Ctrl+C to stop."
& $cf tunnel --url "http://localhost:$Port"