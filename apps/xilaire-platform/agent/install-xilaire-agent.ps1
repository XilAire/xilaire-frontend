<#
.SYNOPSIS
  XilAire Agent Bootstrap Installer

.DESCRIPTION
  This script bootstraps a XilAire endpoint by:
    - Accepting a secure enrollment token
    - Collecting device identity
    - Generating a stable device fingerprint
    - Registering the endpoint with XilAire Platform
    - Sending an initial heartbeat
    - Installing the XilAire Agent Windows Service
    - Sending CPU / Memory / Disk telemetry

  No enrollment token is persisted locally.
  Only the endpoint_id is stored for service operation.
  This script is safe to re-run.

.PARAMETER EnrollmentToken
  One-time enrollment token generated from XilAire admin portal.

.EXAMPLE
  .\install-xilaire-agent.ps1 -EnrollmentToken "xil_abc123..."

.NOTES
  This script must be run as Administrator.
#>

param (
  [Parameter(Mandatory = $true)]
  [string]$EnrollmentToken
)

# --------------------------------------------------
# 🔒 SAFETY CHECKS
# --------------------------------------------------
if (-not ([Security.Principal.WindowsPrincipal] `
  [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error "This installer must be run as Administrator."
  exit 1
}

if (-not $EnrollmentToken.StartsWith("xil_")) {
  Write-Error "Invalid enrollment token format."
  exit 1
}

# --------------------------------------------------
# 🖥️ COLLECT DEVICE IDENTITY
# --------------------------------------------------
$hostname = $env:COMPUTERNAME

$osInfo = Get-CimInstance Win32_OperatingSystem
$os = $osInfo.Caption
$osVersion = $osInfo.Version

$machineGuid = (Get-ItemProperty `
  "HKLM:\SOFTWARE\Microsoft\Cryptography"
).MachineGuid

# --------------------------------------------------
# 🔐 GENERATE DEVICE FINGERPRINT
# --------------------------------------------------
$rawFingerprint = "$hostname|$machineGuid|$osVersion"

$sha256 = [System.Security.Cryptography.SHA256]::Create()
$bytes = [System.Text.Encoding]::UTF8.GetBytes($rawFingerprint)
$fingerprintBytes = $sha256.ComputeHash($bytes)
$fingerprint = [BitConverter]::ToString($fingerprintBytes).Replace("-", "").ToLower()

# --------------------------------------------------
# 🌐 PLATFORM CONFIG
# --------------------------------------------------
$ApiBaseUrl = "https://platform.xilairetechnologies.com"
$RegisterEndpoint  = "$ApiBaseUrl/api/agent/register"
$HeartbeatEndpoint = "$ApiBaseUrl/api/agent/heartbeat"
$TelemetryEndpoint = "$ApiBaseUrl/api/agent/telemetry"

# --------------------------------------------------
# 📦 BUILD REGISTRATION PAYLOAD (UNCHANGED)
# --------------------------------------------------
$registrationPayload = @{
  token = $EnrollmentToken
  hostname = $hostname
  os = $os
  os_version = $osVersion
  agent_version = "0.1.0"
} | ConvertTo-Json -Depth 4

# --------------------------------------------------
# 🚀 REGISTER AGENT
# --------------------------------------------------
Write-Host "`nXilAire Agent Bootstrap"
Write-Host "----------------------"
Write-Host "Hostname    : $hostname"
Write-Host "OS          : $os ($osVersion)"
Write-Host "Fingerprint : $fingerprint"
Write-Host ""

try {
  $response = Invoke-RestMethod `
    -Method POST `
    -Uri $RegisterEndpoint `
    -Body $registrationPayload `
    -ContentType "application/json" `
    -TimeoutSec 15

  $EndpointId = $response.endpoint_id

  Write-Host "✅ Registration successful" -ForegroundColor Green
  Write-Host "Endpoint ID : $EndpointId"
  Write-Host "Heartbeat   : $($response.heartbeat_interval_seconds)s"

} catch {
  Write-Error "❌ Registration failed"
  Write-Error $_.Exception.Message
  exit 1
}

# --------------------------------------------------
# 🫀 HEARTBEAT FUNCTION
# --------------------------------------------------
function Send-XilAireHeartbeat {
  param (
    [Parameter(Mandatory = $true)]
    [string]$EndpointId
  )

  $heartbeatPayload = @{
    endpoint_id = $EndpointId
  } | ConvertTo-Json

  try {
    Invoke-RestMethod `
      -Method POST `
      -Uri $HeartbeatEndpoint `
      -Body $heartbeatPayload `
      -ContentType "application/json" `
      -TimeoutSec 10

    Write-Host "🫀 Heartbeat sent successfully" -ForegroundColor Cyan
  } catch {
    Write-Warning "⚠️ Heartbeat failed: $($_.Exception.Message)"
  }
}

