#requires -Version 5.1
<#
.SYNOPSIS
  CASE University auth-intent hardening discovery/export.

.DESCRIPTION
  Windows PowerShell 5.1 compatible.
  READ ONLY: does not modify application source files.

  Run from:
    C:\Development\xilaire-frontend-old\apps\case-university

  Collects the exact current auth/registration files needed to implement:
    - Sign In <-> Register intent preservation
    - selected paid-plan preservation
    - safe callback redirect validation
    - existing-user registration routing
    - post-auth return to /pricing?checkout_plan=...
#>

$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path

if (-not (Test-Path -LiteralPath (Join-Path $Root "app"))) {
    throw "Run this script from C:\Development\xilaire-frontend-old\apps\case-university"
}

$Files = @(
    "app\auth\signin\page.tsx",
    "components\auth\SignInForm.tsx",
    "app\auth\register\page.tsx",
    "components\auth\RegisterForm.tsx",
    "app\auth\callback\route.ts",
    "app\actions\register.ts",
    "lib\auth\registration-intent.ts",
    "app\pricing\page.tsx",
    "components\pricing\PricingClient.tsx"
)

$Missing = @()

foreach ($RelativePath in $Files) {
    $FullPath = Join-Path $Root $RelativePath

    if (-not (Test-Path -LiteralPath $FullPath)) {
        $Missing += $RelativePath
    }
}

if ($Missing.Count -gt 0) {
    Write-Host ""
    Write-Host "Missing required files:" -ForegroundColor Red
    $Missing | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Red
    }

    throw "Auth-intent discovery stopped because required files are missing."
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutputDir = Join-Path $Root "CASEUniversity-Auth-Intent-Current-$Timestamp"
$ZipPath = "$OutputDir.zip"
$TextPath = Join-Path $OutputDir "CASEUniversity-Auth-Intent-Current.txt"

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$Builder = New-Object System.Text.StringBuilder

[void]$Builder.AppendLine("CASE UNIVERSITY AUTH-INTENT HARDENING DISCOVERY")
[void]$Builder.AppendLine("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$Builder.AppendLine("Root: $Root")
[void]$Builder.AppendLine("READ ONLY")
[void]$Builder.AppendLine("")

foreach ($RelativePath in $Files) {
    $FullPath = Join-Path $Root $RelativePath

    Write-Host "Collecting: $RelativePath" -ForegroundColor Cyan

    $DestinationPath = Join-Path $OutputDir $RelativePath
    $DestinationDirectory = Split-Path -Parent $DestinationPath

    New-Item -ItemType Directory -Path $DestinationDirectory -Force | Out-Null
    Copy-Item -LiteralPath $FullPath -Destination $DestinationPath -Force

    [void]$Builder.AppendLine(("=" * 100))
    [void]$Builder.AppendLine("FILE: $RelativePath")
    [void]$Builder.AppendLine(("=" * 100))
    [void]$Builder.AppendLine("")
    [void]$Builder.AppendLine([System.IO.File]::ReadAllText($FullPath))
    [void]$Builder.AppendLine("")
}

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
    $TextPath,
    $Builder.ToString(),
    $Utf8NoBom
)

if (Test-Path -LiteralPath $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
}

Compress-Archive `
    -LiteralPath $OutputDir `
    -DestinationPath $ZipPath `
    -CompressionLevel Optimal

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " AUTH-INTENT DISCOVERY COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "No application source files were modified." -ForegroundColor Green
Write-Host ""
Write-Host "ZIP:" -ForegroundColor Yellow
Write-Host "  $ZipPath"
Write-Host ""
Write-Host "Combined text:" -ForegroundColor Yellow
Write-Host "  $TextPath"
Write-Host ""
Write-Host "Attach the ZIP or combined text file in ChatGPT for the next implementation phase." -ForegroundColor Yellow
