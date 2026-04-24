import json
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
PAYMENTS_FILE = DATA_DIR / "payments.json"


class PaymentStore:
    def __init__(self):
        DATA_DIR.mkdir(exist_ok=True)
        self._payments = self._load()

    def _load(self) -> list:
        if PAYMENTS_FILE.exists():
            return json.loads(PAYMENTS_FILE.read_text())
        return []

    def _save(self):
        PAYMENTS_FILE.write_text(json.dumps(self._payments, indent=2))

    def add(self, receipt_id: str, store_name: str, email: str, name: str, amount: float, status: str, request_id=None):
        entry = {
            "receipt_id": receipt_id,
            "store_name": store_name,
            "email": email,
            "name": name,
            "amount": amount,
            "status": status,
            "request_id": request_id,
            "created_at": datetime.now().isoformat(),
        }
        self._payments.insert(0, entry)
        self._save()
        return entry

    def get_all(self) -> list:
        return self._payments

    def get_stats(self) -> dict:
        total_sent = len([p for p in self._payments if p["status"] == "sent"])
        total_failed = len([p for p in self._payments if p["status"] == "failed"])
        total_amount = sum(p["amount"] for p in self._payments if p["status"] == "sent")

        by_person = {}
        for p in self._payments:
            if p["status"] != "sent":
                continue
            key = p["email"]
            if key not in by_person:
                by_person[key] = {"name": p["name"], "email": key, "total": 0, "count": 0}
            by_person[key]["total"] += p["amount"]
            by_person[key]["count"] += 1

        return {
            "total_sent": total_sent,
            "total_failed": total_failed,
            "total_amount": round(total_amount, 2),
            "by_person": sorted(by_person.values(), key=lambda x: x["total"], reverse=True),
        }


payment_store = PaymentStore()
