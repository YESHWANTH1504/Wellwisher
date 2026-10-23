@echo off
echo ==============================================
echo   Starting WellWisher Backend & Port Forwarding
echo ==============================================

:: Forward port 3000 to connected Android devices via ADB
where adb >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [*] Setting up ADB reverse tunnel on port 3000...
    adb reverse tcp:3000 tcp:3000
) else (
    if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
        echo [*] Setting up ADB reverse tunnel on port 3000 via Android SDK...
        "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" reverse tcp:3000 tcp:3000
    )
)

echo [*] Starting Node.js backend server...
cd /d "%~dp0backend"
npm start
