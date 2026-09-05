#Requires -Version 5.1

<#
.SYNOPSIS
    Uploads a CASE University worksheet PDF directly to the private
    Supabase Storage bucket.

.DESCRIPTION
    This script:

    1. Reads the CASE University Supabase URL and service-role key
       from the application's .env.local file.

    2. Validates:
       - Source file exists
       - Source file is a PDF
       - Course ID is a UUID
       - Module ID is a UUID
       - Lesson ID is a UUID
       - Version number is valid

    3. Builds the required CASE University Storage path:

       {course_id}/{module_id}/{lesson_id}/worksheet/v{version}/{filename}

    4. Uploads the PDF directly to:

       university-lesson-resources

    5. Calculates and displays:
       - Storage path
       - File size
       - SHA-256 checksum
       - MIME type

    IMPORTANT:
       The Supabase service-role key is read from .env.local and
       is NEVER displayed by this script.

       This script uploads the Storage object only.
       Database registration in university_lesson_resources remains
       a separate controlled step.

.EXAMPLE
    .\scripts\Upload-CASEUniversityWorksheet.ps1 `
        -FilePath "C:\Downloads\CASE_University_Saving_vs_Investing_Worksheet_v1.pdf" `
        -CourseId "2075b764-57e3-4aeb-bc44-8b5b90390a1b" `
        -ModuleId "a3ee9bc9-7c91-4f22-b02d-1ebbd48bb3df" `
        -LessonId "499ce992-7d76-4458-9b17-799a606d7654"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$FilePath,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$CourseId,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ModuleId,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$LessonId,

    [Parameter(Mandatory = $false)]
    [ValidateRange(1, 999)]
    [int]$Version = 1,

    [Parameter(Mandatory = $false)]
    [switch]$Force
)


# ============================================================
# CONSTANTS
# ============================================================

$ErrorActionPreference = "Stop"

$BucketName = "university-lesson-resources"
$MimeType   = "application/pdf"


# ============================================================
# HELPER FUNCTIONS
# ============================================================

function Write-Section {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Title
    )

    Write-Host ""
    Write-Host "============================================================" `
        -ForegroundColor DarkGray

    Write-Host $Title `
        -ForegroundColor Cyan

    Write-Host "============================================================" `
        -ForegroundColor DarkGray
}


function Get-EnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$EnvFile,

        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if (-not (Test-Path -LiteralPath $EnvFile)) {
        throw "Environment file was not found: $EnvFile"
    }

    $Match = Get-Content -LiteralPath $EnvFile |
        Where-Object {
            $_ -match "^\s*$([regex]::Escape($Name))\s*="
        } |
        Select-Object -First 1

    if (-not $Match) {
        throw "Required environment variable '$Name' was not found in $EnvFile"
    }

    $Value = ($Match -split "=", 2)[1].Trim()

    # Remove surrounding single or double quotes if present.
    if (
        ($Value.StartsWith('"') -and $Value.EndsWith('"')) -or
        ($Value.StartsWith("'") -and $Value.EndsWith("'"))
    ) {
        $Value = $Value.Substring(
            1,
            $Value.Length - 2
        )
    }

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "Environment variable '$Name' is empty."
    }

    return $Value
}


function Test-Uuid {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    $Parsed = [Guid]::Empty

    return [Guid]::TryParse(
        $Value,
        [ref]$Parsed
    )
}


function Encode-StoragePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $Segments = $Path -split "/"

    $EncodedSegments = foreach ($Segment in $Segments) {

        [System.Uri]::EscapeDataString(
            $Segment
        )
    }

    return ($EncodedSegments -join "/")
}


# ============================================================
# START
# ============================================================

Write-Section "CASE UNIVERSITY WORKSHEET UPLOADER"

Write-Host "Bucket:" `
    -NoNewline

Write-Host " $BucketName" `
    -ForegroundColor Yellow


# ============================================================
# DETERMINE PROJECT ROOT
# ============================================================

$ScriptDirectory = Split-Path `
    -Parent `
    $MyInvocation.MyCommand.Path

if (-not $ScriptDirectory) {
    throw "Unable to determine script directory."
}

$ProjectRoot = Split-Path `
    -Parent `
    $ScriptDirectory

$EnvFile = Join-Path `
    $ProjectRoot `
    ".env.local"


Write-Host "Project Root:" `
    -NoNewline

