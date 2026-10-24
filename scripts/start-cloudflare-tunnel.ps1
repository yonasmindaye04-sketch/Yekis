<#
.SYNOPSIS
    Starts a Cloudflare quick tunnel pointing at the Vite dev server (localhost:3000).
.DESCRIPTION
    Helper script used by dev-with-tunnel.mjs (pnpm dev:tunnel).
    Can also be invoked directly to run the tunnel standalone.
.PARAMETER Port
    Local port to expose. Defaults to 3000 (Vite frontend).
#>
param(
    [int]$Port = 3000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── locate cloudflared ────────────────────────────────────────────────────────
$candidates = @(
    'cloudflared',                                           # on PATH
    'C:\Program Files (x86)\cloudflared\cloudflared.exe',
    'C:\Program Files\cloudflared\cloudflared.exe',
    "$env:LOCALAPPDATA\cloudflared\cloudflared.exe",
    "$env:USERPROFILE\.cloudflared\cloudflared.exe"
)

$bin = $null
foreach ($candidate in $candidates) {
    if ($candidate -eq 'cloudflared') {
        # test PATH
        $resolved = Get-Command cloudflared -ErrorAction SilentlyContinue
        if ($resolved) { $bin = $resolved.Source; break }
    } elseif (Test-Path $candidate) {
        $bin = $candidate; break
    }
}

if (-not $bin) {
    Write-Error @"
cloudflared not found.

Install it:
  winget install --id Cloudflare.cloudflared

Or download from:
  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
"@
    exit 1
}

Write-Host "cloudflared: $bin" -ForegroundColor Cyan
Write-Host "Starting quick tunnel → http://localhost:$Port" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop.`n" -ForegroundColor DarkGray

& $bin tunnel --url "http://localhost:$Port"
