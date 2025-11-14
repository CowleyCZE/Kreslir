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

# Spustit uvicorn pøímo nebo pøes python -m uvicorn jako fallback
if (Get-Command uvicorn -ErrorAction SilentlyContinue) {
    $backend = Start-Process -FilePath "uvicorn" -ArgumentList "main:app --host 0.0.0.0 --port 8000 --reload" -WorkingDirectory (Get-Location) -PassThru
} else {
    $backend = Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" -WorkingDirectory (Get-Location) -PassThru
}

Set-Location ..\frontend
Write-Host "Spouštím frontend..."
if (-Not (Test-Path .\node_modules)) {
    npm install
}

# Spouštíme npm pøes cmd.exe, aby byla konzistentní cesta a chování
$npm = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev -- --host" -WorkingDirectory (Get-Location) -PassThru

Set-Location $scriptRoot\..

Write-Host "Backend PID: $($backend.Id), Frontend PID: $($npm.Id)"

try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    Write-Host "Zastavuji procesy..."
    if ($backend -ne $null -and -not $backend.HasExited) {
        try { Stop-Process -Id $backend.Id -Force } catch {}
    }
    if ($npm -ne $null -and -not $npm.HasExited) {
        try { Stop-Process -Id $npm.Id -Force } catch {}
    }
}