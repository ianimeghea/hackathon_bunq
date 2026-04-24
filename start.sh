#!/usr/bin/env bash
set -e

echo "=== SplitSmart — Starting up ==="

if [ -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "ERROR: AWS credentials not set."
    echo "Export them before running:"
    echo ""
    echo '  export AWS_DEFAULT_REGION="eu-central-1"'
    echo '  export AWS_ACCESS_KEY_ID="..."'
    echo '  export AWS_SECRET_ACCESS_KEY="..."'
    echo '  export AWS_SESSION_TOKEN="..."'
    echo ""
    exit 1
fi

echo "AWS credentials detected (region: ${AWS_DEFAULT_REGION:-eu-central-1})"

if [ -n "$BUNQ_API_KEY" ]; then
    echo "bunq API key detected"
else
    echo "No BUNQ_API_KEY set — will auto-create sandbox user"
fi

mkdir -p backend/data/receipts backend/data/chats

echo "[1/4] Installing backend dependencies..."
pip install -r backend/requirements.txt -q

echo "[2/4] Installing frontend dependencies..."
cd frontend && npm install --silent && cd ..

echo "[3/4] Starting backend (port 8000)..."
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

echo "[4/4] Starting frontend (port 5173)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=== SplitSmart is running! ==="
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "  AI:   Claude Opus 4.6 on AWS Bedrock"
echo "  Bank: bunq (sandbox)"
echo ""
echo "Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
