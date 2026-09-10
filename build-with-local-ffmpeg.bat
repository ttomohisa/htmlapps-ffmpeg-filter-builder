@echo off
setlocal
cd /d "%~dp0"

if "%~1"=="" (
  echo Usage:
  echo   build-with-local-ffmpeg.bat ^<FFmpeg WASM Builder root^>
  echo.
  echo Example:
  echo   build-with-local-ffmpeg.bat C:\src\htmlapps-ffmpeg-wasm-builder
  exit /b 2
)

set "BUILDER_ROOT=%~f1"
set "ST_ROOT=%BUILDER_ROOT%\dist\ffmpeg-filter-builder\single-thread"
set "MT_ROOT=%BUILDER_ROOT%\dist\ffmpeg-filter-builder\multi-thread"

if not exist "%ST_ROOT%\manifest.json" (
  echo Single-thread runtime was not found:
  echo   %ST_ROOT%
  exit /b 1
)
if not exist "%MT_ROOT%\manifest.json" (
  echo Multi-thread runtime was not found:
  echo   %MT_ROOT%
  exit /b 1
)

echo.
echo FFmpeg Filter Builder
echo v1.0.0 - optional local Builder integration (default build uses GitHub Release)
echo Builder root: %BUILDER_ROOT%
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\build-standalone.ps1" -SingleThreadRuntimeRoot "%ST_ROOT%" -MultiThreadRuntimeRoot "%MT_ROOT%"
if errorlevel 1 (
  echo.
  echo Build failed. Check the error above.
  pause
  exit /b 1
)

echo.
echo Build completed.
pause
