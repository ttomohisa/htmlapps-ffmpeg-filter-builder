@echo off
setlocal
cd /d "%~dp0"
if not exist ".\dist\index.html" (
  echo dist\index.html was not found. Building first...
  call ".\build-standalone.bat"
  if errorlevel 1 exit /b 1
)
start "" ".\dist\index.html"
