# start-dev.ps1 - spustí backend a frontend pro lokální vývoj (PowerShell)
Param()
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptRoot\..

Write-Host "Spouštím backend..."
Set-Location .\backend
if (Test-Path .\venv\Scripts\Activate.ps1) {
    Write-Host "Aktivuji virtuální prostøedí"
    . .\venv\Scripts\Activate.ps1
}
$backend = Start-Process -FilePath "uvicorn" -ArgumentList "main:app --host 0.0.0.0 --port 8000 --reload" -PassThru
Set-Location ..\frontend
Write-Host "Spouštím frontend..."
if (-Not (Test-Path .\node_modules)) {
    npm install
}
$npm = Start-Process -FilePath "npm" -ArgumentList "run dev -- --host" -PassThru
Set-Location $scriptRoot\..

Write-Host "Backend PID: $($backend.Id), Frontend PID: $($npm.Id)"

try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    Write-Host "Zastavuji procesy..."
    if ($backend -ne $null) { $backend.Kill() }
    if ($npm -ne $null) { $npm.Kill() }
}