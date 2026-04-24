"""SplitSmart API — Receipt-based payment splitting with AI categorization."""

from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from services.receipt_extractor import extract_receipt
from services.receipt_store import receipt_store
from services.preference_store import preference_store

app = FastAPI(title="SplitSmart API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"
IMAGES_DIR = DATA_DIR / "receipts"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/api/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "SplitSmart"}


@app.post("/api/upload-receipt")
async def upload_receipt(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")

    image_bytes = await file.read()
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 20MB)")

    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    image_path = IMAGES_DIR / filename
    image_path.write_bytes(image_bytes)

    try:
        extracted = extract_receipt(image_bytes, file.content_type)
    except Exception as e:
        raise HTTPException(500, f"Failed to extract receipt: {str(e)}")

    receipt = receipt_store.add(extracted, filename)
    return receipt


class ConfirmSplitRequest(BaseModel):
    receipt_id: str
    items: list
    household_members: int = 2


@app.post("/api/confirm-split")
async def confirm_split(req: ConfirmSplitRequest):
    receipt = receipt_store.get(req.receipt_id)
    if not receipt:
        raise HTTPException(404, "Receipt not found")

    original_items = receipt["items"]
    preference_store.learn_from_corrections(original_items, req.items)

    confirmed = receipt_store.confirm(req.receipt_id, req.items, req.household_members)
    if not confirmed:
        raise HTTPException(500, "Failed to confirm split")

    return confirmed


@app.get("/api/receipts")
async def get_receipts():
    return receipt_store.get_all()


@app.get("/api/receipts/{receipt_id}")
async def get_receipt(receipt_id: str):
    receipt = receipt_store.get(receipt_id)
    if not receipt:
        raise HTTPException(404, "Receipt not found")
    return receipt


@app.delete("/api/receipts/{receipt_id}")
async def delete_receipt(receipt_id: str):
    if not receipt_store.delete(receipt_id):
        raise HTTPException(404, "Receipt not found")
    return {"status": "deleted"}


class VoiceCommandRequest(BaseModel):
    transcript: str
    items: list


@app.post("/api/voice-command")
async def voice_command(req: VoiceCommandRequest):
    from services.voice_interpreter import interpret_voice_command
    try:
        result = interpret_voice_command(req.transcript, req.items)
    except Exception as e:
        raise HTTPException(500, f"Failed to interpret voice command: {str(e)}")
    return result


@app.get("/api/preferences")
async def get_preferences():
    return preference_store.get_all()


# ── bunq integration ──

from services import bunq_service


@app.post("/api/bunq/init")
async def bunq_init():
    try:
        bunq_service.get_client()
        info = bunq_service.get_account_info()
        return {"status": "connected", "account": info}
    except Exception as e:
        raise HTTPException(500, f"bunq init failed: {str(e)}")


@app.post("/api/bunq/request-test-money")
async def bunq_request_test_money():
    try:
        bunq_service.request_sandbox_money()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/bunq/account")
async def bunq_account():
    try:
        return bunq_service.get_account_info()
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Flatmates ──

class FlatmateRequest(BaseModel):
    name: str
    email: str


@app.get("/api/flatmates")
async def get_flatmates():
    return bunq_service.get_flatmates()


@app.post("/api/flatmates")
async def add_flatmate(req: FlatmateRequest):
    return bunq_service.add_flatmate(req.name, req.email)


@app.delete("/api/flatmates/{email}")
async def remove_flatmate(email: str):
    if not bunq_service.remove_flatmate(email):
        raise HTTPException(404, "Flatmate not found")
    return {"status": "removed"}


# ── Payment requests ──

class PaymentRequestBody(BaseModel):
    receipt_id: str
    flatmate_emails: list[str]


@app.post("/api/request-payments")
async def request_payments(req: PaymentRequestBody):
    receipt = receipt_store.get(req.receipt_id)
    if not receipt:
        raise HTTPException(404, "Receipt not found")
    if not receipt.get("confirmed"):
        raise HTTPException(400, "Confirm the split first")

    per_person = receipt.get("per_person", 0)
    if per_person <= 0:
        raise HTTPException(400, "Nothing to request")

    flatmates = bunq_service.get_flatmates()
    fm_map = {f["email"].lower(): f for f in flatmates}

    results = []
    for email in req.flatmate_emails:
        fm = fm_map.get(email.lower())
        if not fm:
            results.append({"email": email, "error": "Flatmate not found"})
            continue
        try:
            amount_str = f"{per_person:.2f}"
            desc = f"SplitSmart: {receipt['store_name']} — your share ({receipt.get('currency', '€')}{amount_str})"
            result = bunq_service.send_payment_request(fm["email"], fm["name"], amount_str, desc)
            results.append({**result, "status": "sent"})
        except Exception as e:
            results.append({"email": email, "error": str(e)})

    return {"results": results, "per_person": per_person}
