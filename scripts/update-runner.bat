@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "MANIFEST=%~1"
set "INSTALL_ROOT=%~2"
set "PANEL_PID=%~3"
set "NODE_EXE=%~4"
set "UPDATE_ROOT=%INSTALL_ROOT%\.updates"
set "LOG_FILE=%UPDATE_ROOT%\update.log"
set "HELPER=%INSTALL_ROOT%\scripts\update-helper.js"

if not exist "%UPDATE_ROOT%" mkdir "%UPDATE_ROOT%"
title Dave Arma Admin Panel - Update in progress

call :log ============================================================
call :log Visible update runner started. Batch PID is not reused.
call :log Install root: %INSTALL_ROOT%
call :log Panel PID to stop: %PANEL_PID%
call :log Manifest: %MANIFEST%

if not exist "%MANIFEST%" (call :fail Manifest file not found & exit /b 1)
if not exist "%NODE_EXE%" (call :fail Node executable not found & exit /b 1)
if not exist "%HELPER%" (call :fail Node update helper not found & exit /b 1)

call :log Requesting forced termination of panel PID %PANEL_PID%
taskkill /PID %PANEL_PID% /F >> "%LOG_FILE%" 2>&1
call :log Waiting for panel PID %PANEL_PID% to terminate...
powershell.exe -NoProfile -NonInteractive -Command "$p=Get-Process -Id %PANEL_PID% -ErrorAction SilentlyContinue; if($p){try{Wait-Process -Id %PANEL_PID% -Timeout 15 -ErrorAction Stop}catch{} }; if(Get-Process -Id %PANEL_PID% -ErrorAction SilentlyContinue){exit 1}else{exit 0}"
if errorlevel 1 (call :fail Panel PID is still running after 15 seconds & exit /b 1)

call :log VERIFIED: panel PID %PANEL_PID% is no longer running
call :log Starting package verification, backup, extraction and npm ci
"%NODE_EXE%" "%HELPER%" --manifest "%MANIFEST%" --root "%INSTALL_ROOT%" --pid "%PANEL_PID%" --skip-stop true --no-restart true
if errorlevel 1 (call :fail Node update helper failed. Review the log and rollback messages & exit /b 1)

call :log Update files installed successfully
call :log Starting portal with npm start in a new visible window
start "Dave Arma Admin Panel" /D "%INSTALL_ROOT%" cmd.exe /k npm start
if errorlevel 1 (call :fail Unable to launch npm start & exit /b 1)

call :log npm start launch command accepted
call :log Update runner completed successfully
timeout /t 5 /nobreak >nul
exit /b 0

:log
echo [%date% %time%] %*
echo [%date% %time%] %*>> "%LOG_FILE%"
exit /b 0

:fail
call :log FAILED: %*
echo.
echo Aggiornamento fallito. Controllare:
echo %LOG_FILE%
echo.
pause
exit /b 1
