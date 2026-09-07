#requires -Version 5.1
$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Path = Join-Path $Root "components\pricing\PricingClient.tsx"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path -LiteralPath (Join-Path $Root "app"))) {
    throw "Run this script from C:\Development\xilaire-frontend-old\apps\case-university"
}
if (-not (Test-Path -LiteralPath $Path)) {
    throw "Required file not found: $Path"
}

$Text = [System.IO.File]::ReadAllText($Path)

# The previous phase already added requestedPlanKey and useRef.
if (-not $Text.Contains("requestedPlanKey")) {
    throw "PricingClient is not in the expected partially-applied state: requestedPlanKey is missing."
}
if (-not $Text.Contains("useRef")) {
    throw "PricingClient is not in the expected partially-applied state: useRef import is missing."
}

# Add the ref immediately after useRouter(), regardless of the current cadence initializer.
if (-not $Text.Contains("autoCheckoutStartedRef")) {
    $Marker = "  const router = useRouter();"
    if (-not $Text.Contains($Marker)) {
        throw "Unable to find useRouter marker in PricingClient."
    }
    $Replacement = @'
  const router = useRouter();
  const autoCheckoutStartedRef = useRef(false);
'@
    $Text = $Text.Replace($Marker, $Replacement)
    Write-Host "Updated: auto-checkout guard" -ForegroundColor Green
}
else {
    Write-Host "Already applied: auto-checkout guard" -ForegroundColor DarkYellow
}

# Insert the effect immediately before the next async function after startCheckout.
if (-not $Text.Contains("AUTO-RESUME SELECTED PLAN")) {
    $Start = $Text.IndexOf("  async function startCheckout(")
    if ($Start -lt 0) {
        throw "Unable to find startCheckout() in PricingClient."
    }

    $Next = $Text.IndexOf("  async function ", $Start + 10)
    if ($Next -lt 0) {
        throw "Unable to find the function following startCheckout()."
    }

    $Effect = @'
  // AUTO-RESUME SELECTED PLAN
  useEffect(() => {
    if (!requestedPlanKey) return;
    if (!isAuthenticated) return;
    if (billingState?.has_paid_subscription) return;
    if (clientSecret) return;
    if (autoCheckoutStartedRef.current) return;

    const requestedCadence: BillingCadence =
      requestedPlanKey.endsWith("_annual") ? "annual" : "monthly";

    const requestedTier: PaidTier =
      requestedPlanKey.includes("_pro_") ? "pro" : "plus";

    if (cadence !== requestedCadence) {
      setCadence(requestedCadence);
      return;
    }

    autoCheckoutStartedRef.current = true;
    void startCheckout(requestedTier);
  }, [
    billingState?.has_paid_subscription,
    cadence,
    clientSecret,
    isAuthenticated,
    requestedPlanKey,
  ]);

'@
    $Text = $Text.Insert($Next, $Effect)
    Write-Host "Updated: selected-plan auto-resume" -ForegroundColor Green
}
else {
    Write-Host "Already applied: selected-plan auto-resume" -ForegroundColor DarkYellow
}

[System.IO.File]::WriteAllText($Path, $Text, $Utf8NoBom)

Write-Host ""
Write-Host "Paid-plan intent continuation repair completed." -ForegroundColor Cyan
Write-Host "Run:" -ForegroundColor Yellow
Write-Host "  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue"
Write-Host "  npx tsc --noEmit"