Write-Host " $ProjectRoot" `
    -ForegroundColor Gray


Write-Host ".env.local:" `
    -NoNewline

Write-Host " $EnvFile" `
    -ForegroundColor Gray


# ============================================================
# VALIDATE FILE
# ============================================================

Write-Section "1. VALIDATE SOURCE FILE"

$ResolvedFile = Resolve-Path `
    -LiteralPath $FilePath `
    -ErrorAction Stop

$ResolvedFilePath = $ResolvedFile.Path

$File = Get-Item `
    -LiteralPath $ResolvedFilePath

if ($File.PSIsContainer) {
    throw "FilePath points to a directory instead of a file."
}

if ($File.Extension.ToLowerInvariant() -ne ".pdf") {
    throw "Only PDF worksheet files are supported."
}

if ($File.Length -le 0) {
    throw "PDF file is empty."
}


Write-Host "File:" `
    -NoNewline

Write-Host " $($File.Name)" `
    -ForegroundColor Green


Write-Host "Source:" `
    -NoNewline

Write-Host " $ResolvedFilePath"


Write-Host "Size:" `
    -NoNewline

Write-Host " $($File.Length) bytes"


# ============================================================
# VALIDATE UUIDS
# ============================================================

Write-Section "2. VALIDATE CASE UNIVERSITY IDENTIFIERS"

if (-not (Test-Uuid -Value $CourseId)) {
    throw "CourseId is not a valid UUID: $CourseId"
}

if (-not (Test-Uuid -Value $ModuleId)) {
    throw "ModuleId is not a valid UUID: $ModuleId"
}

if (-not (Test-Uuid -Value $LessonId)) {
    throw "LessonId is not a valid UUID: $LessonId"
}


$CourseId = $CourseId.ToLowerInvariant()
$ModuleId = $ModuleId.ToLowerInvariant()
$LessonId = $LessonId.ToLowerInvariant()


Write-Host "Course ID:" `
    -NoNewline

Write-Host " $CourseId" `
    -ForegroundColor Green


Write-Host "Module ID:" `
    -NoNewline

Write-Host " $ModuleId" `
    -ForegroundColor Green


Write-Host "Lesson ID:" `
    -NoNewline

Write-Host " $LessonId" `
    -ForegroundColor Green


Write-Host "Version:" `
    -NoNewline

Write-Host " $Version" `
    -ForegroundColor Green


# ============================================================
# READ SUPABASE CONFIGURATION
# ============================================================

Write-Section "3. LOAD SUPABASE CONFIGURATION"

$SupabaseUrl = Get-EnvValue `
    -EnvFile $EnvFile `
    -Name "NEXT_PUBLIC_SUPABASE_URL_CASE_UNIVERSITY"

$ServiceRoleKey = Get-EnvValue `
    -EnvFile $EnvFile `
    -Name "SUPABASE_SERVICE_ROLE_KEY_CASE_UNIVERSITY"


$SupabaseUrl = $SupabaseUrl.TrimEnd("/")


if (
    -not $SupabaseUrl.StartsWith(
        "https://",
        [System.StringComparison]::OrdinalIgnoreCase
    )
) {
    throw "Supabase URL is not a valid HTTPS URL."
}


Write-Host "Supabase URL:" `
    -NoNewline

Write-Host " [CONFIGURED]" `
    -ForegroundColor Green


Write-Host "Service role key:" `
    -NoNewline

Write-Host " [CONFIGURED - HIDDEN]" `
    -ForegroundColor Green


# ============================================================
# CALCULATE FILE METADATA
# ============================================================

Write-Section "4. CALCULATE FILE METADATA"

$Hash = Get-FileHash `
    -LiteralPath $ResolvedFilePath `
    -Algorithm SHA256

$Sha256 = $Hash.Hash.ToLowerInvariant()


Write-Host "MIME Type:" `
    -NoNewline

Write-Host " $MimeType"


Write-Host "File Size:" `
    -NoNewline

Write-Host " $($File.Length) bytes"


Write-Host "SHA-256:" `
    -NoNewline

Write-Host " $Sha256" `
    -ForegroundColor Yellow


# ============================================================
# BUILD STORAGE PATH
# ============================================================

Write-Section "5. BUILD STORAGE PATH"

$StoragePath = (
    "$CourseId/" +
    "$ModuleId/" +
    "$LessonId/" +
    "worksheet/" +
    "v$Version/" +
    "$($File.Name)"
)


