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

rem Use the local Docker database for this launcher without changing .env.
set "DATABASE_URL=postgresql://namma:namma_local@localhost:5432/namma_dina?schema=public"
set "DATABASE_URL_UNPOOLED=postgresql://namma:namma_local@localhost:5432/namma_dina?schema=public"
set "CLIENT_ORIGIN=http://localhost:5155"

if not exist "node_modules\." (
  echo Installing project dependencies...
  call npm install
  if errorlevel 1 goto failed
)

echo Starting PostgreSQL...
call docker compose up -d db
if errorlevel 1 goto failed

echo Waiting for PostgreSQL to become ready...
set "DB_READY="
for /L %%i in (1,1,30) do call :waitForPostgres
if not defined DB_READY (
  echo PostgreSQL did not become ready within 60 seconds.
  goto failed
)

echo Applying database migrations...
call npm run db:deploy
if errorlevel 1 goto failed

echo Starting the API and web client...
start "Namma Dina servers" /D "%CD%" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
start "" "http://localhost:5155"
echo Namma Dina is opening at http://localhost:5155
echo Keep the Namma Dina servers window open while you use the app.
goto done

:waitForPostgres
if defined DB_READY exit /b 0
docker compose exec -T db pg_isready -U namma -d namma_dina >nul 2>nul
if not errorlevel 1 set "DB_READY=1"
if not defined DB_READY timeout /t 2 /nobreak >nul
exit /b 0

:failed
echo Startup failed. Read the message above, fix the issue, and run this file again.
pause

:done
endlocal
