$ErrorActionPreference = "Stop"

Write-Host "== API smoke E2E starting =="

$baseUrl = "http://127.0.0.1:8000/api/v1"

# 1) Login
$loginBody = @{
  email    = "admin@soc.com"
  password = "Admin@123"
} | ConvertTo-Json

$login = Invoke-RestMethod -Method Post `
  -Uri "$baseUrl/auth/login" `
  -ContentType "application/json" `
  -Body $loginBody

if (-not $login.access_token) {
  throw "Login failed: access_token not found."
}

$headers = @{
  Authorization = "Bearer $($login.access_token)"
}

Write-Host "Login OK"

# 2) Create attack
$attackBody = @{
  source_ip      = "10.0.0.5"
  destination_ip = "10.0.0.10"
  attack_type    = "Brute Force"
  severity       = "high"
  timestamp      = "2026-04-19T10:00:00Z"
  raw_message    = "failed logins spike"
} | ConvertTo-Json

$attack = Invoke-RestMethod -Method Post `
  -Uri "$baseUrl/attacks" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $attackBody

$attackId = if ($attack.id) { $attack.id } else { $attack._id }
if (-not $attackId) {
  throw "Create attack failed: neither 'id' nor '_id' found in response."
}

Write-Host "Attack created: $attackId"

# 3) Generate report (expects incident_id)
$reportBody = @{
  incident_id = $attackId
} | ConvertTo-Json

$job = Invoke-RestMethod -Method Post `
  -Uri "$baseUrl/reports/generate" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $reportBody

Write-Host "Report generation response:"
$job | ConvertTo-Json -Depth 8 | Write-Host

Write-Host "== API smoke E2E completed successfully =="