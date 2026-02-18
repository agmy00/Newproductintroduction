#!/usr/bin/env bash
# NPI Project Management System - Startup Script
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo "================================================"
echo "  NPI Project Management System"
echo "================================================"

# --- Backend setup ---
echo ""
echo "[1/4] Setting up Python backend..."
cd "$BACKEND"

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "  Created virtual environment."
fi

source venv/bin/activate
pip install -q -r requirements.txt
echo "  Dependencies installed."

# --- Frontend setup ---
echo ""
echo "[2/4] Setting up frontend..."
cd "$FRONTEND"
if [ ! -d "node_modules" ]; then
    npm install --silent
    echo "  Node modules installed."
else
    echo "  Node modules already present."
fi

# --- Start backend ---
echo ""
echo "[3/4] Starting backend on http://localhost:8000 ..."
cd "$BACKEND"
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

sleep 2

# --- Start frontend ---
echo ""
echo "[4/4] Starting frontend dev server on http://localhost:3000 ..."
cd "$FRONTEND"
npm run dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "================================================"
echo "  App running:"
echo "    Frontend: http://localhost:3000"
echo "    Backend:  http://localhost:8000"
echo "    API docs: http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop all services."
echo "================================================"

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
