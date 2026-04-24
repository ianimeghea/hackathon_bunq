"""
VoiceInvest API — FastAPI backend for the multimodal AI investment platform.

Uses AWS Bedrock for AI:
- Claude Opus 4.6 via Bedrock converse API (investment agents)
- Amazon Nova Sonic via Bedrock (audio transcription fallback)
- Browser Web Speech API handles primary voice-to-text

Requires AWS env vars: AWS_DEFAULT_REGION, AWS_ACCESS_KEY_ID,
AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN
"""

import asyncio
import json
import os
import time

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from agents.orchestrator import AgentOrchestrator
from services.bunq_service import BunqService
from services.investment_store import InvestmentStore
from services.market_data import fetch_market_snapshot
from services.transcription import transcribe_audio

app = FastAPI(title="VoiceInvest", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bunq = BunqService()
orchestrator = AgentOrchestrator()
investments = InvestmentStore()


@app.on_event("startup")
async def auto_connect_bunq():
    api_key = os.getenv("BUNQ_API_KEY", "").strip()
    if api_key:
        try:
            await bunq.initialize(api_key)
            print(f"[bunq] Auto-connected: user={bunq.user_id}, account={bunq.primary_account_id}")
        except Exception as e:
            print(f"[bunq] Auto-connect failed: {e}")

market_cache: dict = {}
CACHE_TTL_SECONDS = 60


async def get_cached_market_snapshot():
    now = time.time()
    if market_cache.get("data") and now - market_cache.get("fetched_at", 0) < CACHE_TTL_SECONDS:
        return market_cache["data"]
    snapshot = await fetch_market_snapshot()
    market_cache["data"] = snapshot
    market_cache["fetched_at"] = now
    return snapshot


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "bunq_connected": bunq.client is not None,
        "user_id": bunq.user_id,
    }


