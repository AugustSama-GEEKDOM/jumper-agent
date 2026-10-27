@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-tiaotiao-web-simulator.ps1"
if errorlevel 1 pause
