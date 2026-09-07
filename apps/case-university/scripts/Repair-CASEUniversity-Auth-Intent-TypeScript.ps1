#requires -Version 5.1
$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$RegisterForm = Join-Path $Root "components\auth\RegisterForm.tsx"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path -LiteralPath (Join-Path $Root "app"))) {
    throw "Run this script from C:\Development\xilaire-frontend-old\apps\case-university"
}

if (-not (Test-Path -LiteralPath $RegisterForm)) {
    throw "Required file not found: $RegisterForm"
}

function Write-Text {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Text
    )
    [System.IO.File]::WriteAllText($Path, $Text, $Utf8NoBom)
}

$Backup = "$RegisterForm.auth-intent-props-repair-backup"
if (-not (Test-Path -LiteralPath $Backup)) {
    Copy-Item -LiteralPath $RegisterForm -Destination $Backup -Force
    Write-Host "Backup: $Backup" -ForegroundColor DarkGray
}

$Text = [System.IO.File]::ReadAllText($RegisterForm)

# ============================================================
# 1. Repair RegisterFormProps
# ============================================================

$PropsPattern = '(?s)type\s+RegisterFormProps\s*=\s*\{(?<body>.*?)\};'
$PropsMatch = [System.Text.RegularExpressions.Regex]::Match($Text, $PropsPattern)

if (-not $PropsMatch.Success) {
    throw "Unable to locate RegisterFormProps."
}

$PropsBody = $PropsMatch.Groups["body"].Value

if ($PropsBody -notmatch '\bsignInHref\s*:\s*string\s*;') {
    $NewPropsBody = $PropsBody.TrimEnd() + "`r`n  signInHref: string;`r`n"
    $NewPropsBlock = "type RegisterFormProps = {" + $NewPropsBody + "};"

    $Text = $Text.Substring(0, $PropsMatch.Index) +
        $NewPropsBlock +
        $Text.Substring($PropsMatch.Index + $PropsMatch.Length)

    Write-Host "Updated: RegisterFormProps.signInHref" -ForegroundColor Green
}
else {
    Write-Host "Already applied: RegisterFormProps.signInHref" -ForegroundColor DarkYellow
}

# ============================================================
# 2. Repair function destructuring
# ============================================================

if ($Text -notmatch '(?s)export\s+default\s+function\s+RegisterForm\s*\(\s*\{.*?\bsignInHref\s*,.*?\}\s*:\s*RegisterFormProps\s*\)') {
    $FunctionPattern = '(?s)(export\s+default\s+function\s+RegisterForm\s*\(\s*\{)(?<body>.*?)(\}\s*:\s*RegisterFormProps\s*\))'
    $FunctionMatch = [System.Text.RegularExpressions.Regex]::Match($Text, $FunctionPattern)

    if (-not $FunctionMatch.Success) {
        throw "Unable to locate RegisterForm destructuring."
    }

    $Body = $FunctionMatch.Groups["body"].Value

    if ($Body -notmatch '\bsignInHref\s*,') {
        $NewBody = $Body.TrimEnd() + "`r`n  signInHref,`r`n"
        $NewFunctionHeader =
            $FunctionMatch.Groups[1].Value +
            $NewBody +
            $FunctionMatch.Groups[3].Value

        $Text = $Text.Substring(0, $FunctionMatch.Index) +
            $NewFunctionHeader +
            $Text.Substring($FunctionMatch.Index + $FunctionMatch.Length)

        Write-Host "Updated: RegisterForm signInHref destructuring" -ForegroundColor Green
    }
}
else {
    Write-Host "Already applied: RegisterForm signInHref destructuring" -ForegroundColor DarkYellow
}

Write-Text -Path $RegisterForm -Text $Text

# ============================================================
# 3. Remove generated discovery directories from source tree
#    They contain copied .tsx files and TypeScript compiles them.
#    ZIP files are preserved.
# ============================================================

$DiscoveryDirs = Get-ChildItem -LiteralPath $Root -Directory |
    Where-Object {
        $_.Name -like "CASEUniversity-Auth-Intent-Current-*"
    }

foreach ($Dir in $DiscoveryDirs) {
    Remove-Item -LiteralPath $Dir.FullName -Recurse -Force
    Write-Host "Removed generated source-copy directory: $($Dir.Name)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Auth-intent TypeScript repair completed." -ForegroundColor Cyan
Write-Host ""
Write-Host "Run:" -ForegroundColor Yellow
Write-Host "  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue"
Write-Host "  npx tsc --noEmit"
