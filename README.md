# SplitSmart

AI-powered receipt splitting for shared households. Upload a grocery receipt, and Claude Opus 4.7 extracts every line item and categorizes it as shared (household) or personal. Review the AI's decisions, adjust anything, and the app remembers your corrections for next time.

## Stack

- **Frontend:** React 19 + Vite — liquid glass UI
- **Backend:** FastAPI + Python
- **AI:** Claude Opus 4.7 via AWS Bedrock — receipt OCR + categorization
- **Persistence:** JSON file store with learned preferences

## Quick Start

```bash
export AWS_DEFAULT_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."
./start.sh
```

Frontend: http://localhost:5173  
Backend: http://localhost:8000  
API docs: http://localhost:8000/docs

## How It Works

1. **Upload** a receipt photo (drag & drop or camera)
2. **Claude extracts** all items with prices and categorizes each as shared/personal
3. **Review & adjust** — toggle any item's category with one tap
4. **Confirm** — the app calculates per-person cost for shared items
5. **Learn** — corrections are saved so Claude gets smarter over time
