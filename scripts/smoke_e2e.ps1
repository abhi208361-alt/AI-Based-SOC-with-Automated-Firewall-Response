$ErrorActionPreference = "Stop"

Write-Host "== API smoke E2E starting =="

$base = "http://127.0.0.1:8000"
$email = "admin@example.com"
$pass = "admin123"

$openapi = Invoke-RestMethod -Method Get -Uri "$base/openapi.json"
$allPaths = @($openapi.paths.PSObject.Properties.Name)

$postCandidates = @()
foreach ($p in $allPaths) {
  if ($p -match "(?i)(login|token|signin|auth)") {
    $pathObj = $openapi.paths.$p
    if ($pathObj.PSObject.Properties.Name -contains "post") {
      $postCandidates += $p
    }
  }
}
if (-not $postCandidates -or $postCandidates.Count -eq 0) {
  throw "No auth POST path found in OpenAPI."
}

Write-Host "Discovered auth POST candidates: $($postCandidates -join ', ')"

$login = $null
$usedPath = $null

# Your endpoint expects JSON with email+password
$bodyJson = @{
  email    = $email
  password = $pass
} | ConvertTo-Json -Depth 5

foreach ($p in $postCandidates) {
  try {
    Write-Host "Trying login endpoint: $p"
    $login = Invoke-RestMethod -Method Post `
      -Uri "$base$p" `
      -ContentType "application/json" `
      -Body $bodyJson
    if ($login) {
      $usedPath = $p
      break
    }
  } catch {
    Write-Host "Login failed at $p : $($_.Exception.Message)"
  }
}

if (-not $login) {
  throw "Unable to login using email/password on discovered auth endpoints."
}

$token = $login.access_token
if (-not $token) { $token = $login.token }
if (-not $token) { $token = $login.jwt }
if (-not $token) {
  throw "Login succeeded at $usedPath but no token field found."
}

Write-Host "Auth OK via $usedPath"

Invoke-RestMethod -Method Get -Uri "$base/docs" | Out-Null
Write-Host "Docs endpoint OK"

Write-Host "== API smoke E2E passed =="