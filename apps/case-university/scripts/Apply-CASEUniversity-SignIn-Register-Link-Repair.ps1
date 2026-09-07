#requires -Version 5.1
$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Path = Join-Path $Root "components\auth\SignInForm.tsx"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path -LiteralPath (Join-Path $Root "app"))) {
    throw "Run this script from C:\Development\xilaire-frontend-old\apps\case-university"
}

if (-not (Test-Path -LiteralPath $Path)) {
    throw "Required file not found: $Path"
}

$Text = [System.IO.File]::ReadAllText($Path)

if ($Text.Contains("New to CASE University?")) {
    Write-Host "Already applied: Sign In Create account link" -ForegroundColor DarkYellow
    exit 0
}

$Backup = "$Path.register-link-repair-backup"

if (-not (Test-Path -LiteralPath $Backup)) {
    Copy-Item -LiteralPath $Path -Destination $Backup -Force
    Write-Host "Backup: $Backup" -ForegroundColor DarkGray
}

# Match the exact current end of the Sign In submit button while tolerating CRLF/LF.
$Pattern = '(?s)(\{isSubmitting\s*\?\s*"Signing in\.\.\."\s*:\s*"Sign in"\}\s*</button>)(\s*</form>)'

if (-not [System.Text.RegularExpressions.Regex]::IsMatch($Text, $Pattern)) {
    throw "Unable to locate the current Sign In submit button. No changes were written."
}

$Insert = @'

      <div className="border-t border-[var(--border-subtle)] pt-5 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          New to CASE University?{" "}
          <Link
            href="/auth/register"
            className="font-bold text-[var(--primary)] transition hover:text-[var(--primary-hover)]"
          >
            Create account
          </Link>
        </p>
      </div>
'@

$Replacement = '$1' + $Insert + '$2'

$Updated = [System.Text.RegularExpressions.Regex]::Replace(
    $Text,
    $Pattern,
    $Replacement,
    1
)

[System.IO.File]::WriteAllText(
    $Path,
    $Updated,
    $Utf8NoBom
)

Write-Host "Updated: Sign In Create account link" -ForegroundColor Green
Write-Host ""
Write-Host "Run validation:" -ForegroundColor Yellow
Write-Host "  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue"
Write-Host "  npx tsc --noEmit"
