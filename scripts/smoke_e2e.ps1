$ErrorActionPreference = "Stop"

Write-Host "== API smoke E2E starting =="

$base = "http://127.0.0.1:8000"
$user = "admin"
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

function Try-LoginAgainstPath {
  param(
    [string]$Path,
    $PostOp
  )

  $contentTypes = @()
  if ($PostOp.requestBody -and $PostOp.requestBody.content) {
    $contentTypes = @($PostOp.requestBody.content.PSObject.Properties.Name)
  }

  if (-not $contentTypes -or $contentTypes.Count -eq 0) {
    # fallback tries
    $contentTypes = @("application/json", "application/x-www-form-urlencoded")
  }

  Write-Host "Path $Path content-types: $($contentTypes -join ', ')"

  foreach ($ct in $contentTypes) {
    # Try common field variants
    $bodies = @()

    if ($ct -eq "application/json") {
      $bodies += (@{ username=$user; password=$pass } | ConvertTo-Json -Depth 5)
      $bodies += (@{ email=$user; password=$pass } | ConvertTo-Json -Depth 5)
      $bodies += (@{ user=$user; password=$pass } | ConvertTo-Json -Depth 5)
      $bodies += (@{ login=$user; password=$pass } | ConvertTo-Json -Depth 5)
    } elseif ($ct -eq "application/x-www-form-urlencoded") {
      $bodies += "username=$([uri]::EscapeDataString($user))&password=$([uri]::EscapeDataString($pass))"
      $bodies += "email=$([uri]::EscapeDataString($user))&password=$([uri]::EscapeDataString($pass))"
    } else {
      continue
    }

    foreach ($body in $bodies) {
      try {
        Write-Host "Trying $Path with $ct and body: $body"
        $resp = Invoke-RestMethod -Method Post -Uri "$base$Path" -ContentType $ct -Body $body
        if ($resp) { return $resp }
      } catch {
        Write-Host "Failed ($Path, $ct): $($_.Exception.Message)"
      }
    }
  }

  return $null
}

$login = $null
$usedPath = $null

foreach ($p in $postCandidates) {
  $postOp = $openapi.paths.$p.post
  $login = Try-LoginAgainstPath -Path $p -PostOp $postOp
  if ($login) {
    $usedPath = $p
    break
  }
}

if (-not $login) {
  throw "Unable to login using discovered auth endpoints and payload variants."
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