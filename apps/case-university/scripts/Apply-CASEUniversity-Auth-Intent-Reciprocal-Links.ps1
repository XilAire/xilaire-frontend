#requires -Version 5.1
<#
.SYNOPSIS
  CASE University auth-intent reciprocal-link hardening.

.DESCRIPTION
  Windows PowerShell 5.1 compatible.

  Run from:
    C:\Development\xilaire-frontend-old\apps\case-university

  This phase:
    - Preserves paid-plan intent when moving Sign In -> Register.
    - Preserves paid-plan intent when moving Register -> Sign In.
    - Does not alter Stripe routes, webhook handling, registration provisioning,
      or Supabase schema.
    - Creates backups before changes.

  The callback redirect hardening is intentionally NOT changed in this pass.
  We will validate these source changes first, then harden callback redirects
  as a separate small phase.
#>

$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path -LiteralPath (Join-Path $Root "app"))) {
    throw "Run this script from C:\Development\xilaire-frontend-old\apps\case-university"
}

$SignInPage  = Join-Path $Root "app\auth\signin\page.tsx"
$SignInForm  = Join-Path $Root "components\auth\SignInForm.tsx"
$RegisterPage = Join-Path $Root "app\auth\register\page.tsx"
$RegisterForm = Join-Path $Root "components\auth\RegisterForm.tsx"

$Required = @(
    $SignInPage,
    $SignInForm,
    $RegisterPage,
    $RegisterForm
)

foreach ($Path in $Required) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Required file not found: $Path"
    }
}

function Read-Text {
    param([Parameter(Mandatory=$true)][string]$Path)
    return [System.IO.File]::ReadAllText($Path)
}

function Write-Text {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Text
    )
    [System.IO.File]::WriteAllText($Path, $Text, $Utf8NoBom)
}

function Backup-Once {
    param([Parameter(Mandatory=$true)][string]$Path)

    $Backup = "$Path.auth-intent-backup"

    if (-not (Test-Path -LiteralPath $Backup)) {
        Copy-Item -LiteralPath $Path -Destination $Backup -Force
        Write-Host "Backup: $Backup" -ForegroundColor DarkGray
    }
}

foreach ($Path in $Required) {
    Backup-Once -Path $Path
}

# ============================================================
# 1. SIGN IN PAGE
#    Derive registrationHref from the already-safe redirectTo.
# ============================================================

$Text = Read-Text -Path $SignInPage

