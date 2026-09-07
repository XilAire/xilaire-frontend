#requires -Version 5.1
$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$RegisterPage = Join-Path $Root "app\auth\register\page.tsx"
$RegisterForm = Join-Path $Root "components\auth\RegisterForm.tsx"

$RegisterPageBackup = "$RegisterPage.auth-intent-backup"
$RegisterFormBackup = "$RegisterForm.auth-intent-backup"

if (-not (Test-Path -LiteralPath (Join-Path $Root "app"))) {
    throw "Run this script from C:\Development\xilaire-frontend-old\apps\case-university"
}

if (-not (Test-Path -LiteralPath $RegisterPageBackup)) {
    throw "Required backup not found: $RegisterPageBackup"
}

if (-not (Test-Path -LiteralPath $RegisterFormBackup)) {
    throw "Required backup not found: $RegisterFormBackup"
}

# Preserve the currently broken files before rollback.
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

Copy-Item -LiteralPath $RegisterPage `
    -Destination "$RegisterPage.before-register-auth-intent-rollback-$Stamp" `
    -Force

Copy-Item -LiteralPath $RegisterForm `
    -Destination "$RegisterForm.before-register-auth-intent-rollback-$Stamp" `
    -Force

Write-Host "Preserved current Register page/form for diagnostics." -ForegroundColor DarkGray

# Restore only the register-side files to the known-good state that existed
# immediately before the reciprocal auth-intent phase.
Copy-Item -LiteralPath $RegisterPageBackup `
    -Destination $RegisterPage `
    -Force

Copy-Item -LiteralPath $RegisterFormBackup `
    -Destination $RegisterForm `
    -Force

Write-Host "Restored: app\auth\register\page.tsx" -ForegroundColor Green
Write-Host "Restored: components\auth\RegisterForm.tsx" -ForegroundColor Green

Write-Host ""
Write-Host "Register-side auth-intent rollback completed." -ForegroundColor Cyan
Write-Host ""
Write-Host "The Sign In-side intent changes were NOT rolled back." -ForegroundColor Yellow
Write-Host ""
Write-Host "Run:" -ForegroundColor Yellow
Write-Host "  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue"
Write-Host "  npx tsc --noEmit"
