# BeatRelay - Supabase setup for Windows
# Run from project root:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\scripts\fix-and-link.ps1
#
# Before: supabase login --token sbp_...

$ErrorActionPreference = "Stop"
$ProjectRef = "wdhtbtulxfacvzxcugea"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$env:DO_NOT_TRACK = "1"

Write-Host ""
Write-Host "=== BeatRelay Supabase setup ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Network test..." -ForegroundColor Yellow
$curlOut = & curl.exe --ssl-no-revoke -sS -o NUL -w "%{http_code}" "https://api.supabase.com/v1/projects" 2>&1
$test = ($curlOut | Select-Object -Last 1).ToString().Trim()
if ($test -eq "401") {
    Write-Host "  OK: Connected (401 = auth required, but network works)" -ForegroundColor Green
} else {
    Write-Host "  FAIL: Cannot reach Supabase (HTTP $test)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Fix Windows certificate check:" -ForegroundColor Magenta
    Write-Host "  1. Press Win+R"
    Write-Host "  2. Type: inetcpl.cpl"
    Write-Host "  3. Tab: Advanced"
    Write-Host "  4. Under Security, UNCHECK both revocation options"
    Write-Host "  5. OK, close Cursor, reopen, run this script again"
    Write-Host ""
    exit 1
}

Write-Host "[2/4] Link project (optional)..." -ForegroundColor Yellow
Write-Host "  SKIP: deploy works with --project-ref without link" -ForegroundColor DarkYellow
Write-Host "  Use setup-billing-secrets.ps1 for Stripe keys" -ForegroundColor DarkYellow

Write-Host "[3/4] Stripe secrets..." -ForegroundColor Yellow
$stripeKey = Read-Host "Stripe secret key (sk_test_...)"
$priceId = Read-Host "Stripe Price ID (price_...)"
if ($stripeKey -and $priceId) {
    & supabase secrets set "STRIPE_SECRET_KEY=$stripeKey" "STRIPE_PRICE_ID=$priceId" --project-ref $ProjectRef
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FAIL: secrets set" -ForegroundColor Red
        exit 1
    }
    Write-Host "  OK: Secrets saved" -ForegroundColor Green
} else {
    Write-Host "  SKIP: Run secrets set manually later" -ForegroundColor DarkYellow
}

Write-Host "[4/4] Deploy Edge Functions..." -ForegroundColor Yellow
$functions = @(
    "create-checkout-session",
    "create-portal-session",
    "get-subscription",
    "stripe-webhook"
)
foreach ($fn in $functions) {
    Write-Host "  Deploy $fn ..."
    if ($fn -eq "stripe-webhook") {
        & supabase functions deploy $fn --project-ref $ProjectRef --no-verify-jwt
    } else {
        & supabase functions deploy $fn --project-ref $ProjectRef
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FAIL: deploy $fn" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "  1. Stripe Webhook URL:"
Write-Host "     https://$ProjectRef.supabase.co/functions/v1/stripe-webhook"
Write-Host "  2. supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx --project-ref $ProjectRef"
Write-Host "  3. Set VITE_BILLING_ENABLED=true in .env, restart npm run dev, open /pro"
Write-Host ""
