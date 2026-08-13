@echo off
rem Chay toan bo dev environment: backend (tu dong restart) + Expo dev server.
rem Dien thoai & may cung WiFi la ket noi duoc ngay, khong can sua gi.
title Heritage Buddy Dev
echo.
echo ============================================
echo  [Heritage Buddy] Bat backend + Expo dev server
echo  - Server: http://localhost:3000
echo  - Dien thoai cung WiFi se tu tim server qua IP cua may nay
echo  - USB khong cung WiFi: chay "adb reverse tcp:3000 tcp:3000"
echo ============================================
echo.

start "Heritage Buddy Backend" cmd /c call "%~dp0start-server.cmd"

cd /d "%~dp0.."
npx expo start