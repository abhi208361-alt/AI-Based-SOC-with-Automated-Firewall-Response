$ErrorActionPreference = "Stop"

Write-Host "== API smoke E2E starting =="

$base = "http://127.0.0.1:8000"
$user = "admin"
$pass = "admin123"

$form = "username=$([uri]::EscapeDataString($user))&password=$([uri]::EscapeDataString($pass))"

$login = Invoke-RestMethod -Method Post `
  -Uri "$base/auth/login" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $form

$token = $login.access_token
if (-not $token) {
  throw "Login succeeded but no access_token in response."
}

$headers = @{ Authorization = "Bearer $token" }

Write-Host "Auth OK"

# Basic smoke checks
Invoke-RestMethod -Method Get -Uri "$base/docs" | Out-Null
Write-Host "Docs endpoint OK"

Write-Host "== API smoke E2E passed =="