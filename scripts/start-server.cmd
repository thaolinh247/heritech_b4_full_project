@echo off
title Heritage Buddy Backend
rem Tu dong khoi dong lai server neu bi crash (tsx watch chi restart khi sua file).
cd /d "%~dp0..\server"

:restart
echo.
echo ============================================
echo  [Heritage Buddy] Dang khoi dong backend...
echo  Nhan Ctrl+C 2 lan de thoat han.
echo ============================================
echo.
npm run dev
echo.
echo [Heritage Buddy] Server dung lai ngoai y muon - khoi dong lai sau 3 giay...
timeout /t 3 /nobreak >nul
goto restart