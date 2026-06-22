# Deploy all billing Edge Functions (no supabase link required)
# Usage:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\scripts\deploy-functions.ps1

$ErrorActionPreference = "Stop"
$ProjectRef = "wdhtbtulxfacvzxcugea"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$env:DO_NOT_TRACK = "1"

$functions = @(
    @{ Name = "create-checkout-session"; Extra = @() },
    @{ Name = "create-portal-session"; Extra = @() },
    @{ Name = "get-subscription"; Extra = @() },
    @{ Name = "stripe-webhook"; Extra = @("--no-verify-jwt") }
)

Write-Host "Deploying Edge Functions to $ProjectRef ..." -ForegroundColor Cyan
foreach ($fn in $functions) {
    Write-Host "  $($fn.Name) ..."
    & supabase functions deploy $fn.Name --project-ref $ProjectRef @($fn.Extra)
    if ($LASTEXITCODE -ne 0) { exit 1 }
}
Write-Host "All functions deployed." -ForegroundColor Green
