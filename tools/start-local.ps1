$ErrorActionPreference = 'Stop'
$careerRoot = Split-Path -Parent $PSScriptRoot
$careerTools = Join-Path (Split-Path -Parent $careerRoot) '开发支持\数据库工具'
$careerRuntime = Join-Path $env:WINDIR 'Temp\careermatch-flow-20261011'
$careerEvidence = Join-Path $careerRoot '.verification'
New-Item -ItemType Directory -Path $careerEvidence -Force | Out-Null
$careerNode = (Get-Command node -ErrorAction Stop).Source
function Test-CareerPort([int]$Port) {
  $careerClient = New-Object System.Net.Sockets.TcpClient
  try { $careerTask = $careerClient.ConnectAsync('127.0.0.1', $Port); return ($careerTask.Wait(500) -and $careerClient.Connected) }
  catch { return $false }
  finally { $careerClient.Dispose() }
}
if (-not (Test-CareerPort 55437)) {
  if (-not (Test-Path -LiteralPath (Join-Path $careerTools 'node_modules\embedded-postgres'))) { throw 'Local database tools missing. See START-HERE.md.' }
  New-Item -ItemType Directory -Path $careerRuntime -Force | Out-Null
  if (-not (Test-Path -LiteralPath (Join-Path $careerRuntime 'node_modules\embedded-postgres'))) { Copy-Item -LiteralPath (Join-Path $careerTools 'node_modules') -Destination $careerRuntime -Recurse -Force }
  Copy-Item -LiteralPath (Join-Path $careerTools 'run-db-tests.mjs') -Destination $careerRuntime -Force
  $careerDbArgs = @(('"' + (Join-Path $careerRuntime 'run-db-tests.mjs') + '"'), '--app-root', ('"' + $careerRoot + '"'), '--serve')
  $careerDbProcess = Start-Process -FilePath $careerNode -ArgumentList $careerDbArgs -WorkingDirectory $careerRuntime -WindowStyle Hidden -RedirectStandardOutput (Join-Path $careerEvidence 'local-db.log') -RedirectStandardError (Join-Path $careerEvidence 'local-db-error.log') -PassThru
  for ($careerAttempt = 0; $careerAttempt -lt 30; $careerAttempt++) { if (Test-CareerPort 55437) { break }; Start-Sleep -Milliseconds 500 }
  if (-not (Test-CareerPort 55437)) { throw 'Local PostgreSQL did not start. Check .verification/local-db-error.log.' }
}
if (-not (Test-CareerPort 4317)) {
  $env:PORT = '4317'
  $careerAppProcess = Start-Process -FilePath $careerNode -ArgumentList '--import','tsx','server.ts' -WorkingDirectory $careerRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $careerEvidence 'local-app.log') -RedirectStandardError (Join-Path $careerEvidence 'local-app-error.log') -PassThru
  for ($careerAttempt = 0; $careerAttempt -lt 30; $careerAttempt++) { if (Test-CareerPort 4317) { break }; Start-Sleep -Milliseconds 500 }
  if (-not (Test-CareerPort 4317)) { throw 'CareerMatch did not start. Check .verification/local-app-error.log.' }
}
$careerHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:4317/api/health'
if ($careerHealth.status -ne 'ok' -or $careerHealth.service -ne 'careermatch') { throw 'Unexpected service on port 4317. No other process was stopped.' }
Write-Output 'CareerMatch is ready: http://localhost:4317'
Write-Output 'AI keys are configured in .env. No fixture AI runs in this local app.'
