# OneDrive / 日本語パス + Windows SSL 対応デプロイ
# Usage:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\scripts\deploy-functions-from-dev.ps1
#
# ログインできない場合（Transport error）:
#   1. https://supabase.com/dashboard/account/tokens で Access Token 作成
#   2. supabase login --token sbp_xxxxxxxx
#   3. このスクリプトを再実行

$ErrorActionPreference = "Stop"
$ProjectRef = "wdhtbtulxfacvzxcugea"
$Source = Split-Path -Parent $PSScriptRoot
$Target = "C:\dev\tsugi-bato"
$env:DO_NOT_TRACK = "1"
$env:NODE_OPTIONS = "--use-system-ca"

Write-Host "=== Deploy from ASCII path ===" -ForegroundColor Cyan
Write-Host "Source: $Source"
Write-Host "Target: $Target"
Write-Host ""

Write-Host "[1/3] Copy project to $Target ..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "C:\dev" | Out-Null
robocopy $Source $Target /MIR /XD node_modules dist .git /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -gt 7) {
    Write-Host "FAIL: robocopy exit $LASTEXITCODE" -ForegroundColor Red
    exit 1
}
Write-Host "  OK" -ForegroundColor Green

Write-Host "[2/3] Install Deno ..." -ForegroundColor Yellow
& (Join-Path $Target "scripts\install-deno-for-supabase.ps1")
if ($LASTEXITCODE -ne 0) { exit 1 }

Set-Location $Target

Write-Host "[3/3] Deploy Edge Functions ..." -ForegroundColor Yellow
Write-Host "  (login check skipped — use: supabase login --token sbp_xxx if deploy fails)" -ForegroundColor DarkYellow

$functions = @(
    @{ Name = "create-checkout-session"; Extra = @() },
    @{ Name = "create-portal-session"; Extra = @() },
    @{ Name = "get-subscription"; Extra = @() },
    @{ Name = "stripe-webhook"; Extra = @("--no-verify-jwt") }
)

foreach ($fn in $functions) {
    Write-Host "  $($fn.Name) ..."
    & supabase functions deploy $fn.Name --project-ref $ProjectRef @($fn.Extra)
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "FAIL: $($fn.Name)" -ForegroundColor Red
        Write-Host ""
        Write-Host "If you see Transport error or 401:" -ForegroundColor Yellow
        Write-Host "  1. Open https://supabase.com/dashboard/account/tokens"
        Write-Host "  2. Create token, then run:"
        Write-Host "       supabase login --token sbp_PASTE_HERE"
        Write-Host "  3. Run this script again"
        Write-Host ""
        Write-Host "If SSL error persists (Windows):" -ForegroundColor Yellow
        Write-Host "  Win+R -> inetcpl.cpl -> Advanced tab"
        Write-Host "  Uncheck both certificate revocation options -> OK"
        exit 1
    }
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "Open https://tsugi-bato.pages.dev/pro and tap restore."
