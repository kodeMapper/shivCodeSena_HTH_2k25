@echo off
echo Starting SmartVision Family Safety Tracker...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm dependencies are installed
if not exist node_modules (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Create logs directory if it doesn't exist
if not exist logs mkdir logs

REM Check if .env file exists
if not exist .env (
    echo WARNING: .env file not found
    echo Copying .env.example to .env
    copy .env.example .env
    echo Please edit .env with your configuration before running in production
    echo.
)

REM Start the enhanced server
echo Starting enhanced server...
echo Server will be available at: http://localhost:3000
echo Health check: http://localhost:3000/api/health
echo API Documentation: See docs/API.md
echo.
echo Press Ctrl+C to stop the server
echo.

npm start

pause
