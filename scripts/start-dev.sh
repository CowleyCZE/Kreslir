#!/usr/bin/env bash
# start-dev.sh - spustí backend a frontend pro lokální vývoj

set -euo pipefail
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

# Spustíme backend v subshellu
echo "Spouštím backend..."
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd "$ROOT_DIR"

# Spustíme frontend
echo "Spouštím frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
  npm install --silent
fi
npm run dev -- --host &
FRONTEND_PID=$!
cd "$ROOT_DIR"

# Trap pro ukonèení obou procesù
trap "echo 'Zastavuji služby...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit 0" SIGINT SIGTERM

# Èekáme na oba procesy
wait $BACKEND_PID
wait $FRONTEND_PID