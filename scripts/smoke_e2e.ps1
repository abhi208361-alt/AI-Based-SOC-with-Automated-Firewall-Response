$ErrorActionPreference = "Stop"

Write-Host "== API smoke E2E starting =="

$base = "http://127.0.0.1:8000"
$user = "admin"
$pass = "admin123"
$form = "username=$([uri]::EscapeDataString($user))&password=$([uri]::EscapeDataString($pass))"

# Load OpenAPI and find login-like endpoint
$openapi = Invoke-RestMethod -Method Get -Uri "$base/openapi.json"

$allPaths = @($openapi.paths.PSObject.Properties.Name)

# Prefer explicit login/token endpoints
$candidates = $allPaths | Where-Object {
  $_ -match "(?i)(login|token|signin|auth)"
}

if (-not $candidates -or $candidates.Count -eq 0) {
  throw "No auth-like paths found in OpenAPI."
}

# Keep only paths that support POST
$postCandidates = @()
foreach ($p in $candidates) {
  $pathObj = $openapi.paths.$p
  if ($pathObj.PSObject.Properties.Name -contains "post") {
    $postCandidates += $p
  }
}

if (-not $postCandidates -or $postCandidates.Count -eq 0) {
  throw "Auth-like paths found, but none support POST. Candidates: $($candidates -join ', ')"
}

Write-Host "Discovered auth POST candidates: $($postCandidates -join ', ')"

$login = $null
$usedPath = $null

foreach ($p in $postCandidates) {
  try {
    Write-Host "Trying login endpoint: $p"
    $login = Invoke-RestMethod -Method Post `
      -Uri "$base$p" `
      -ContentType "application/x-www-form-urlencoded" `
      -Body $form

    if ($login) {
      $usedPath = $p
      break
    }
  } catch {
    Write-Host "Login failed at $p : $($_.Exception.Message)"
  }
}

if (-not $login) {
  throw "Unable to login using discovered auth endpoints: $($postCandidates -join ', ')"
}

$token = $login.access_token
if (-not $token) {
  # Some APIs return token in different keys
  $token = $login.token
}
if (-not $token) {
  throw "Login succeeded at $usedPath but response has no access token field."
}

$headers = @{ Authorization = "Bearer $token" }

Write-Host "Auth OK via $usedPath"

Invoke-RestMethod -Method Get -Uri "$base/docs" | Out-Null
Write-Host "Docs endpoint OK"

Write-Host "== API smoke E2E passed =="