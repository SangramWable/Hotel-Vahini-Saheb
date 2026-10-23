@echo off
title Hotel Vahinisaheb - Backend Server
echo ========================================================
echo  Hotel Vahinisaheb - Starting Node.js & MongoDB Server
echo ========================================================
echo  Backend URL: http://localhost:5000
echo  Website:     http://localhost:5000/index.html
echo  Admin Login: http://localhost:5000/admin-login.html
echo ========================================================
cd /d "%~dp0backend"
node server.js
pause
