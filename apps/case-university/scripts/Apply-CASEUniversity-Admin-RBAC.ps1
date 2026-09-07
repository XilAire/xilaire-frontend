<#
.SYNOPSIS
  Applies the CASE University role hierarchy to the existing curriculum
  administration files.

.DESCRIPTION
  Windows PowerShell 5.1 compatible.

  Role hierarchy:
    user         = 1
    admin        = 2  (admin-area/course view only)
    super_admin  = 3  (user + curriculum management, no publishing)
    master_admin = 4+ (full authority)

  This script:
    - creates .rbac-backup files before changing anything
    - opens curriculum admin pages to rank 2+
    - changes curriculum create/edit/manage actions to rank 3+
    - keeps publish/unpublish at rank 4+
    - changes assessment management to rank 3+

  IMPORTANT:
    Run this script from:
      C:\Development\xilaire-frontend-old\apps\case-university\scripts

    OR from:
      C:\Development\xilaire-frontend-old\apps\case-university

    The script automatically resolves the CASE University app root.
#>

$ErrorActionPreference = "Stop"

function Get-CaseUniversityRoot {
    $Current = (Get-Location).Path

    if (
        (Test-Path -LiteralPath (Join-Path $Current "app")) -and
        (Test-Path -LiteralPath (Join-Path $Current "components"))
    ) {
        return $Current
    }

    $Parent = Split-Path -Parent $Current

    if (
        (Test-Path -LiteralPath (Join-Path $Parent "app")) -and
        (Test-Path -LiteralPath (Join-Path $Parent "components"))
    ) {
        return $Parent
    }

    $ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ScriptParent    = Split-Path -Parent $ScriptDirectory

    if (
        (Test-Path -LiteralPath (Join-Path $ScriptParent "app")) -and
        (Test-Path -LiteralPath (Join-Path $ScriptParent "components"))
    ) {
        return $ScriptParent
    }

    throw "Unable to determine the CASE University application root."
}

function Write-Utf8NoBom {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [string]$Content
    )

    $Utf8NoBom =
        New-Object System.Text.UTF8Encoding($false)

    [System.IO.File]::WriteAllText(
        $Path,
        $Content,
        $Utf8NoBom
    )
}

