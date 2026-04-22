$ErrorActionPreference = "Stop"

Write-Host "== API smoke E2E starting =="

$base = "http://127.0.0.1:8000"
$user = "admin"
$pass = "admin123"

$form = "username=$([uri]::EscapeDataString($user))&password=$([uri]::EscapeDataString($pass))"

$loginPaths = @(
  "/auth/login",
  "/login",
  "/api/auth/login"
)

$login = $null
foreach ($p in $loginPaths) {
  try {
    Write-Host "Trying login endpoint: $p"
    $login = Invoke-RestMethod -Method Post `
      -Uri "$base$p" `
      -ContentType "application/x-www-form-urlencoded" `
      -Body $form
    if ($login) {
      Write-Host "Login succeeded at $p"
      break
    }
  } catch {
    Write-Host "Login failed at $p : $($_.Exception.Message)"
  }
}

if (-not $login) {
  throw "Unable to login on known endpoints: $($loginPaths -join ', ')"
}

$token = $login.access_token
if (-not $token) {
  throw "Login response has no access_token."
}

$headers = @{ Authorization = "Bearer $token" }

Write-Host "Auth OK"

Invoke-RestMethod -Method Get -Uri "$base/docs" | Out-Null
Write-Host "Docs endpoint OK"

Write-Host "== API smoke E2E passed =="