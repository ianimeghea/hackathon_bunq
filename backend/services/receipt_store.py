import json
import uuid
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
RECEIPTS_FILE = DATA_DIR / "receipts.json"
IMAGES_DIR = DATA_DIR / "receipts"


class ReceiptStore:
    def __init__(self):
        DATA_DIR.mkdir(exist_ok=True)
        IMAGES_DIR.mkdir(exist_ok=True)
        self._receipts = self._load()

    def _load(self) -> list:
        if RECEIPTS_FILE.exists():
            return json.loads(RECEIPTS_FILE.read_text())
        return []

    def _save(self):
        RECEIPTS_FILE.write_text(json.dumps(self._receipts, indent=2))

    def add(self, receipt_data: dict, image_filename: str) -> dict:
        receipt = {
            "id": str(uuid.uuid4()),
            "image": image_filename,
            "store_name": receipt_data.get("store_name", "Unknown Store"),
            "date": receipt_data.get("date", ""),
            "currency": receipt_data.get("currency", "€"),
            "items": receipt_data.get("items", []),
            "subtotal": receipt_data.get("subtotal"),
            "tax": receipt_data.get("tax"),
            "total": receipt_data.get("total", 0),
            "confirmed": False,
            "household_members": 2,
            "created_at": datetime.now().isoformat(),
        }
        self._receipts.insert(0, receipt)
        self._save()
        return receipt

    def confirm(self, receipt_id: str, corrected_items: list, household_members: int) -> dict | None:
        for r in self._receipts:
            if r["id"] == receipt_id:
                r["items"] = corrected_items
                r["confirmed"] = True
                r["household_members"] = household_members
                shared = sum(i["price"] for i in corrected_items if i["category"] == "shared")
                personal = sum(i["price"] for i in corrected_items if i["category"] == "personal")
                r["shared_total"] = round(shared, 2)
                r["personal_total"] = round(personal, 2)
                r["per_person"] = round(shared / household_members, 2) if household_members > 0 else 0
                self._save()
                return r
        return None

    def get_all(self) -> list:
        return self._receipts

    def get(self, receipt_id: str) -> dict | None:
        for r in self._receipts:
            if r["id"] == receipt_id:
                return r
        return None

    def delete(self, receipt_id: str) -> bool:
        for i, r in enumerate(self._receipts):
            if r["id"] == receipt_id:
                self._receipts.pop(i)
                self._save()
                return True
        return False


receipt_store = ReceiptStore()
