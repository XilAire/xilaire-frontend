#requires -Version 5.1
<#
.SYNOPSIS
  CASE University paid-plan intent continuation phase.

.DESCRIPTION
  Windows PowerShell 5.1 compatible.

  Run from:
    C:\Development\xilaire-frontend-old\apps\case-university

  Updates:
    - app/pricing/page.tsx
      * accepts checkout_plan
      * validates checkout_plan through registration-intent.ts
      * passes requestedPlanKey to PricingClient

    - components/pricing/PricingClient.tsx
      * accepts requestedPlanKey
      * automatically resumes the selected Plus/Pro checkout once
        an authenticated Free user returns to /pricing
      * preserves paid-member management routing
      * preserves embedded Stripe Checkout
      * prevents duplicate auto-starts during rerenders

  Safety:
    - Creates .plan-intent-backup files before modifying.
    - Fails if expected markers are not found.
    - Does not modify Stripe API routes, webhook logic, Supabase schema,
      registration actions, or billing-management functions.
#>

$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path -LiteralPath (Join-Path $Root "app"))) {
    throw "Run this script from C:\Development\xilaire-frontend-old\apps\case-university"
}

function Read-TextFile {
    param([Parameter(Mandatory=$true)][string]$Path)
    return [System.IO.File]::ReadAllText($Path)
}

function Write-TextFile {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Text
    )

    [System.IO.File]::WriteAllText(
        $Path,
        $Text,
        $Utf8NoBom
    )
}

