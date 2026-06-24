# Deploy billing Edge Functions (Windows 対応)
# Usage:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\scripts\install-deno-for-supabase.ps1
#   .\scripts\deploy-functions.ps1
#
# uv_spawn エラー時: OneDrive 外 (例 C:\dev\tsugi-bato) にコピーして再実行

$ErrorActionPreference = "Stop"
$ProjectRef = "wdhtbtulxfacvzxcugea"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$env:DO_NOT_TRACK = "1"

$DenoBin = Join-Path $env:USERPROFILE ".supabase\deno"
if (-not (Test-Path $DenoBin)) {
    Write-Host "Deno not found. Running install-deno-for-supabase.ps1 ..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "install-deno-for-supabase.ps1")
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

$functions = @(
    @{ Name = "create-checkout-session"; Extra = @() },
    @{ Name = "create-portal-session"; Extra = @() },
    @{ Name = "get-subscription"; Extra = @() },
    @{ Name = "stripe-webhook"; Extra = @("--no-verify-jwt") }
)

Write-Host "Deploying Edge Functions to $ProjectRef ..." -ForegroundColor Cyan
Write-Host "If uv_spawn persists, copy project to C:\dev\tsugi-bato and run again." -ForegroundColor DarkYellow

foreach ($fn in $functions) {
    Write-Host "  $($fn.Name) ..."
    & supabase functions deploy $fn.Name --project-ref $ProjectRef @($fn.Extra)
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "FAIL: $($fn.Name)" -ForegroundColor Red
        Write-Host "Try:" -ForegroundColor Yellow
        Write-Host "  1. supabase login"
        Write-Host "  2. .\scripts\install-deno-for-supabase.ps1"
        Write-Host "  3. Copy repo to C:\dev\tsugi-bato and deploy from there"
        Write-Host "  4. supabase functions deploy $($fn.Name) --project-ref $ProjectRef --debug"
        exit 1
    }
}

Write-Host "All functions deployed." -ForegroundColor Green
