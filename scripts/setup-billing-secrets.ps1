# Register Stripe secrets on Supabase
# If CLI fails (Windows policy block), use Supabase Dashboard instead (see end of script).

param(
    [string]$StripeKey = "",
    [string]$PriceId = "price_1TkPH6LoopbbglYx9arODiFE",
    [string]$WebhookSecret = ""
)

$ErrorActionPreference = "Stop"
$ProjectRef = "wdhtbtulxfacvzxcugea"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$env:DO_NOT_TRACK = "1"

function Show-DashboardInstructions {
    Write-Host ""
    Write-Host "=== CLI failed: use Supabase Dashboard ===" -ForegroundColor Magenta
    Write-Host "1. Open: https://supabase.com/dashboard/project/$ProjectRef/settings/functions"
    Write-Host "2. Edge Functions > Secrets (or Environment variables)"
    Write-Host "3. Add these secrets:"
    Write-Host "   STRIPE_SECRET_KEY = sk_test_...   (NOT sb_secret_)"
    Write-Host "   STRIPE_PRICE_ID   = $PriceId"
    if ($WebhookSecret) {
        Write-Host "   STRIPE_WEBHOOK_SECRET = (your whsec_...)"
    }
    Write-Host "4. Save, wait ~1 min, retry /pro"
    Write-Host ""
    Write-Host "Stripe key location: Stripe Dashboard > Developers > API keys > Secret key"
    Write-Host ""
}

Write-Host ""
Write-Host "=== BeatRelay billing secrets ===" -ForegroundColor Cyan
Write-Host ""

if (-not $StripeKey) {
    $StripeKey = Read-Host "Stripe secret key (sk_test_...)"
}

if ($StripeKey -like "sb_secret_*") {
    Write-Host "WRONG KEY FORMAT: sb_secret_ is not valid." -ForegroundColor Red
    Write-Host "Use sk_test_... from Stripe > Developers > API keys > Secret key" -ForegroundColor Yellow
    Show-DashboardInstructions
    exit 1
}

if (-not $StripeKey.StartsWith("sk_")) {
    Write-Host "WARN: key should start with sk_test_ or sk_live_" -ForegroundColor Yellow
}

$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    Write-Host "supabase CLI not found." -ForegroundColor Red
    Show-DashboardInstructions
    exit 1
}

Write-Host "Setting STRIPE_SECRET_KEY and STRIPE_PRICE_ID..." -ForegroundColor Yellow
try {
    & supabase secrets set "STRIPE_SECRET_KEY=$StripeKey" "STRIPE_PRICE_ID=$PriceId" --project-ref $ProjectRef
    if ($LASTEXITCODE -ne 0) { throw "secrets set failed" }
    Write-Host "OK: Stripe secrets saved" -ForegroundColor Green
} catch {
    Write-Host "CLI error: $_" -ForegroundColor Red
    Show-DashboardInstructions
    exit 1
}

if (-not $WebhookSecret) {
    $WebhookSecret = Read-Host "Stripe webhook secret (whsec_..., Enter to skip)"
}
if ($WebhookSecret) {
    try {
        & supabase secrets set "STRIPE_WEBHOOK_SECRET=$WebhookSecret" --project-ref $ProjectRef
        if ($LASTEXITCODE -ne 0) { throw "webhook secret failed" }
        Write-Host "OK: Webhook secret saved" -ForegroundColor Green
    } catch {
        Write-Host "Webhook secret CLI failed. Add STRIPE_WEBHOOK_SECRET in Dashboard." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Done. Restart npm run dev and open /pro" -ForegroundColor Green
Write-Host ""
