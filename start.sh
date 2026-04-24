#!/usr/bin/env bash
set -e

echo "=== VoiceInvest — Starting up ==="

# Check AWS credentials
if [ -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "ERROR: AWS credentials not set."
    echo "Export them before running:"
    echo ""
    echo '  export AWS_DEFAULT_REGION="us-east-1"'
    echo '  export AWS_ACCESS_KEY_ID="..."'
    echo '  export AWS_SECRET_ACCESS_KEY="..."'
    echo '  export AWS_SESSION_TOKEN="..."'
    echo ""
    exit 1
fi

echo "AWS credentials detected (region: ${AWS_DEFAULT_REGION:-us-east-1})"

# Install backend dependencies
echo "[1/4] Installing backend dependencies..."
pip install -r backend/requirements.txt -q

# Install frontend dependencies
echo "[2/4] Installing frontend dependencies..."
cd frontend && npm install --silent && cd ..

# Start backend
echo "[3/4] Starting backend (port 8000)..."
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Start frontend dev server
echo "[4/4] Starting frontend (port 5173)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=== VoiceInvest is running! ==="
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "  AI: Claude Opus 4 on Bedrock"
echo "  Voice: Web Speech API (browser) + Nova Sonic fallback"
echo ""
echo "Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
