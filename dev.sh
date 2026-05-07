#!/bin/bash

# Function to kill all background processes on exit
cleanup() {
    echo ""
    echo "Shutting down all services..."
    kill $(jobs -p)
    exit
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup SIGINT

# Ensure we are in the project root
if [[ ! -d "anki-exporter" || ! -d "backend" || ! -d "frontend" ]]; then
    echo "Error: Please run this script from the project root."
    exit 1
fi

echo "Starting Lexis Automator Services..."
echo "------------------------------------"

# 1. Start Python Anki Exporter
echo "[1/3] Starting Python Anki Exporter (Port 8000)..."
(cd anki-exporter && uv run main.py) &

# 2. Start NestJS Backend
echo "[2/3] Starting NestJS Backend (Port 3000)..."
(cd backend && pnpm start:dev) &

# 3. Start Next.js Frontend
echo "[3/3] Starting Next.js Frontend (Port 3001)..."
(cd frontend && pnpm dev) &

echo "------------------------------------"
echo "All services are running!"
echo "Frontend: http://localhost:3001"
echo "Backend Docs: http://localhost:3000/api"
echo "Anki Exporter Docs: http://localhost:8000/docs"
echo "Press Ctrl+C to stop all services."

# Wait for all background processes
wait
