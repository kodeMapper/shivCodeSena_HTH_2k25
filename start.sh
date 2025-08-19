#!/bin/bash

echo "Starting SmartVision Family Safety Tracker..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        exit 1
    fi
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "WARNING: .env file not found"
    echo "Copying .env.example to .env"
    cp .env.example .env
    echo "Please edit .env with your configuration before running in production"
    echo ""
fi

# Start the enhanced server
echo "Starting enhanced server..."
echo "Server will be available at: http://localhost:3000"
echo "Health check: http://localhost:3000/api/health"
echo "API Documentation: See docs/API.md"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
