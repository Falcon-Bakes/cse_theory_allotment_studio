@echo off
cd /d %~dp0
echo Starting CSE Theory Allotment Studio V1.3 Local Stable...
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not available in PATH.
  echo Please install Node.js LTS and run this file again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing dependencies. Please wait...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)
echo Opening browser...
start http://localhost:3000/login
echo Server is starting. Keep this window open while using the app.
call npm run dev
pause
