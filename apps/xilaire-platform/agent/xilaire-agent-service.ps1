<#
.SYNOPSIS
  XilAire Agent Windows Service

.DESCRIPTION
  Runs as a Windows service and sends periodic heartbeats
  to the XilAire Platform for a registered endpoint.

.NOTES
  Runs as LocalSystem
  No enrollment token required
#>

param (
  [Parameter(Mandatory = $true)]
  [string]$EndpointId
)

$ApiBaseUrl = "https://platform.xilairetechnologies.com"
$HeartbeatEndpoint = "$ApiBaseUrl/api/agent/heartbeat"
$HeartbeatIntervalSeconds = 60

Write-EventLog `
  -LogName Application `
  -Source "XilAireAgent" `
  -EntryType Information `
  -EventId 1000 `
  -Message "XilAire Agent Service started for endpoint $EndpointId"

while ($true) {
  try {
    $payload = @{
      endpoint_id = $EndpointId
    } | ConvertTo-Json

    Invoke-RestMethod `
      -Method POST `
      -Uri $HeartbeatEndpoint `
      -Body $payload `
      -ContentType "application/json" `
      -TimeoutSec 10

  } catch {
    Write-EventLog `
      -LogName Application `
      -Source "XilAireAgent" `
      -EntryType Warning `
      -EventId 1001 `
      -Message "Heartbeat failed: $($_.Exception.Message)"
  }

  Start-Sleep -Seconds $HeartbeatIntervalSeconds
}