if (-not $Text.Contains("registrationHref")) {
    $Marker = @'
  const redirectTo = isSafeRedirect(
    requestedRedirect,
  )
    ? requestedRedirect
    : "/dashboard";

  return (
'@

    if (-not $Text.Contains($Marker)) {
        throw "Sign In page marker not found. No Sign In page changes were written."
    }

    $Replacement = @'
  const redirectTo = isSafeRedirect(
    requestedRedirect,
  )
    ? requestedRedirect
    : "/dashboard";

  const checkoutPlan = getCheckoutPlanFromRedirect(
    redirectTo,
  );

  const registrationHref = checkoutPlan
    ? `/auth/register?plan=${encodeURIComponent(
        checkoutPlan,
      )}&source=case_university`
    : "/auth/register";

  return (
'@

    $Text = $Text.Replace($Marker, $Replacement)

    $HelperMarker = @'
function isSafeRedirect(
  value: string | null,
): value is string {
'@

    if (-not $Text.Contains($HelperMarker)) {
        throw "Sign In page helper marker not found. No Sign In page changes were written."
    }

    $Helper = @'
function getCheckoutPlanFromRedirect(
  value: string,
): string | null {
  if (!value.startsWith("/pricing")) {
    return null;
  }

  try {
    const url = new URL(
      value,
      "https://case-university.local",
    );

    const plan = url.searchParams.get(
      "checkout_plan",
    );

    return plan &&
      [
        "university_plus_monthly",
        "university_plus_annual",
        "university_pro_monthly",
        "university_pro_annual",
      ].includes(plan)
      ? plan
      : null;
  } catch {
    return null;
  }
}

'@

    $Text = $Text.Replace(
        $HelperMarker,
        $Helper + $HelperMarker
    )

    $OldFormCall = @'
                <SignInForm
                  redirectTo={redirectTo}
                  status={status}
                  passwordStatus={passwordStatus}
                  authErrorCode={authError}
                />
'@

    $NewFormCall = @'
                <SignInForm
                  redirectTo={redirectTo}
                  registrationHref={registrationHref}
                  status={status}
                  passwordStatus={passwordStatus}
                  authErrorCode={authError}
                />
'@

    if (-not $Text.Contains($OldFormCall)) {
        throw "Sign In form call marker not found. No Sign In page changes were written."
    }

    $Text = $Text.Replace($OldFormCall, $NewFormCall)
    Write-Text -Path $SignInPage -Text $Text
    Write-Host "Updated: Sign In page plan-preserving Register href" -ForegroundColor Green
}
else {
    Write-Host "Already applied: Sign In page plan-preserving Register href" -ForegroundColor DarkYellow
}

# ============================================================
# 2. SIGN IN FORM
#    Add registrationHref prop and use it for Create account.
# ============================================================

$Text = Read-Text -Path $SignInForm

if (-not $Text.Contains("registrationHref: string")) {
    $PropsIndex = $Text.IndexOf("type SignInFormProps = {")
    if ($PropsIndex -lt 0) {
        throw "SignInFormProps was not found."
    }

    $PropsEnd = $Text.IndexOf("};", $PropsIndex)
    if ($PropsEnd -lt 0) {
        throw "SignInFormProps closing marker was not found."
    }

    $InsertionPoint = $PropsEnd
    $Text = $Text.Insert(
        $InsertionPoint,
        "  registrationHref: string;`r`n"
    )
}

if (-not $Text.Contains("registrationHref,")) {
    $FunctionMarker = "export default function SignInForm({"
    $FunctionIndex = $Text.IndexOf($FunctionMarker)

    if ($FunctionIndex -lt 0) {
        throw "SignInForm function marker was not found."
    }

    $CloseBrace = $Text.IndexOf("}: SignInFormProps)", $FunctionIndex)
    if ($CloseBrace -lt 0) {
        throw "SignInForm destructuring close marker was not found."
    }

    $RedirectProp = "  redirectTo,"
    $RedirectIndex = $Text.IndexOf($RedirectProp, $FunctionIndex)

    if ($RedirectIndex -lt 0 -or $RedirectIndex -gt $CloseBrace) {
        throw "SignInForm redirectTo destructuring marker was not found."
    }

    $AfterRedirect = $RedirectIndex + $RedirectProp.Length
    $Text = $Text.Insert(
        $AfterRedirect,
        "`r`n  registrationHref,"
    )
}

if ($Text.Contains('href="/auth/register"')) {
    $Text = $Text.Replace(
        'href="/auth/register"',
        'href={registrationHref}'
    )
}
elseif (-not $Text.Contains("href={registrationHref}")) {
    # If the Create account block still does not exist, add it before </form>.
    $FormClose = $Text.LastIndexOf("</form>")

    if ($FormClose -lt 0) {
        throw "SignInForm closing </form> marker was not found."
    }

    $Block = @'
      <div className="border-t border-[var(--border-subtle)] pt-5 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          New to CASE University?{" "}
          <Link
            href={registrationHref}
            className="font-bold text-[var(--primary)] transition hover:text-[var(--primary-hover)]"
          >
            Create account
          </Link>
        </p>
      </div>

'@

    $Text = $Text.Insert($FormClose, $Block)
}

Write-Text -Path $SignInForm -Text $Text
Write-Host "Updated: Sign In form Register intent preservation" -ForegroundColor Green

# ============================================================
# 3. REGISTER PAGE
#    Derive Sign In href from selected plan and pass it to form.
# ============================================================

$Text = Read-Text -Path $RegisterPage

if (-not $Text.Contains("signInHref")) {
    $Marker = @'
  const sourceProduct = normalizeSourceProduct(
    firstValue(resolved.source),
  );

  const supabase = await createSupabaseServerClient();
'@

    if (-not $Text.Contains($Marker)) {
        throw "Register page sourceProduct marker was not found."
    }

    $Replacement = @'
  const sourceProduct = normalizeSourceProduct(
    firstValue(resolved.source),
  );

  const signInRedirect = planKey
    ? `/pricing?checkout_plan=${encodeURIComponent(
        planKey,
      )}`
    : "/dashboard";

  const signInHref = `/auth/signin?redirect=${encodeURIComponent(
    signInRedirect,
  )}`;

  const supabase = await createSupabaseServerClient();
'@

    $Text = $Text.Replace($Marker, $Replacement)

    $OldCall = @'
                <RegisterForm
                  planKey={planKey}
                  sourceProduct={sourceProduct}
                />
'@

    $NewCall = @'
                <RegisterForm
                  planKey={planKey}
                  sourceProduct={sourceProduct}
                  signInHref={signInHref}
                />
'@

    if (-not $Text.Contains($OldCall)) {
        throw "RegisterForm call marker was not found."
    }

    $Text = $Text.Replace($OldCall, $NewCall)
    Write-Text -Path $RegisterPage -Text $Text
    Write-Host "Updated: Register page plan-preserving Sign In href" -ForegroundColor Green
}
else {
    Write-Host "Already applied: Register page plan-preserving Sign In href" -ForegroundColor DarkYellow
}

# ============================================================
# 4. REGISTER FORM
#    Add signInHref prop and replace static Sign In href.
# ============================================================

$Text = Read-Text -Path $RegisterForm

if (-not $Text.Contains("signInHref")) {
    $PropsIndex = $Text.IndexOf("type RegisterFormProps = {")
    if ($PropsIndex -lt 0) {
        throw "RegisterFormProps was not found."
    }

    $PropsEnd = $Text.IndexOf("};", $PropsIndex)
    if ($PropsEnd -lt 0) {
        throw "RegisterFormProps closing marker was not found."
    }

    $Text = $Text.Insert(
        $PropsEnd,
        "  signInHref: string;`r`n"
    )

    $FunctionMarker = "export default function RegisterForm({"
    $FunctionIndex = $Text.IndexOf($FunctionMarker)

    if ($FunctionIndex -lt 0) {
        throw "RegisterForm function marker was not found."
    }

    $CloseBrace = $Text.IndexOf("}: RegisterFormProps)", $FunctionIndex)
    if ($CloseBrace -lt 0) {
        throw "RegisterForm destructuring close marker was not found."
    }

    $SourceProp = "  sourceProduct,"
    $SourceIndex = $Text.IndexOf($SourceProp, $FunctionIndex)

    if ($SourceIndex -lt 0 -or $SourceIndex -gt $CloseBrace) {
        throw "RegisterForm sourceProduct destructuring marker was not found."
    }

    $AfterSource = $SourceIndex + $SourceProp.Length
    $Text = $Text.Insert(
        $AfterSource,
        "`r`n  signInHref,"
    )
}

if ($Text.Contains('href="/auth/signin"')) {
    $Text = $Text.Replace(
        'href="/auth/signin"',
        'href={signInHref}'
    )
}
elseif (-not $Text.Contains("href={signInHref}")) {
    Write-Host "Notice: RegisterForm does not contain a static /auth/signin link." -ForegroundColor DarkYellow
    Write-Host "No visual Sign In link was rewritten in RegisterForm." -ForegroundColor DarkYellow
}

Write-Text -Path $RegisterForm -Text $Text
Write-Host "Updated: Register form Sign In intent preservation" -ForegroundColor Green

Write-Host ""
Write-Host "CASE University reciprocal auth-intent phase completed." -ForegroundColor Cyan
Write-Host ""
Write-Host "Run validation:" -ForegroundColor Yellow
Write-Host "  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue"
Write-Host "  npx tsc --noEmit"