function Backup-Once {
    param([Parameter(Mandatory=$true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Required file not found: $Path"
    }

    $BackupPath = "$Path.plan-intent-backup"

    if (-not (Test-Path -LiteralPath $BackupPath)) {
        Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
        Write-Host "Backup: $BackupPath" -ForegroundColor DarkGray
    }
}

function Replace-Exact {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Old,
        [Parameter(Mandatory=$true)][string]$New,
        [Parameter(Mandatory=$true)][string]$Description
    )

    $Text = Read-TextFile -Path $Path

    if ($Text.Contains($New)) {
        Write-Host "Already applied: $Description" -ForegroundColor DarkYellow
        return
    }

    if (-not $Text.Contains($Old)) {
        throw "Unable to apply '$Description'. Expected marker was not found in: $Path"
    }

    $Updated = $Text.Replace($Old, $New)
    Write-TextFile -Path $Path -Text $Updated

    Write-Host "Updated: $Description" -ForegroundColor Green
}

$PricingPage   = Join-Path $Root "app\pricing\page.tsx"
$PricingClient = Join-Path $Root "components\pricing\PricingClient.tsx"

Backup-Once -Path $PricingPage
Backup-Once -Path $PricingClient

# ============================================================
# 1. PRICING PAGE - IMPORT PLAN NORMALIZER
# ============================================================

$Old = @'
import PricingClient from "@/components/pricing/PricingClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
'@

$New = @'
import PricingClient from "@/components/pricing/PricingClient";
import { normalizePaidPlanKey } from "@/lib/auth/registration-intent";
import { createSupabaseServerClient } from "@/lib/supabase/server";
'@

Replace-Exact `
    -Path $PricingPage `
    -Old $Old `
    -New $New `
    -Description "Pricing page paid-plan normalizer import"

# ============================================================
# 2. PRICING PAGE - ACCEPT checkout_plan
# ============================================================

$Old = @'
  searchParams: Promise<{
    checkout?: string | string[];
    session_id?: string | string[];
  }>;
'@

$New = @'
  searchParams: Promise<{
    checkout?: string | string[];
    session_id?: string | string[];
    checkout_plan?: string | string[];
  }>;
'@

Replace-Exact `
    -Path $PricingPage `
    -Old $Old `
    -New $New `
    -Description "Pricing page checkout_plan search parameter"

# ============================================================
# 3. PRICING PAGE - NORMALIZE SELECTED PLAN
# ============================================================

$Old = @'
  const checkoutSessionId =
    single(params.checkout) === "return"
      ? single(params.session_id)
      : null;

  return (
'@

$New = @'
  const checkoutSessionId =
    single(params.checkout) === "return"
      ? single(params.session_id)
      : null;

  const requestedPlanKey = normalizePaidPlanKey(
    single(params.checkout_plan),
  );

  return (
'@

Replace-Exact `
    -Path $PricingPage `
    -Old $Old `
    -New $New `
    -Description "Pricing page selected-plan normalization"

# ============================================================
# 4. PRICING PAGE - PASS requestedPlanKey
# ============================================================

$Old = @'
              initialBillingState={billingState}
              checkoutSessionId={checkoutSessionId}
            />
'@

$New = @'
              initialBillingState={billingState}
              checkoutSessionId={checkoutSessionId}
              requestedPlanKey={requestedPlanKey}
            />
'@

Replace-Exact `
    -Path $PricingPage `
    -Old $Old `
    -New $New `
    -Description "Pricing page requestedPlanKey prop"

# ============================================================
# 5. PRICING CLIENT - ADD useRef IMPORT
# ============================================================

$PricingText = Read-TextFile -Path $PricingClient

if (-not $PricingText.Contains("useRef")) {
    if ($PricingText.Contains('import { useEffect, useMemo, useState } from "react";')) {
        $PricingText = $PricingText.Replace(
            'import { useEffect, useMemo, useState } from "react";',
            'import { useEffect, useMemo, useRef, useState } from "react";'
        )
    }
    elseif ($PricingText.Contains("  useEffect,`r`n  useMemo,`r`n  useState,")) {
        $PricingText = $PricingText.Replace(
            "  useEffect,`r`n  useMemo,`r`n  useState,",
            "  useEffect,`r`n  useMemo,`r`n  useRef,`r`n  useState,"
        )
    }
    elseif ($PricingText.Contains("  useEffect,`n  useMemo,`n  useState,")) {
        $PricingText = $PricingText.Replace(
            "  useEffect,`n  useMemo,`n  useState,",
            "  useEffect,`n  useMemo,`n  useRef,`n  useState,"
        )
    }
    else {
        throw "PricingClient repair stopped: unable to locate React hook import for useRef."
    }

    Write-TextFile -Path $PricingClient -Text $PricingText
    Write-Host "Updated: PricingClient useRef import" -ForegroundColor Green
}
else {
    Write-Host "Already applied: PricingClient useRef import" -ForegroundColor DarkYellow
}

# ============================================================
# 6. PRICING CLIENT - ADD PROP
# ============================================================

$Old = @'
type PricingClientProps = {
  isAuthenticated: boolean;
  publishableKey: string;
  initialBillingState: UniversityBillingState | null;
  checkoutSessionId: string | null;
};
'@

$New = @'
type PricingClientProps = {
  isAuthenticated: boolean;
  publishableKey: string;
  initialBillingState: UniversityBillingState | null;
  checkoutSessionId: string | null;
  requestedPlanKey?: UniversityPlanKey | null;
};
'@

Replace-Exact `
    -Path $PricingClient `
    -Old $Old `
    -New $New `
    -Description "PricingClient requestedPlanKey prop type"

# ============================================================
# 7. PRICING CLIENT - DESTRUCTURE PROP
# ============================================================

$Old = @'
export default function PricingClient({
  isAuthenticated,
  publishableKey,
  initialBillingState,
  checkoutSessionId,
}: PricingClientProps) {
'@

$New = @'
export default function PricingClient({
  isAuthenticated,
  publishableKey,
  initialBillingState,
  checkoutSessionId,
  requestedPlanKey = null,
}: PricingClientProps) {
'@

Replace-Exact `
    -Path $PricingClient `
    -Old $Old `
    -New $New `
    -Description "PricingClient requestedPlanKey destructuring"

# ============================================================
# 8. PRICING CLIENT - AUTO-START REF
# ============================================================

$Old = @'
  const router = useRouter();
  const [cadence, setCadence] = useState<BillingCadence>("monthly");
'@

$New = @'
  const router = useRouter();
  const autoCheckoutStartedRef = useRef(false);
  const [cadence, setCadence] = useState<BillingCadence>("monthly");
'@

Replace-Exact `
    -Path $PricingClient `
    -Old $Old `
    -New $New `
    -Description "PricingClient auto-checkout guard"

# ============================================================
# 9. PRICING CLIENT - RESUME SELECTED PLAN
# ============================================================

$PricingText = Read-TextFile -Path $PricingClient

if ($PricingText.Contains("AUTO-RESUME SELECTED PLAN")) {
    Write-Host "Already applied: PricingClient selected-plan auto-resume" -ForegroundColor DarkYellow
}
else {
    $StartCheckoutIndex = $PricingText.IndexOf("  async function startCheckout(tier: PaidTier) {")

    if ($StartCheckoutIndex -lt 0) {
        throw "PricingClient repair stopped: startCheckout() was not found."
    }

    $NextFunctionIndex = $PricingText.IndexOf(
        "  async function ",
        $StartCheckoutIndex + 10
    )

    if ($NextFunctionIndex -lt 0) {
        throw "PricingClient repair stopped: unable to locate the end of startCheckout()."
    }

    $AutoResume = @'

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

    $PricingText = $PricingText.Insert($NextFunctionIndex, $AutoResume)
    Write-TextFile -Path $PricingClient -Text $PricingText

    Write-Host "Updated: PricingClient selected-plan auto-resume" -ForegroundColor Green
}

# ============================================================
# 10. PRICING CLIENT - HANDLE ACTIVE PAID RETURN SAFELY
# ============================================================

$PricingText = Read-TextFile -Path $PricingClient

$OldPaid = @'
    if (billingState?.has_paid_subscription) {
      window.location.assign(
        `/settings/billing?plan=${encodeURIComponent(planKey)}`,
      );
      return;
    }
'@

if ($PricingText.Contains($OldPaid)) {
    Write-Host "Verified: active paid member routes to billing management" -ForegroundColor Green
}
else {
    Write-Host "Notice: paid-member routing marker differs from expected current source." -ForegroundColor DarkYellow
    Write-Host "The script did not rewrite billing-management behavior." -ForegroundColor DarkYellow
}

# ============================================================
# COMPLETE
# ============================================================

Write-Host ""
Write-Host "CASE University paid-plan intent continuation applied." -ForegroundColor Cyan
Write-Host ""
Write-Host "Next validation commands:" -ForegroundColor Yellow
Write-Host "  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue"
Write-Host "  npx tsc --noEmit"
Write-Host ""
Write-Host "After TypeScript passes:" -ForegroundColor Yellow
Write-Host "  npm run build"
Write-Host ""
Write-Host "Then test:" -ForegroundColor Yellow
Write-Host "  Logged out /pricing -> choose Plus/Pro -> Register"
Write-Host "  Confirm/authenticate -> /pricing?checkout_plan=..."
Write-Host "  Authenticated Free user -> embedded Stripe checkout opens automatically"
Write-Host "  Existing paid user -> billing management, never second checkout"
