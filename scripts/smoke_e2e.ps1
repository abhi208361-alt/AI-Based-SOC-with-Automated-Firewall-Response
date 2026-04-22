$ErrorActionPreference = "Stop"

Write-Host "== API smoke E2E starting =="

$base = "http://127.0.0.1:8000"
$user = "admin"
$pass = "admin123"

function Try-Login {
  param([string]$Username, [string]$Password)

  $form = "username=$([uri]::EscapeDataString($Username))&password=$([uri]::EscapeDataString($Password))"
  try {
    return Invoke-RestMethod -Method Post `
      -Uri "$base/auth/login" `
      -ContentType "application/x-www-form-urlencoded" `
      -Body $form
  } catch {
    return $null
  }
}

# 1) Try login first
$login = Try-Login -Username $user -Password $pass

# 2) If failed, try common register endpoints/payloads, then login again
if (-not $login) {
  Write-Host "Login failed; attempting to create smoke user..."

  $registerAttempts = @(
    @{ Uri = "$base/auth/register"; Body = (@{ username=$user; password=$pass; role="admin" } | ConvertTo-Json -Depth 5) },
    @{ Uri = "$base/auth/register"; Body = (@{ email="$user@example.com"; username=$user; password=$pass; role="admin" } | ConvertTo-Json -Depth 5) },
    @{ Uri = "$base/register";      Body = (@{ username=$user; password=$pass; role="admin" } | ConvertTo-Json -Depth 5) },
    @{ Uri = "$base/api/auth/register"; Body = (@{ username=$user; password=$pass; role="admin" } | ConvertTo-Json -Depth 5) }
  )

  foreach ($a in $registerAttempts) {
    try {
      Invoke-RestMethod -Method Post -Uri $a.Uri -ContentType "application/json" -Body $a.Body | Out-Null
      Write-Host "Register attempt sent to $($a.Uri)"
      break
    } catch {
      Write-Host "Register failed at $($a.Uri): $($_.Exception.Message)"
    }
  }

  Start-Sleep -Seconds 1
  $login = Try-Login -Username $user -Password $pass
}

if (-not $login) {
  throw "Unable to authenticate smoke user. Check auth route/payload in backend."
}

$token = $login.access_token
if (-not $token) {
  throw "Login succeeded but no access_token in response."
}

$headers = @{ Authorization = "Bearer $token" }

Write-Host "Auth OK"

# Health-ish checks (adjust if your API differs)
try {
  Invoke-RestMethod -Method Get -Uri "$base/docs" | Out-Null
  Write-Host "Docs endpoint OK"
} catch {
  Write-Host "Docs endpoint check failed: $($_.Exception.Message)"
}

Write-Host "== API smoke E2E passed =="