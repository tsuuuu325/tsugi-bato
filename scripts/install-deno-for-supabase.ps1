# Supabase Edge Functions デプロイ用 Deno を ~/.supabase/deno に配置
# Usage:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\scripts\install-deno-for-supabase.ps1

$ErrorActionPreference = "Stop"
$DenoDir = Join-Path $env:USERPROFILE ".supabase"
$DenoExe = Join-Path $DenoDir "deno.exe"
$DenoBin = Join-Path $DenoDir "deno"
$Version = "v2.8.3"

New-Item -ItemType Directory -Force -Path $DenoDir | Out-Null

if ((Test-Path $DenoBin) -and (Test-Path $DenoExe)) {
    Write-Host "OK: Deno already installed at $DenoExe" -ForegroundColor Green
    & $DenoExe --version
    exit 0
}

Write-Host "Downloading Deno $Version ..." -ForegroundColor Cyan
$zip = Join-Path $env:TEMP "deno-$Version.zip"
$url = "https://github.com/denoland/deno/releases/download/$Version/deno-x86_64-pc-windows-msvc.zip"
& curl.exe --ssl-no-revoke -L -o $zip $url
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: could not download Deno" -ForegroundColor Red
    exit 1
}

Expand-Archive -Path $zip -DestinationPath $DenoDir -Force
if (-not (Test-Path $DenoExe)) {
    Write-Host "FAIL: deno.exe not found after extract" -ForegroundColor Red
    exit 1
}

Copy-Item $DenoExe $DenoBin -Force
Write-Host "OK: installed" -ForegroundColor Green
& $DenoExe --version