@app.post("/api/init-bunq")
async def init_bunq(api_key: str | None = None):
    if bunq.client and not api_key:
        return {"status": "connected", "user_id": bunq.user_id, "account_id": bunq.primary_account_id}
    try:
        result = await bunq.initialize(api_key)
        return {"status": "connected", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/request-money")
async def request_money(amount: str = "500.00"):
    if not bunq.client:
        raise HTTPException(status_code=400, detail="bunq not initialized — call /api/init-bunq first")
    try:
        result = await bunq.request_sandbox_money(amount)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


account_cache: dict = {}
ACCOUNT_CACHE_TTL = 10

@app.get("/api/account")
async def get_account():
    if not bunq.client:
        raise HTTPException(status_code=400, detail="bunq not initialized")

    now = time.time()
    if account_cache.get("data") and now - account_cache.get("fetched_at", 0) < ACCOUNT_CACHE_TTL:
        return account_cache["data"]

    try:
        accounts = await bunq.get_accounts()
        balance = {"value": "0.00", "currency": "EUR"}
        for acc in accounts:
            if acc["id"] == bunq.primary_account_id:
                balance = acc["balance"]
                break
        result = {"accounts": accounts, "primary_balance": balance}
        account_cache["data"] = result
        account_cache["fetched_at"] = now
        return result
    except Exception as e:
        if account_cache.get("data"):
            return account_cache["data"]
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/transactions")
async def get_transactions(count: int = 50):
    if not bunq.client:
        raise HTTPException(status_code=400, detail="bunq not initialized")
    try:
        transactions = await bunq.get_transactions(count)
        return {"transactions": transactions, "count": len(transactions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market-snapshot")
async def get_market_snapshot():
    try:
        snapshot = await get_cached_market_snapshot()
        return snapshot.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    try:
        audio_bytes = await audio.read()
        text = await transcribe_audio(audio_bytes, audio.filename or "audio.webm")
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze")
async def analyze(command: str = Form(...)):
    if not bunq.client:
        raise HTTPException(status_code=400, detail="bunq not initialized — call /api/init-bunq first")

    try:
        accounts, transactions, snapshot = await asyncio.gather(
            bunq.get_accounts(),
            bunq.get_transactions(),
            get_cached_market_snapshot(),
        )

        financial_context = bunq.get_user_financial_context(accounts, transactions)
        market_text = snapshot.summary_text()

        event_queue = asyncio.Queue()
        result = await orchestrator.analyze_streaming(command, financial_context, market_text, event_queue)
        return result.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analyze-stream")
async def analyze_stream(command: str):
    """SSE endpoint — streams live agent progress events then final results."""
    if not bunq.client:
        raise HTTPException(status_code=400, detail="bunq not initialized")

    async def event_generator():
        event_queue = asyncio.Queue()

        yield f"data: {json.dumps({'type': 'status', 'message': 'Gathering financial data and market prices...'})}\n\n"

        accounts, transactions, snapshot = await asyncio.gather(
            bunq.get_accounts(),
            bunq.get_transactions(),
            get_cached_market_snapshot(),
        )

        financial_context = bunq.get_user_financial_context(accounts, transactions)
        market_text = snapshot.summary_text()

        yield f"data: {json.dumps({'type': 'status', 'message': f'Data ready — {len(snapshot.stocks)} stocks, {len(snapshot.commodities)} commodities, {len(snapshot.indices)} indices, {len(snapshot.crypto)} crypto, {len(snapshot.forex)} forex, {len(snapshot.etfs)} ETFs loaded. Launching AI advisor...'})}\n\n"

        analysis_task = asyncio.create_task(
            orchestrator.analyze_streaming(command, financial_context, market_text, event_queue)
        )

        while not analysis_task.done():
            try:
                event = await asyncio.wait_for(event_queue.get(), timeout=0.5)
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                continue

        while not event_queue.empty():
            event = event_queue.get_nowait()
            yield f"data: {json.dumps(event)}\n\n"

        result = analysis_task.result()
        yield f"data: {json.dumps({'type': 'complete', 'data': result.to_dict()})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.websocket("/ws/analyze")
async def ws_analyze(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            command = data.get("command", "")
            if not command:
                await websocket.send_json({"error": "No command provided"})
                continue

            if not bunq.client:
                await websocket.send_json({"error": "bunq not initialized"})
                continue

            event_queue = asyncio.Queue()

            await websocket.send_json({"type": "status", "message": "Gathering financial data and market prices..."})

            accounts, transactions, snapshot = await asyncio.gather(
                bunq.get_accounts(),
                bunq.get_transactions(),
                get_cached_market_snapshot(),
            )

            financial_context = bunq.get_user_financial_context(accounts, transactions)
            market_text = snapshot.summary_text()

            await websocket.send_json({"type": "status", "message": "Data ready. Launching AI advisor..."})

            analysis_task = asyncio.create_task(
                orchestrator.analyze_streaming(command, financial_context, market_text, event_queue)
            )

            while not analysis_task.done():
                try:
                    event = await asyncio.wait_for(event_queue.get(), timeout=0.5)
                    await websocket.send_json(event)
                except asyncio.TimeoutError:
                    continue

            while not event_queue.empty():
                event = event_queue.get_nowait()
                await websocket.send_json(event)

            result = analysis_task.result()
            await websocket.send_json({"type": "complete", "data": result.to_dict()})

    except WebSocketDisconnect:
        pass


@app.post("/api/execute-strategy")
async def execute_strategy(strategy: dict):
    """Execute a chosen strategy — records it and simulates a bunq payment."""
    if not bunq.client:
        raise HTTPException(status_code=400, detail="bunq not initialized")

    inv = investments.add(strategy)
    payment_ok = False

    try:
        amount = f"{inv['amount_eur']:.2f}"
        await bunq.make_payment(
            amount=amount,
            recipient_iban="NL02BUNQ2025456700",
            recipient_name=f"VoiceInvest — {inv['symbol']}",
            description=f"Investment: {inv['name']} ({inv['symbol']}) — {inv['action']}",
        )
        payment_ok = True
    except Exception as e:
        print(f"[invest] Payment failed: {e}")

    # Bust caches so the next account/transaction fetch shows the new payment
    account_cache.clear()
    spending_analysis_cache.clear()

    return {"status": "executed", "payment_sent": payment_ok, "investment": investments.enrich(inv)}


@app.get("/api/active-investments")
async def get_active_investments():
    """Return all active investments with current prices and P&L."""
    active = investments.get_all()
    if not active:
        return {"investments": []}

    snapshot = await get_cached_market_snapshot()
    price_map = {}
    for quote_list in [snapshot.stocks, snapshot.etfs, snapshot.commodities,
                       snapshot.indices, snapshot.crypto, snapshot.forex]:
        for q in quote_list:
            price_map[q.symbol] = q.price

    for inv in active:
        live_price = price_map.get(inv["symbol"])
        if live_price:
            investments.update_price(inv["id"], live_price)

    return {"investments": [investments.enrich(inv) for inv in investments.get_all()]}


@app.get("/api/investment-recommendation")
async def get_investment_recommendation(investment_id: str):
    """Get an LLM recommendation for an active investment."""
    inv = investments.get(investment_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")

    enriched = investments.enrich(inv)

    snapshot = await get_cached_market_snapshot()
    price_map = {}
    for quote_list in [snapshot.stocks, snapshot.etfs, snapshot.commodities,
                       snapshot.indices, snapshot.crypto, snapshot.forex]:
        for q in quote_list:
            price_map[q.symbol] = q.price
    live_price = price_map.get(inv["symbol"])
    if live_price:
        investments.update_price(inv["id"], live_price)
        enriched = investments.enrich(inv)

    from agents.recommendation import get_recommendation
    rec = await get_recommendation(enriched, snapshot.summary_text())
    investments.update_recommendation(inv["id"], rec)

    return {"investment_id": investment_id, "recommendation": rec, "investment": enriched}


spending_analysis_cache: dict = {}
SPENDING_CACHE_TTL = 300


@app.get("/api/spending-analysis")
async def get_spending_analysis():
    """AI-powered spending analysis with savings opportunities and investment ROI."""
    if not bunq.client:
        raise HTTPException(status_code=400, detail="bunq not initialized")

    now = time.time()
    if spending_analysis_cache.get("data") and now - spending_analysis_cache.get("fetched_at", 0) < SPENDING_CACHE_TTL:
        return spending_analysis_cache["data"]

    try:
        accounts, transactions = await asyncio.gather(
            bunq.get_accounts(),
            bunq.get_transactions(100),
        )

        balance = 0.0
        for acc in accounts:
            if acc["id"] == bunq.primary_account_id:
                balance = float(acc["balance"]["value"])
                break

        from agents.spending_analyzer import analyze_spending
        result = await analyze_spending(transactions, balance)
        spending_analysis_cache["data"] = result
        spending_analysis_cache["fetched_at"] = now
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/close-investment")
async def close_investment(investment_id: str):
    inv = investments.get(investment_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    enriched = investments.enrich(inv)
    investments.close(investment_id)
    return {"status": "closed", "final": enriched}


FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
