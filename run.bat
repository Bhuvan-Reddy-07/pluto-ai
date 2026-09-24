@echo off
title PlutoAI - Autonomous Web Agent
echo ===================================================
echo     Launching PlutoAI Extension Runner
echo ===================================================

cd /d "%~dp0"

echo [1/2] Starting local playground test server on port 8080...
start /b python -m http.server 8080

timeout /t 2 /nobreak >nul

echo [2/2] Launching Google Chrome with PlutoAI Extension loaded...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --load-extension="%~dp0." "http://localhost:8080/tests/test-demo-page.html"

echo.
echo ===================================================
echo   PlutoAI is now RUNNING!
echo   - Playground URL: http://localhost:8080/tests/test-demo-page.html
echo   - AI Sidebar is docked on the right edge of your screen.
echo ===================================================
pause