$EncodedStoragePath = Encode-StoragePath `
    -Path $StoragePath


Write-Host "Bucket:"
Write-Host "  $BucketName" `
    -ForegroundColor Yellow


Write-Host ""
Write-Host "Storage Path:"
Write-Host "  $StoragePath" `
    -ForegroundColor Yellow


# ============================================================
# BUILD SUPABASE STORAGE REQUEST
# ============================================================

Write-Section "6. PREPARE STORAGE UPLOAD"

$UploadUrl = (
    "$SupabaseUrl/storage/v1/object/" +
    "$BucketName/" +
    "$EncodedStoragePath"
)


$UpsertValue = if ($Force) {
    "true"
}
else {
    "false"
}


$Headers = @{
    "Authorization" = "Bearer $ServiceRoleKey"
    "apikey"        = $ServiceRoleKey
    "x-upsert"      = $UpsertValue
}


if ($Force) {

    Write-Host "Upload Mode:" `
        -NoNewline

    Write-Host " UPSERT / OVERWRITE ENABLED" `
        -ForegroundColor Yellow
}
else {

    Write-Host "Upload Mode:" `
        -NoNewline

    Write-Host " CREATE ONLY" `
        -ForegroundColor Green
}


# ============================================================
# UPLOAD PDF
# ============================================================

Write-Section "7. UPLOAD WORKSHEET"

try {

    $Response = Invoke-RestMethod `
        -Uri $UploadUrl `
        -Method Post `
        -Headers $Headers `
        -ContentType $MimeType `
        -InFile $ResolvedFilePath

}
catch {

    Write-Host ""
    Write-Host "UPLOAD FAILED" `
        -ForegroundColor Red

    Write-Host ""

    $StatusCode = $null
    $ResponseBody = $null

    if ($_.Exception.Response) {

        try {

            $StatusCode = [int]$_.Exception.Response.StatusCode

        }
        catch {
        }


        try {

            $Reader = New-Object System.IO.StreamReader(
                $_.Exception.Response.GetResponseStream()
            )

            $ResponseBody = $Reader.ReadToEnd()

            $Reader.Dispose()

        }
        catch {
        }
    }


    if ($StatusCode) {

        Write-Host "HTTP Status:" `
            -NoNewline

        Write-Host " $StatusCode" `
            -ForegroundColor Red
    }


    if ($ResponseBody) {

        Write-Host ""
        Write-Host "Supabase Response:"
        Write-Host $ResponseBody `
            -ForegroundColor Red
    }
    else {

        Write-Host $_.Exception.Message `
            -ForegroundColor Red
    }


    Write-Host ""

    if ($StatusCode -eq 400 -or $StatusCode -eq 409) {

        Write-Host (
            "The object may already exist. " +
            "If you intentionally want to replace it, rerun with -Force."
        ) -ForegroundColor Yellow
    }


    throw
}


# ============================================================
# SUCCESS
# ============================================================

Write-Section "UPLOAD SUCCESSFUL"

Write-Host "Worksheet successfully uploaded to private Supabase Storage." `
    -ForegroundColor Green


Write-Host ""
Write-Host "Bucket:"
Write-Host "  $BucketName"


Write-Host ""
Write-Host "Storage Path:"
Write-Host "  $StoragePath" `
    -ForegroundColor Green


Write-Host ""
Write-Host "Filename:"
Write-Host "  $($File.Name)"


Write-Host ""
Write-Host "MIME Type:"
Write-Host "  $MimeType"


Write-Host ""
Write-Host "File Size:"
Write-Host "  $($File.Length)"


Write-Host ""
Write-Host "SHA-256:"
Write-Host "  $Sha256"


Write-Host ""
Write-Host "Version:"
Write-Host "  $Version"


Write-Host ""
Write-Host "NEXT STEP:" `
    -ForegroundColor Cyan

Write-Host (
    "Register this exact Storage object in " +
    "public.university_lesson_resources."
)


# ============================================================
# RETURN OBJECT FOR OPTIONAL PIPELINE USE
# ============================================================

[PSCustomObject]@{
    Success          = $true
    Bucket           = $BucketName
    StoragePath      = $StoragePath
    OriginalFileName = $File.Name
    MimeType         = $MimeType
    FileSizeBytes    = $File.Length
    Sha256           = $Sha256
    VersionNumber    = $Version
    CourseId         = $CourseId
    ModuleId         = $ModuleId
    LessonId         = $LessonId
}