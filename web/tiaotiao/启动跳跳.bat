@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo 未找到 Node.js。请先安装 Node.js 18 或更新版本。
  pause
  exit /b 1
)

if not exist .env (
  copy .env.example .env >nul
  echo 已创建 .env，请编辑并填入聊天和音乐 API 密钥。
)

echo 正在启动跳跳服务……
echo 浏览器访问：http://127.0.0.1:4173/
echo 按 Ctrl+C 可停止服务。
node server.mjs
pause
