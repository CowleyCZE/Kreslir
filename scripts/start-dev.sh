#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR" || exit 1

cleanup() {
  echo "Zastavuji služby..."
  kill "${BACKEND_PID:-}" "${FRONTEND_PID:-}" 2>/dev/null || true
  wait "${BACKEND_PID:-}" 2>/dev/null || true
  wait "${FRONTEND_PID:-}" 2>/dev/null || true
}

trap 'cleanup; exit 0' SIGINT SIGTERM

# Backend
echo "Spouštím backend..."
cd backend
if [ -f "venv/bin/activate" ]; then
  echo "Aktivuji virtuální prostøedí"
  # shellcheck source=/dev/null
  . venv/bin/activate
fi

if command -v uvicorn >/dev/null 2>&1; then
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
else
  python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
fi
BACKEND_PID=$!
cd "$ROOT_DIR"

# Frontend
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