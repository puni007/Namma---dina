@echo off
setlocal
cd /d "%~dp0"

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker Desktop was not found. Install and start Docker Desktop, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js and npm were not found. Install Node.js 20.19 or newer, then run this file again.
  pause
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Created .env from .env.example. Review the local secrets before continuing.
)

if not exist "node_modules\." (
  echo Installing project dependencies...
  call npm install
  if errorlevel 1 goto failed
)

echo Starting PostgreSQL...
call docker compose up -d db
if errorlevel 1 goto failed

echo Applying database migrations...
call npm run db:deploy
if errorlevel 1 goto failed

echo Starting the API and web client...
start "Namma Dina servers" /D "%CD%" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"
echo Namma Dina is opening at http://localhost:5173
echo Keep the Namma Dina servers window open while you use the app.
goto done

:failed
echo Startup failed. Read the message above, fix the issue, and run this file again.
pause

:done
endlocal
