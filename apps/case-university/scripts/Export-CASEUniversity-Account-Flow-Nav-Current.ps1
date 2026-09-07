#requires -Version 5.1
<#
.SYNOPSIS
  Exports the current CASE University pricing/auth/navigation files needed
  for the next implementation phase.

.DESCRIPTION
  READ ONLY.
  Windows PowerShell 5.1 compatible.
  Makes no application, Stripe, Supabase, or database changes.

  Run from:
    C:\Development\xilaire-frontend-old\apps\case-university

  Output:
    .\CASEUniversity-Account-Flow-Nav-Current.zip
#>

$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path

if (-not (Test-Path -LiteralPath (Join-Path $Root "app"))) {
    throw "Run this script from C:\Development\xilaire-frontend-old\apps\case-university"
}

$ExactFiles = @(
    "components\pricing\PricingClient.tsx",
    "app\pricing\page.tsx",
    "components\auth\SignInForm.tsx",
    "components\auth\RegisterForm.tsx",
    "app\auth\signin\page.tsx",
    "app\auth\register\page.tsx",
    "app\auth\callback\route.ts",
    "lib\auth\registration-intent.ts",
    "app\actions\register.ts",
    "app\api\stripe\checkout\create\route.ts",
    "lib\university\billing-checkout.ts",
    "lib\university\billing-management.ts",
    "app\(app)\layout.tsx",
    "components\layout\AppHeader.tsx"
)

$CandidateFiles = @(
    "components\layout\Sidebar.tsx",
    "components\layout\MobileNav.tsx",
    "components\marketing\MarketingHeader.tsx",
    "components\marketing\Header.tsx",
    "components\marketing\Navbar.tsx",
    "components\marketing\Navigation.tsx",
    "components\marketing\MarketingNav.tsx"
)

$TempRoot = Join-Path $env:TEMP ("CASEUniversity-AccountFlowNav-" + [Guid]::NewGuid().ToString("N"))
$ZipPath = Join-Path $Root "CASEUniversity-Account-Flow-Nav-Current.zip"

New-Item -ItemType Directory -Path $TempRoot -Force | Out-Null

function Copy-ProjectFile {
    param(
        [Parameter(Mandatory=$true)][string]$RelativePath
    )

    $Source = Join-Path $Root $RelativePath

    if (-not (Test-Path -LiteralPath $Source)) {
        return $false
    }

    $Destination = Join-Path $TempRoot $RelativePath
    $DestinationDirectory = Split-Path -Parent $Destination

    New-Item -ItemType Directory -Path $DestinationDirectory -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Destination -Force

    Write-Host "Collected: $RelativePath" -ForegroundColor Green
    return $true
}

try {
    foreach ($RelativePath in $ExactFiles) {
        if (-not (Copy-ProjectFile -RelativePath $RelativePath)) {
            throw "Required file not found: $RelativePath"
        }
    }

    foreach ($RelativePath in $CandidateFiles) {
        [void](Copy-ProjectFile -RelativePath $RelativePath)
    }

    # Discover additional likely navigation files without assuming names.
    $SearchRoots = @(
        (Join-Path $Root "components\layout"),
        (Join-Path $Root "components\marketing"),
        (Join-Path $Root "app")
    ) | Where-Object { Test-Path -LiteralPath $_ }

    if ($SearchRoots.Count -gt 0) {
        $Matches = Get-ChildItem -LiteralPath $SearchRoots -Recurse -File -Include *.ts,*.tsx -ErrorAction SilentlyContinue |
            Select-String -SimpleMatch -Pattern 'Sign In','signin','MobileNav','Sidebar','Pricing','Register','Create Account' -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty Path -Unique

        foreach ($MatchPath in $Matches) {
            if ($MatchPath.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
                $RelativePath = $MatchPath.Substring($Root.Length).TrimStart('\')
                [void](Copy-ProjectFile -RelativePath $RelativePath)
            }
        }
    }

    if (Test-Path -LiteralPath $ZipPath) {
        Remove-Item -LiteralPath $ZipPath -Force
    }

    Compress-Archive `
        -Path (Join-Path $TempRoot "*") `
        -DestinationPath $ZipPath `
        -CompressionLevel Optimal

    Write-Host ""
    Write-Host "Created:" -ForegroundColor Cyan
    Write-Host "  $ZipPath"
    Write-Host ""
    Write-Host "Upload CASEUniversity-Account-Flow-Nav-Current.zip here." -ForegroundColor Yellow
}
finally {
    if (Test-Path -LiteralPath $TempRoot) {
        Remove-Item -LiteralPath $TempRoot -Recurse -Force
    }
}
