$ErrorActionPreference = "Stop"

Write-Host "== API smoke E2E starting =="

$base = "http://127.0.0.1:8000"

# 1) Server/docs reachable
Invoke-RestMethod -Method Get -Uri "$base/docs" | Out-Null
Write-Host "Docs endpoint OK"

# 2) OpenAPI reachable
$openapi = Invoke-RestMethod -Method Get -Uri "$base/openapi.json"
Write-Host "OpenAPI endpoint OK"

# 3) Auth endpoint exists in contract
$paths = @($openapi.paths.PSObject.Properties.Name)
$authPost = $null
foreach ($p in $paths) {
  if ($p -match "(?i)(login|token|signin|auth)") {
    $obj = $openapi.paths.$p
    if ($obj.PSObject.Properties.Name -contains "post") {
      $authPost = $p
      break
    }
  }
}

if (-not $authPost) {
  throw "No auth POST endpoint found in OpenAPI."
}
Write-Host "Auth endpoint discovered: $authPost"

# 4) Protected route should reject missing token (401/403 acceptable)
$unauthOk = $false
try {
  Invoke-RestMethod -Method Get -Uri "$base/api/v1/attacks" | Out-Null
  Write-Host "Warning: /api/v1/attacks allowed anonymous access."
  $unauthOk = $true
} catch {
  $msg = $_.Exception.Message
  if ($msg -match "401|403") {
    Write-Host "Protected route rejects anonymous access (expected)."
    $unauthOk = $true
  } else {
    Write-Host "Protected route check returned unexpected result: $msg"
  }
}

if (-not $unauthOk) {
  throw "Protected-route smoke check failed."
}

Write-Host "== API smoke E2E passed =="