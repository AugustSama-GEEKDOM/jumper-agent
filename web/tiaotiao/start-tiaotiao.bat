@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 18 or newer first.
  pause
  exit /b 1
)

if not exist .env (
  copy .env.example .env >nul
  echo Created .env. Add your chat and music API keys before using the assistant.
)

echo Starting Tiaotiao...
echo Open http://127.0.0.1:4183/ in Microsoft Edge.
echo Press Ctrl+C to stop the service.
node server.mjs
pause
