#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
DB_PORT="${DB_PORT:-5432}"

cleanup() {
  echo ""
  echo "Shutting down services..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  # Note: I deliberately left 'docker compose stop' out of here so you 
  # don't have to wait for the DB to boot every single time you restart the script.
  echo "All services stopped."
}
trap cleanup EXIT INT TERM

echo "========================================"
echo " PrepAgent SaaS — Dev Mode"
echo "========================================"

# --- NEW: Start and wait for Database ---
cd "$ROOT_DIR"
echo "[database] Starting Docker Compose services..."
docker compose up -d

echo "[database] Waiting for PostgreSQL to be ready on port $DB_PORT..."
# Using 'nc' (netcat), which is native to macOS, to check if the port is open
while ! nc -z localhost "$DB_PORT" >/dev/null 2>&1; do
  sleep 1
done

# Give Postgres an extra 2 seconds to finish its internal initialization
sleep 2
echo "[database] PostgreSQL is ready!"
# -----------------------------------------

cd "$BACKEND_DIR"

# Check if venv exists AND is the correct Python version
if [ -d "venv" ]; then
  VENV_VERSION=$(venv/bin/python -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || echo "unknown")
  
  if [ "$VENV_VERSION" != "3.12" ]; then
    echo "[backend] Existing venv is Python $VENV_VERSION. Removing it to upgrade to Python 3.12..."
    rm -rf venv
  fi
fi

# Create a virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  echo "[backend] Creating Python 3.12 virtual environment..."
  python3.12 -m venv venv
fi

# Activate the virtual environment
source venv/bin/activate

# Check if requirements need installing using a checksum
REQ_CHECKSUM="venv/.req_checksum"
CURRENT_CHECKSUM=$(md5sum requirements.txt 2>/dev/null | awk '{print $1}' || md5 -q requirements.txt)

if [ ! -f "$REQ_CHECKSUM" ] || [ "$(cat "$REQ_CHECKSUM")" != "$CURRENT_CHECKSUM" ]; then
  echo "[backend] Dependencies changed. Installing requirements (this may take a few minutes)..."
  
  pip install --upgrade pip setuptools wheel
  pip install -r requirements.txt
  
  echo "$CURRENT_CHECKSUM" > "$REQ_CHECKSUM"
else
  echo "[backend] Dependencies up to date. Skipping pip install."
fi

echo "[backend] Applying migrations..."
python3 -m alembic upgrade head || echo "[backend] Skipping migration (not ready or already applied)"

echo "[backend] Starting uvicorn on port $BACKEND_PORT..."
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT" &
BACKEND_PID=$!

cd "$FRONTEND_DIR"
echo "[frontend] Starting Next.js on port $FRONTEND_PORT..."
npx next dev --port "$FRONTEND_PORT" &
FRONTEND_PID=$!

echo ""
echo "Services running. Press Ctrl+C to stop frontend and backend."
echo ""

wait