#requires -Version 5.1
<#
.SYNOPSIS
  Export exact current CASE University guest-course runtime files.

.DESCRIPTION
  Read-only, Windows PowerShell 5.1 compatible.
  Exports outside the repository under %TEMP% so copied .tsx files cannot
  interfere with TypeScript/Next.js compilation.

  Run from:
    C:\Development\xilaire-frontend-old\apps\case-university
#>

$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path

if (-not (Test-Path -LiteralPath (Join-Path $Root "app"))) {
    throw "Run this script from C:\Development\xilaire-frontend-old\apps\case-university"
}

$Files = @(
    "app\(app)\layout.tsx",
    "app\(app)\courses\page.tsx",
    "app\(app)\courses\[slug]\page.tsx",
    "lib\university\profile-settings.ts",
    "lib\university\top-bar.ts",
    "components\layout\AppShell.tsx",
    "components\layout\AppHeader.tsx",
    "components\layout\Sidebar.tsx",
    "components\layout\MobileNav.tsx"
)

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ExportRoot = Join-Path $env:TEMP "CASEUniversity-Guest-Courses-Runtime-$Stamp"
$Combined = Join-Path $ExportRoot "CASEUniversity-Guest-Courses-Runtime.txt"
$ZipPath = "$ExportRoot.zip"

New-Item -ItemType Directory -Path $ExportRoot -Force | Out-Null

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$Builder = New-Object System.Text.StringBuilder

foreach ($Relative in $Files) {
    $Source = Join-Path $Root $Relative

    if (-not (Test-Path -LiteralPath $Source)) {
        Write-Host "Missing (skipped): $Relative" -ForegroundColor DarkYellow
        continue
    }

    Write-Host "Collecting: $Relative"

    $SafeRelative = $Relative.Replace("[", "_").Replace("]", "_")
    $Destination = Join-Path $ExportRoot $SafeRelative
    $DestinationDirectory = Split-Path -Parent $Destination

    New-Item -ItemType Directory -Path $DestinationDirectory -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Destination -Force

    [void]$Builder.AppendLine("============================================================")
    [void]$Builder.AppendLine("FILE: $Relative")
    [void]$Builder.AppendLine("============================================================")
    [void]$Builder.AppendLine()
    [void]$Builder.AppendLine([System.IO.File]::ReadAllText($Source))
    [void]$Builder.AppendLine()
    [void]$Builder.AppendLine()
}

[System.IO.File]::WriteAllText($Combined, $Builder.ToString(), $Utf8NoBom)

if (Test-Path -LiteralPath $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
}

Compress-Archive -LiteralPath (Join-Path $ExportRoot "*") -DestinationPath $ZipPath -Force

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " GUEST COURSES RUNTIME EXPORT COMPLETE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "No application source files were modified."
Write-Host ""
Write-Host "ZIP:"
Write-Host "  $ZipPath"
Write-Host ""
Write-Host "Combined text:"
Write-Host "  $Combined"
Write-Host ""
Write-Host "Attach either file in ChatGPT."
