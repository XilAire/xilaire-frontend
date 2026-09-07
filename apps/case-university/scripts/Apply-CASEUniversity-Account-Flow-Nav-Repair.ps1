#requires -Version 5.1
$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Read-Text([string]$Path) {
    return [System.IO.File]::ReadAllText($Path)
}

function Write-Text([string]$Path, [string]$Text) {
    [System.IO.File]::WriteAllText($Path, $Text, $Utf8NoBom)
}

function Backup-Once([string]$Path) {
    $Backup = "$Path.account-flow-repair-backup"
    if (-not (Test-Path -LiteralPath $Backup)) {
        Copy-Item -LiteralPath $Path -Destination $Backup -Force
        Write-Host "Backup: $Backup" -ForegroundColor DarkGray
    }
}

$MarketingHeader = Join-Path $Root "components\marketing\MarketingHeader.tsx"
$MobileNav = Join-Path $Root "components\layout\MobileNav.tsx"
$Sidebar = Join-Path $Root "components\layout\Sidebar.tsx"

$PackageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$PackageRoot = Split-Path -Parent $PackageRoot
$PackageRoot = Split-Path -Parent $PackageRoot

$SourceMarketing = Join-Path $PackageRoot "components\marketing\MarketingHeader.tsx"
$SourceMobile = Join-Path $PackageRoot "components\layout\MobileNav.tsx"

foreach ($Required in @($MarketingHeader, $MobileNav, $Sidebar, $SourceMarketing, $SourceMobile)) {
    if (-not (Test-Path -LiteralPath $Required)) {
        throw "Required file not found: $Required"
    }
}

Backup-Once $MarketingHeader
Backup-Once $MobileNav
Backup-Once $Sidebar

Copy-Item -LiteralPath $SourceMarketing -Destination $MarketingHeader -Force
Copy-Item -LiteralPath $SourceMobile -Destination $MobileNav -Force

Write-Host "Updated: MarketingHeader.tsx" -ForegroundColor Green
Write-Host "Updated: MobileNav.tsx" -ForegroundColor Green

$SidebarText = Read-Text $Sidebar

if (-not $SidebarText.Contains('href: "/settings/billing"')) {
    # Add a billing icon before SettingsIcon if one does not already exist.
    if (-not $SidebarText.Contains("function BillingIcon()")) {
        $SettingsMarker = "function SettingsIcon() {"

        if (-not $SidebarText.Contains($SettingsMarker)) {
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

        $SidebarText = $SidebarText.Replace($SettingsMarker, $BillingIcon)
    }

    # Insert Billing immediately before the Settings item in the Account section.
    $AccountIndex = $SidebarText.IndexOf('label: "Account"')
    if ($AccountIndex -lt 0) {
        throw "Sidebar repair stopped: Account section not found."
    }

    $SettingsIndex = $SidebarText.IndexOf('label: "Settings"', $AccountIndex)
    if ($SettingsIndex -lt 0) {
        throw "Sidebar repair stopped: Settings item in Account section not found."
    }

    $ItemStart = $SidebarText.LastIndexOf("      {", $SettingsIndex)
    if ($ItemStart -lt 0) {
        throw "Sidebar repair stopped: Settings item start not found."
    }

    $BillingItem = @'
      {
        label: "Plans & Billing",
        href: "/settings/billing",
        icon: <BillingIcon />,
      },
'@

    $SidebarText = $SidebarText.Insert($ItemStart, $BillingItem)
    Write-Text $Sidebar $SidebarText

    Write-Host "Updated: Sidebar Plans & Billing" -ForegroundColor Green
}
else {
    Write-Host "Already applied: Sidebar Plans & Billing" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "Navigation repair complete." -ForegroundColor Cyan
Write-Host ""
Write-Host "Run:" -ForegroundColor Yellow
Write-Host "  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue"
Write-Host "  npx tsc --noEmit"
Write-Host "  npm run build"
