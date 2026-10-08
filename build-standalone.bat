@echo off
setlocal
cd /d "%~dp0"
echo.
echo FFmpeg Filter Builder
echo v1.2.1 - ST + MT standalone build
echo Runtime source: GitHub Release v1.10.2 (SHA-256 verified)
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\build-standalone.ps1" %*
if errorlevel 1 (
  echo.
  echo Build failed. Check the error above.
  pause
  exit /b 1
)
echo.
echo Build completed.
pause
