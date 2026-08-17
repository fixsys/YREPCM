@echo off
chcp 65001 > nul
echo ==============================================
echo 🚀 開始執行 YRPM 系統更新流程...
echo ==============================================

echo.
echo [1/5] 正在從 Git 取得最新程式碼...
git pull

echo.
echo [2/5] 正在安裝與更新後端套件...
cd backend
call npm install
echo 正在編譯後端程式碼...
call npm run build

echo.
echo [3/5] 正在安全更新資料庫結構...
call npx prisma db push

echo.
echo [4/5] 正在安裝與更新前端套件...
cd ../frontend
call npm install
echo 正在編譯前端靜態網頁...
call npm run build

echo.
echo [5/5] 正在重新啟動伺服器...
cd ..
call pm2 restart yrpm-system

echo.
echo ==============================================
echo ✅ 更新完成！系統已重新啟動。
echo ==============================================
pause
