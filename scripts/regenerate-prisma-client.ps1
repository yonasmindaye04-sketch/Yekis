#!/usr/bin/env pwsh
# Regenerates the Prisma client without replacing the query engine DLL.
#
# WHY THIS EXISTS
# `prisma generate` writes the Windows query engine to a temp file and then
# renames it over the existing one. On this machine that rename fails with
# EPERM because the destination file has a deny-delete disposition — the file
# can be renamed but not deleted, and Windows will not let a rename replace a
# file it cannot delete. Every `prisma generate` therefore fails after
# writing a stray `.tmpNNNNN` file.
#
# The engine binary is unchanged by a schema edit, so the fix is to generate
# into a clean directory and copy everything EXCEPT the engine across. The
# generated TypeScript types — the only thing a schema change actually alters
# — are replaced.
#
# Usage: pwsh scripts/regenerate-prisma-client.ps1

$ErrorActionPreference = "Stop"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..")
$backend = Join-Path $repo "apps\backend"
$schema = Join-Path $backend "prisma\schema.prisma"
$tmpOut = Join-Path $backend "prisma\.prisma-generate-tmp"

$clientDir = Get-ChildItem (Join-Path $repo "node_modules\.pnpm") -Directory -Filter "@prisma+client@*" |
  Select-Object -First 1 |
  ForEach-Object { Join-Path $_.FullName "node_modules\.prisma\client" }

if (-not (Test-Path $clientDir)) {
  throw "Could not locate the generated Prisma client directory."
}

# Point the generator at a scratch directory.
$original = Get-Content $schema -Raw
$patched = $original -replace '(?m)^(\s*)provider\s*=\s*"prisma-client-js"\s*$', "`$1provider = `"prisma-client-js`"`r`n`$1output   = `"./.prisma-generate-tmp`""
if ($patched -eq $original) { throw "Could not patch the generator block." }
Set-Content -Path $schema -Value $patched -NoNewline

try {
  Push-Location $backend
  pnpm exec prisma generate | Out-Host
  Pop-Location
} finally {
  Pop-Location -ErrorAction SilentlyContinue
  Set-Content -Path $schema -Value $original -NoNewline
}

$src = Join-Path $backend "prisma\.prisma-generate-tmp"
Get-ChildItem $src -File | Where-Object { $_.Name -ne "query_engine-windows.dll.node" } | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $clientDir $_.Name) -Force
}
Get-ChildItem $src -Directory | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $clientDir $_.Name) -Recurse -Force
}
Remove-Item $src -Recurse -Force

Write-Host "Prisma client regenerated (query engine left untouched)."
