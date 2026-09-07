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

if ($Text.Contains('Create account')) {
    Write-Host "Already applied: Sign In Create account link" -ForegroundColor DarkYellow
    exit 0
}

$Backup = "$Path.register-link-backup"
if (-not (Test-Path -LiteralPath $Backup)) {
    Copy-Item -LiteralPath $Path -Destination $Backup -Force
    Write-Host "Backup: $Backup" -ForegroundColor DarkGray
}

$Marker = @'
      <button
        type="submit"
        disabled={
          isSubmitting
        }
        className="
          flex
          w-full
          items-center
          justify-center
          rounded-xl
          bg-[var(--primary)]
          px-4
          py-3
          text-sm
          font-bold
          text-[var(--primary-foreground)]
          shadow-[var(--shadow-primary)]
          transition
          hover:bg-[var(--primary-hover)]
          focus:outline-none
          focus-visible:ring-2
          focus-visible:ring-[var(--focus-ring)]
          focus-visible:ring-offset-2
          focus-visible:ring-offset-[var(--surface-default)]
          disabled:cursor-not-allowed
          disabled:opacity-60
          sm:text-base
        "
      >
        {isSubmitting
          ? "Signing in..."
          : "Sign in"}
      </button>
'@

$Replacement = @'
      <button
        type="submit"
        disabled={
          isSubmitting
        }
        className="
          flex
          w-full
          items-center
          justify-center
          rounded-xl
          bg-[var(--primary)]
          px-4
          py-3
          text-sm
          font-bold
          text-[var(--primary-foreground)]
          shadow-[var(--shadow-primary)]
          transition
          hover:bg-[var(--primary-hover)]
          focus:outline-none
          focus-visible:ring-2
          focus-visible:ring-[var(--focus-ring)]
          focus-visible:ring-offset-2
          focus-visible:ring-offset-[var(--surface-default)]
          disabled:cursor-not-allowed
          disabled:opacity-60
          sm:text-base
        "
      >
        {isSubmitting
          ? "Signing in..."
          : "Sign in"}
      </button>

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

if (-not $Text.Contains($Marker)) {
    throw "Unable to locate the current Sign In submit-button marker. No changes were written."
}

$Text = $Text.Replace($Marker, $Replacement)

[System.IO.File]::WriteAllText($Path, $Text, $Utf8NoBom)

Write-Host "Updated: Sign In Create account link" -ForegroundColor Green
Write-Host ""
Write-Host "Run validation:" -ForegroundColor Yellow
Write-Host "  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue"
Write-Host "  npx tsc --noEmit"
