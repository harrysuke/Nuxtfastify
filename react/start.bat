@echo off
cd /d "C:\Users\jpbuser\Documents\Nodejs\Nuxt"
set "CORS_ORIGIN=http://localhost:5173"
npx concurrently -n backend,react -c cyan,magenta ^
  "npm --prefix backend run dev" ^
  "npm --prefix ..\react run dev"
pause