function Backup-File {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    $BackupPath = "$Path.rbac-backup"

    if (-not (Test-Path -LiteralPath $BackupPath)) {
        Copy-Item `
            -LiteralPath $Path `
            -Destination $BackupPath `
            -Force

        Write-Host "Backup: $BackupPath" -ForegroundColor DarkGray
    }
    else {
        Write-Host "Backup already exists: $BackupPath" -ForegroundColor DarkGray
    }
}

function Replace-Required {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [string]$Old,

        [Parameter(Mandatory)]
        [string]$New,

        [Parameter(Mandatory)]
        [string]$Description
    )

    $Text =
        [System.IO.File]::ReadAllText(
            $Path
        )

    if (-not $Text.Contains($Old)) {
        throw "Expected code not found for '$Description' in $Path. No change was made for this replacement."
    }

    $Updated =
        $Text.Replace(
            $Old,
            $New
        )

    Write-Utf8NoBom `
        -Path $Path `
        -Content $Updated

    Write-Host "Updated: $Description" -ForegroundColor Green
}

$Root =
    Get-CaseUniversityRoot

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "CASE UNIVERSITY - ADMIN RBAC MIGRATION" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Application root:" -ForegroundColor Yellow
Write-Host "  $Root"
Write-Host ""

$CoursePages = @(
    "app\(app)\admin\courses\page.tsx",
    "app\(app)\admin\courses\[courseId]\page.tsx",
    "app\(app)\admin\courses\[courseId]\modules\[moduleId]\page.tsx",
    "app\(app)\admin\courses\[courseId]\modules\[moduleId]\lessons\[lessonId]\page.tsx"
)

foreach ($RelativePath in $CoursePages) {
    $Path =
        Join-Path $Root $RelativePath

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Required course admin page not found: $Path"
    }

    Backup-File `
        -Path $Path

    $Text =
        [System.IO.File]::ReadAllText(
            $Path
        )

    $Updated =
        $Text -replace `
            'role\.role_rank\s*<\s*4',
            'role.role_rank < 2'

    Write-Utf8NoBom `
        -Path $Path `
        -Content $Updated

    Write-Host "View gate => rank 2+: $RelativePath" -ForegroundColor Green
}

$AdminActionsPath =
    Join-Path `
        $Root `
        "app\actions\university-admin.ts"

if (-not (Test-Path -LiteralPath $AdminActionsPath)) {
    throw "Required file not found: $AdminActionsPath"
}

Backup-File `
    -Path $AdminActionsPath

$AdminActions =
    [System.IO.File]::ReadAllText(
        $AdminActionsPath
    )

# ------------------------------------------------------------
# 1. Direct role_rank < 4 checks become rank 3+ management
# ------------------------------------------------------------

$AdminActions =
    $AdminActions -replace `
        'role\.role_rank\s*<\s*4',
        'role.role_rank < 3'

# ------------------------------------------------------------
# 2. Replace legacy shared rank-4 helper with split permissions
# ------------------------------------------------------------

$OldHelper = @'
async function requireUniversityAdmin() {
  const role = await resolveCurrentUserRole();

  return Boolean(
    role &&
      role.role_rank >= 4,
  );
}
'@

$NewHelper = @'
async function requireUniversityCurriculumManager() {
  const role = await resolveCurrentUserRole();

  return Boolean(
    role &&
      role.role_rank >= 3,
  );
}

async function requireUniversityPublisher() {
  const role = await resolveCurrentUserRole();

  return Boolean(
    role &&
      role.role_rank >= 4,
  );
}
'@

if ($AdminActions.Contains($OldHelper)) {
    $AdminActions =
        $AdminActions.Replace(
            $OldHelper,
            $NewHelper
        )

    Write-Host "Split legacy admin helper into manager/publisher gates." -ForegroundColor Green
}
elseif (
    $AdminActions.Contains(
        "async function requireUniversityCurriculumManager()"
    ) -and
    $AdminActions.Contains(
        "async function requireUniversityPublisher()"
    )
) {
    Write-Host "Manager/publisher helpers already present. Skipping helper replacement." -ForegroundColor DarkYellow
}
else {
    throw "The expected requireUniversityAdmin() helper was not found, and the replacement helpers are not already present."
}

# ------------------------------------------------------------
# 3. Existing admin helper calls become rank-3 manager calls
# ------------------------------------------------------------

$AdminActions =
    $AdminActions.Replace(
        "(await requireUniversityAdmin())",
        "(await requireUniversityCurriculumManager())"
    )

# ------------------------------------------------------------
# 4. Publishing block remains rank 4+
# ------------------------------------------------------------

$PublishFunctionMarker =
    "async function setUniversityCurriculumPublishState"

$PublishStart =
    $AdminActions.IndexOf(
        $PublishFunctionMarker
    )

if ($PublishStart -lt 0) {
    throw "Publishing function was not found."
}

$PublishEndMarker =
    "export async function publishUniversityLessonAction"

$PublishEnd =
    $AdminActions.IndexOf(
        $PublishEndMarker,
        $PublishStart
    )

if ($PublishEnd -lt 0) {
    throw "Publishing function end marker was not found."
}

$BeforePublish =
    $AdminActions.Substring(
        0,
        $PublishStart
    )

$PublishBlock =
    $AdminActions.Substring(
        $PublishStart,
        $PublishEnd - $PublishStart
    )

$AfterPublish =
    $AdminActions.Substring(
        $PublishEnd
    )

$PublishBlock =
    $PublishBlock.Replace(
        "(await requireUniversityCurriculumManager())",
        "(await requireUniversityPublisher())"
    )

$AdminActions =
    $BeforePublish +
    $PublishBlock +
    $AfterPublish

Write-Utf8NoBom `
    -Path $AdminActionsPath `
    -Content $AdminActions

Write-Host "Curriculum management gate => rank 3+" -ForegroundColor Green
Write-Host "Curriculum publishing gate => rank 4+" -ForegroundColor Green

# ------------------------------------------------------------
# 5. Assessments become rank 3+ management
# ------------------------------------------------------------

$AssessmentPath =
    Join-Path `
        $Root `
        "app\actions\university-assessments.ts"

if (Test-Path -LiteralPath $AssessmentPath) {
    Backup-File `
        -Path $AssessmentPath

    $AssessmentText =
        [System.IO.File]::ReadAllText(
            $AssessmentPath
        )

    $AssessmentText =
        $AssessmentText -replace `
            'role\.role_rank\s*<\s*4',
            'role.role_rank < 3'

    $AssessmentText =
        $AssessmentText -replace `
            'role\.role_rank\s*>=\s*4',
            'role.role_rank >= 3'

    Write-Utf8NoBom `
        -Path $AssessmentPath `
        -Content $AssessmentText

    Write-Host "Assessment management gate => rank 3+" -ForegroundColor Green
}
else {
    Write-Host "Assessment action file not found. Skipping assessment migration." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "RBAC SERVER GATES APPLIED" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Role model:" -ForegroundColor Yellow
Write-Host "  User         (1)  - no admin access"
Write-Host "  Admin        (2)  - view users/curriculum only"
Write-Host "  Super Admin  (3)  - manage users/Admins and curriculum"
Write-Host "  Master Admin (4+) - full authority + publishing"
Write-Host ""
Write-Host "Next commands:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Set-Location `"$Root`""
Write-Host ""
Write-Host "  git diff -- ."
Write-Host ""
Write-Host "  npx tsc --noEmit"
Write-Host ""
Write-Host "  npm run build"
Write-Host ""
Write-Host "NOTE:" -ForegroundColor Yellow
Write-Host "  Rank-2 server mutations are blocked after this migration."
Write-Host "  UI buttons/forms for rank 2 will be hidden in the next UI-gating pass."
Write-Host ""
