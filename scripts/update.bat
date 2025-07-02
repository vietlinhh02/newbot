@echo off
setlocal enabledelayedexpansion

REM Bot Auto Update Script for Windows
REM Usage: scripts\update.bat [force]

echo 🤖 NewBot Auto Update Script (Windows)
echo =====================================

REM Check if force update
set FORCE_UPDATE=false
if "%1"=="force" (
    set FORCE_UPDATE=true
    echo ⚠️ Force update mode enabled
)

REM Check if git is available
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if npm is available  
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ NPM is not installed or not in PATH
    pause
    exit /b 1
)

REM Step 1: Check git status
echo 📋 Step 1: Checking git status...
git status --porcelain > temp_status.txt
set /p GIT_STATUS=<temp_status.txt
del temp_status.txt

if not "!GIT_STATUS!"=="" (
    echo ⚠️ You have uncommitted changes
    if "!FORCE_UPDATE!"=="true" (
        echo 💾 Stashing changes...
        git stash
        if errorlevel 1 (
            echo ❌ Failed to stash changes
            pause
            exit /b 1
        )
    ) else (
        echo ❌ Please commit your changes or use 'scripts\update.bat force'
        pause
        exit /b 1
    )
) else (
    echo ✅ Working directory is clean
)

REM Step 2: Pull from GitHub
echo 📥 Step 2: Pulling from GitHub...
git pull origin main
if errorlevel 1 (
    echo ❌ Failed to pull from GitHub
    pause
    exit /b 1
)
echo ✅ Successfully pulled from GitHub

REM Step 3: Install dependencies
echo 📦 Step 3: Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed

REM Step 4: Generate Prisma client
echo 🔧 Step 4: Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo ⚠️ Failed to generate Prisma client (continuing...)
) else (
    echo ✅ Prisma client generated
)

REM Step 5: Restart bot (if using PM2)
echo 🔄 Step 5: Restarting bot...
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️ PM2 not found. Please restart bot manually.
    goto :finish
)

pm2 describe newbot >nul 2>&1
if errorlevel 1 (
    echo ⚠️ PM2 process 'newbot' not found. Please start manually.
    goto :finish
)

echo 📱 Restarting with PM2...
pm2 restart newbot
if errorlevel 1 (
    echo ❌ Failed to restart with PM2
    pause
    exit /b 1
)
echo ✅ Bot restarted with PM2

:finish
echo.
echo 🎉 Update completed successfully!
echo 📊 Use 'pm2 status' to check bot status
echo 📋 Use 'pm2 logs newbot' to view logs
echo.
pause 