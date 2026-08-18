@echo off
echo ==============================================
echo Starting YRPM System Update...
echo ==============================================

echo.
echo [1/5] Pulling latest code from Git...
git pull

echo.
echo [2/5] Updating Backend...
cd backend
call npm install
echo Building Backend...
call npm run build

echo.
echo [3/5] Updating Database Schema...
echo Stopping PM2 temporarily to release files...
call npx pm2 stop yrpm-system || call pm2 stop yrpm-system

cd backend
call npx prisma db push
call npx prisma generate
cd ..

echo.
echo [4/5] Updating Frontend...
cd ../frontend
call npm install
echo Building Frontend...
call npm run build

echo.
echo [5/5] Restarting Server (PM2)...
cd ..
call npx pm2 restart yrpm-system || call pm2 restart yrpm-system

echo.
echo ==============================================
echo Update Complete! System restarted.
echo ==============================================
pause
