@echo off
setlocal
cd /d "%~dp0"
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Richiesta autorizzazione Amministratore...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell.exe -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%~dp0scripts\install-windows.ps1""'"
  exit /b
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-windows.ps1"
if %errorlevel% neq 0 (
  echo.
  echo Installazione non completata. Leggi l'errore sopra.
  pause
  exit /b 1
)
echo.
pause