# --------------------------------------------------
# 📊 TELEMETRY FUNCTION
# --------------------------------------------------
function Send-XilAireTelemetry {
  param (
    [Parameter(Mandatory = $true)]
    [string]$EndpointId
  )

  $cpuPct = (Get-CimInstance Win32_Processor |
    Measure-Object -Property LoadPercentage -Average).Average

  $memTotal = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory
  $memFree  = (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory * 1KB
  $memoryPct = [math]::Round((($memTotal - $memFree) / $memTotal) * 100, 2)

  $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
  $diskPct = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)

  $telemetryPayload = @{
    endpoint_id = $EndpointId
    cpu_pct     = $cpuPct
    memory_pct  = $memoryPct
    disk_pct    = $diskPct
  } | ConvertTo-Json

  try {
    Invoke-RestMethod `
      -Method POST `
      -Uri $TelemetryEndpoint `
      -Body $telemetryPayload `
      -ContentType "application/json" `
      -TimeoutSec 10

    Write-Host "📊 Telemetry sent successfully" -ForegroundColor Cyan
  } catch {
    Write-Warning "⚠️ Telemetry failed: $($_.Exception.Message)"
  }
}

# --------------------------------------------------
# 🫀 SEND INITIAL HEARTBEAT + TELEMETRY
# --------------------------------------------------
Send-XilAireHeartbeat -EndpointId $EndpointId
Send-XilAireTelemetry -EndpointId $EndpointId

# --------------------------------------------------
# 🧩 INSTALL WINDOWS SERVICE
# --------------------------------------------------
$InstallDir = "C:\ProgramData\XilAire\Agent"
$ServiceName = "XilAireAgent"
$ServiceScriptPath = "$InstallDir\xilaire-agent-service.ps1"

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null

@"
param(
  [string]`$EndpointId
)

`$ApiBaseUrl = "$ApiBaseUrl"
`$HeartbeatEndpoint = "`$ApiBaseUrl/api/agent/heartbeat"
`$TelemetryEndpoint = "`$ApiBaseUrl/api/agent/telemetry"
`$IntervalSeconds = 60

while (`$true) {
  try {
    Invoke-RestMethod -Method POST -Uri `$HeartbeatEndpoint `
      -Body (@{ endpoint_id = `$EndpointId } | ConvertTo-Json) `
      -ContentType "application/json"

    `$cpu = (Get-CimInstance Win32_Processor |
      Measure-Object -Property LoadPercentage -Average).Average

    `$memTotal = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory
    `$memFree  = (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory * 1KB
    `$memPct   = [math]::Round(((`$memTotal - `$memFree) / `$memTotal) * 100, 2)

    `$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
    `$diskPct = [math]::Round(((`$disk.Size - `$disk.FreeSpace) / `$disk.Size) * 100, 2)

    Invoke-RestMethod -Method POST -Uri `$TelemetryEndpoint `
      -Body (@{
        endpoint_id = `$EndpointId
        cpu_pct     = `$cpu
        memory_pct  = `$memPct
        disk_pct    = `$diskPct
      } | ConvertTo-Json) `
      -ContentType "application/json"

  } catch {
    # silent failure; retry next loop
  }

  Start-Sleep -Seconds `$IntervalSeconds
}
"@ | Set-Content -Path $ServiceScriptPath -Encoding UTF8

if (-not (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue)) {
  sc.exe create $ServiceName `
    binPath= "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$ServiceScriptPath`" -EndpointId $EndpointId" `
    start= auto `
    DisplayName= "XilAire Agent"
}

Start-Service $ServiceName

Write-Host "`n✅ XilAire Agent service installed and running"
Write-Host "Bootstrap complete. Endpoint heartbeating with telemetry."
