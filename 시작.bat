@echo off
chcp 65001 >nul
title GIT DASHBOARD SERVER
echo ========================================
echo   GIT DASHBOARD SERVER
echo ========================================
echo.
echo Server is starting. Please do not close this window...

rem Set Node.js path
set PATH=%~dp0runtime\node-v20.12.2-win-x64;%PATH%

rem Open browser
start cmd /c "ping localhost -n 3 >nul & start http://localhost:3000"

rem Start Node.js server
node server/index.js

echo.
echo Server stopped.
pause
