@echo off
title Hotel Vahinisaheb - MongoDB Atlas Diagnostic Test
echo ========================================================
echo  Hotel Vahinisaheb - Testing MongoDB Atlas Connection
echo ========================================================
echo.
cd /d "%~dp0backend"
node test-db.js
echo.
pause
