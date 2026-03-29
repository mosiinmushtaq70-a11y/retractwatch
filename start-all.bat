@echo off
REM Launches two terminals: Convex backend, then Next.js frontend.
REM Place this file in Talos\web (same folder as package.json).
REM Change the port below if you do not use 3011.

set "WEB_ROOT=%~dp0"
set "NEXT_PORT=3011"

start "Talos — Convex (backend)" /D "%WEB_ROOT%" cmd /k npm run convex
timeout /t 2 /nobreak >nul
start "Talos — Next.js (frontend)" /D "%WEB_ROOT%" cmd /k npm run dev -- -p %NEXT_PORT%

echo Started Convex and Next.js in separate windows.
