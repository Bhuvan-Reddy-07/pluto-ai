# PlutoAI - PowerShell Launcher
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "    Launching PlutoAI Extension Runner" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

Write-Host "[1/2] Starting local playground test server on port 8080..." -ForegroundColor Yellow
$serverJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    python -m http.server 8080
} -ArgumentList $ScriptDir

Start-Sleep -Seconds 2

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chromePath)) {
    $chromePath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
}

Write-Host "[2/2] Launching Google Chrome with PlutoAI Extension loaded..." -ForegroundColor Yellow
$extPath = (Resolve-Path .).Path
Start-Process $chromePath -ArgumentList "--load-extension=`"$extPath`"", "http://localhost:8080/tests/test-demo-page.html"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  PlutoAI is now RUNNING!" -ForegroundColor Green
Write-Host "  - Playground URL: http://localhost:8080/tests/test-demo-page.html" -ForegroundColor Green
Write-Host "  - AI Sidebar is docked on the right edge of your screen." -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
