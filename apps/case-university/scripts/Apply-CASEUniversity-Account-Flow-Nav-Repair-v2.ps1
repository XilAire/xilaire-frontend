#requires -Version 5.1
<#
.SYNOPSIS
  Repairs CASE University account-flow navigation after the earlier partial migration.

.DESCRIPTION
  Windows PowerShell 5.1 compatible.

  Run from:
    C:\Development\xilaire-frontend-old\apps\case-university

  This script:
    - fixes the public MarketingHeader with Create account
    - fixes MobileNav with Billing
    - adds Plans & Billing to Sidebar
    - creates backups before changes
    - does NOT modify pricing, Stripe, Supabase, or database code
#>

$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path -LiteralPath (Join-Path $Root "app"))) {
    throw "Run this script from C:\Development\xilaire-frontend-old\apps\case-university"
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

    $Backup = "$Path.account-flow-repair-backup"

    if (-not (Test-Path -LiteralPath $Backup)) {
        Copy-Item -LiteralPath $Path -Destination $Backup -Force
        Write-Host "Backup: $Backup" -ForegroundColor DarkGray
    }
}

$MarketingHeader = Join-Path $Root "components\marketing\MarketingHeader.tsx"
$MobileNav       = Join-Path $Root "components\layout\MobileNav.tsx"
$Sidebar         = Join-Path $Root "components\layout\Sidebar.tsx"

foreach ($Required in @($MarketingHeader, $MobileNav, $Sidebar)) {
    if (-not (Test-Path -LiteralPath $Required)) {
        throw "Required application file not found: $Required"
    }
}

Backup-Once -Path $MarketingHeader
Backup-Once -Path $MobileNav
Backup-Once -Path $Sidebar

# ============================================================
# 1. MARKETING HEADER
# ============================================================

$MarketingText = Read-Text -Path $MarketingHeader

if ($MarketingText.Contains('href="/auth/register"')) {
    Write-Host "Already applied: MarketingHeader Create account" -ForegroundColor DarkYellow
}
else {
    $SignInMarker = @'
          <Link
            href="/auth/signin"
'@

    $BrowseMarker = @'
          <Link
            href="/courses"
'@

    $SignInIndex = $MarketingText.IndexOf($SignInMarker)
    $BrowseIndex = $MarketingText.IndexOf($BrowseMarker, $SignInIndex)

    if ($SignInIndex -lt 0 -or $BrowseIndex -lt 0) {
        throw "MarketingHeader repair stopped: Sign in / Browse courses markers were not found."
    }

    $RegisterBlock = @'
          <Link
            href="/auth/register"
            className="hidden min-h-10 items-center justify-center rounded-xl border border-[var(--primary)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--primary)] transition hover:bg-[var(--primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] md:inline-flex"
          >
            Create account
          </Link>

'@

    $MarketingText = $MarketingText.Insert($BrowseIndex, $RegisterBlock)
    Write-Text -Path $MarketingHeader -Text $MarketingText

    Write-Host "Updated: MarketingHeader Create account" -ForegroundColor Green
}

# ============================================================
# 2. MOBILE NAV
# ============================================================

$MobileText = Read-Text -Path $MobileNav

if (-not $MobileText.Contains("function BillingIcon()")) {
    $NavMarker = "const navigationItems: MobileNavigationItem[] = ["

    if (-not $MobileText.Contains($NavMarker)) {
        throw "MobileNav repair stopped: navigationItems marker not found."
    }

    $BillingIcon = @'
function BillingIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

const navigationItems: MobileNavigationItem[] = [
'@

    $MobileText = $MobileText.Replace($NavMarker, $BillingIcon)
}

if (-not $MobileText.Contains('href: "/settings/billing"')) {
    $ArrayEnd = $MobileText.IndexOf("];", $MobileText.IndexOf("const navigationItems: MobileNavigationItem[] = ["))

    if ($ArrayEnd -lt 0) {
        throw "MobileNav repair stopped: navigationItems closing marker not found."
    }

    $BillingItem = @'
  {
    label: "Billing",
    href: "/settings/billing",
    icon: <BillingIcon />,
  },
'@

    $MobileText = $MobileText.Insert($ArrayEnd, $BillingItem)
}

# Adjust common grid column counts if present.
$MobileText = $MobileText.Replace("grid-cols-5", "grid-cols-6")

Write-Text -Path $MobileNav -Text $MobileText
Write-Host "Updated: MobileNav Billing" -ForegroundColor Green

# ============================================================
# 3. SIDEBAR
# ============================================================

$SidebarText = Read-Text -Path $Sidebar

if ($SidebarText.Contains('href: "/settings/billing"')) {
    Write-Host "Already applied: Sidebar Plans & Billing" -ForegroundColor DarkYellow
}
else {
    if (-not $SidebarText.Contains("function BillingIcon()")) {
        $SettingsIconMarker = "function SettingsIcon() {"

        if (-not $SidebarText.Contains($SettingsIconMarker)) {
            throw "Sidebar repair stopped: SettingsIcon marker not found."
        }

        $BillingIcon = @'
function BillingIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

function SettingsIcon() {
'@

        $SidebarText = $SidebarText.Replace($SettingsIconMarker, $BillingIcon)
    }

    $AccountIndex = $SidebarText.IndexOf('label: "Account"')

    if ($AccountIndex -lt 0) {
        throw "Sidebar repair stopped: Account section not found."
    }

    $SettingsIndex = $SidebarText.IndexOf('label: "Settings"', $AccountIndex)

    if ($SettingsIndex -lt 0) {
        throw "Sidebar repair stopped: Settings item inside Account section not found."
    }

    $SettingsItemStart = $SidebarText.LastIndexOf("      {", $SettingsIndex)

    if ($SettingsItemStart -lt 0) {
        throw "Sidebar repair stopped: Settings item start not found."
    }

    $BillingItem = @'
      {
        label: "Plans & Billing",
        href: "/settings/billing",
        icon: <BillingIcon />,
      },
'@

    $SidebarText = $SidebarText.Insert($SettingsItemStart, $BillingItem)

    Write-Text -Path $Sidebar -Text $SidebarText
    Write-Host "Updated: Sidebar Plans & Billing" -ForegroundColor Green
}

Write-Host ""
Write-Host "CASE University navigation repair completed." -ForegroundColor Cyan
Write-Host ""
Write-Host "Run validation:" -ForegroundColor Yellow
Write-Host "  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue"
Write-Host "  npx tsc --noEmit"
Write-Host "  npm run build"
