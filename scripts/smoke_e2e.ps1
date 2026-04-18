$ErrorActionPreference = "Stop"

Write-Host "== API smoke E2E starting ==" -ForegroundColor Cyan

# 1) Login
$body = @{ email = "admin@soc.com"; password = "Admin@123" } | ConvertTo-Json
$login = Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body $body

if (-not $login.access_token) {
  throw "Login failed: access_token missing"
}
$headers = @{ Authorization = "Bearer $($login.access_token)" }
Write-Host "Login OK" -ForegroundColor Green

# 2) Create attack
$attackBody = @{
  source_ip      = "185.22.17.50"
  destination_ip = "10.0.0.50"
  attack_type    = "SQL Injection"
  severity       = "high"
  timestamp      = (Get-Date).ToUniversalTime().ToString("o")
  raw_message    = "UNION SELECT username,password FROM users"
} | ConvertTo-Json

$attack = Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/attacks" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $attackBody

if (-not $attack.id) {
  throw "Attack creation failed: id missing"
}
Write-Host "Attack created: $($attack.id)" -ForegroundColor Green

# 3) Generate report
$jobReq = @{ attack_id = "$($attack.id)" } | ConvertTo-Json
$job = Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/reports/generate" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $jobReq

if (-not $job.job_id) {
  throw "Report job creation failed: job_id missing"
}
Write-Host "Report job created: $($job.job_id)" -ForegroundColor Green

# 4) Fetch status
$status = Invoke-RestMethod `
  -Method Get `
  -Uri ("http://127.0.0.1:8000/api/v1/reports/jobs/" + $job.job_id) `
  -Headers $headers

Write-Host "Final job status: $($status.status)" -ForegroundColor Yellow
$status | ConvertTo-Json -Depth 8

if ($status.status -ne "done") {
  throw "Smoke test failed: expected status=done, got $($status.status)"
}

Write-Host "== API smoke E2E PASSED ==" -ForegroundColor Green