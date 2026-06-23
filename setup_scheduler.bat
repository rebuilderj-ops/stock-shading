@echo off
echo ====================================================
echo  Stock Briefing Windows Task Scheduler Auto Setup
echo ====================================================
echo.
echo Installing task schedulers...
echo Please make sure you ran this script as Administrator (Right click - Run as administrator).
echo.

:: Check Admin Rights
openfiles >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No administrator rights. 
    echo Please right click this file and select 'Run as administrator'.
    echo.
    pause
    exit /b
)

set "WORK_DIR=C:\Users\metu9\OneDrive\Desktop\JM"

echo.
echo 1. Registering KR Evening Briefing (Daily at 9:00 PM)...
schtasks /create /f /tn "Stock_KR_Evening_Briefing" /tr "%WORK_DIR%\run_shadowing.bat" /sc daily /st 21:00
if %errorlevel% equ 0 (
    echo [SUCCESS] Evening briefing task registered.
) else (
    echo [FAIL] Failed to register evening briefing task.
)

echo.
echo 2. Registering US Morning Briefing (On Logon with 5 min delay)...
schtasks /create /f /tn "Stock_US_Morning_Briefing" /tr "%WORK_DIR%\run_us_update.bat" /sc onlogon /delay 0005:00
if %errorlevel% equ 0 (
    echo [SUCCESS] Morning briefing task registered (5 min delay after logon).
) else (
    echo [FAIL] Failed to register morning briefing task.
)

echo.
echo ====================================================
echo  Scheduler Setup Completed!
echo ====================================================
pause
exit
