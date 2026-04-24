"""
Persistent store for active investments.
Saves to a JSON file so investments survive backend restarts.
"""

import json
import os
import time
import uuid

STORE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "investments.json")


class InvestmentStore:
    def __init__(self):
        self.investments: dict[str, dict] = {}
        self._load()

    def _load(self):
        try:
            if os.path.exists(STORE_PATH):
                with open(STORE_PATH, "r") as f:
                    self.investments = json.load(f)
                print(f"[store] Loaded {len(self.investments)} investments from disk")
        except Exception as e:
            print(f"[store] Failed to load: {e}")
            self.investments = {}

    def _save(self):
        try:
            os.makedirs(os.path.dirname(STORE_PATH), exist_ok=True)
            with open(STORE_PATH, "w") as f:
                json.dump(self.investments, f, indent=2)
        except Exception as e:
            print(f"[store] Failed to save: {e}")

    def add(self, strategy: dict) -> dict:
        inv_id = str(uuid.uuid4())[:8]
        investment = {
            "id": inv_id,
            "symbol": strategy["symbol"],
            "name": strategy["name"],
            "asset_type": strategy.get("asset_type", "stock"),
            "action": strategy.get("action", "BUY"),
            "amount_eur": float(strategy.get("amount_eur", 0)),
            "risk_level": strategy.get("risk_level", "medium"),
            "entry_price": float(strategy.get("current_price", 0)),
            "current_price": float(strategy.get("current_price", 0)),
            "target_price": strategy.get("target_price"),
            "stop_loss": strategy.get("stop_loss"),
            "time_horizon": strategy.get("time_horizon", ""),
            "confidence": float(strategy.get("confidence", 0)),
            "reasoning": strategy.get("reasoning", ""),
            "executed_at": time.time(),
            "last_updated": time.time(),
            "recommendation": None,
            "recommendation_updated": None,
            "status": "active",
        }
        self.investments[inv_id] = investment
        self._save()
        return investment

    def get_all(self) -> list[dict]:
        return [inv for inv in self.investments.values() if inv["status"] == "active"]

    def get(self, inv_id: str) -> dict | None:
        return self.investments.get(inv_id)

    def update_price(self, inv_id: str, current_price: float):
        if inv_id in self.investments:
            inv = self.investments[inv_id]
            inv["current_price"] = current_price
            inv["last_updated"] = time.time()
            self._save()

    def update_recommendation(self, inv_id: str, recommendation: str):
        if inv_id in self.investments:
            inv = self.investments[inv_id]
            inv["recommendation"] = recommendation
            inv["recommendation_updated"] = time.time()
            self._save()

    def close(self, inv_id: str):
        if inv_id in self.investments:
            self.investments[inv_id]["status"] = "closed"
            self._save()

    def enrich(self, inv: dict) -> dict:
        entry = inv["entry_price"]
        current = inv["current_price"]
        pnl = current - entry if entry else 0
        pnl_pct = (pnl / entry * 100) if entry else 0
        units = inv["amount_eur"] / entry if entry else 0
        pnl_eur = units * pnl

        return {
            **inv,
            "pnl": round(pnl, 4),
            "pnl_percent": round(pnl_pct, 2),
            "pnl_eur": round(pnl_eur, 2),
            "units": round(units, 6),
            "current_value_eur": round(units * current, 2),
            "age_seconds": round(time.time() - inv["executed_at"]),
        }
