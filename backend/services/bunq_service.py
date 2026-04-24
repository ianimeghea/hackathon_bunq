import json
import os
from pathlib import Path

from bunq_client import BunqClient

DATA_DIR = Path(__file__).parent.parent / "data"
FLATMATES_FILE = DATA_DIR / "flatmates.json"

_client: BunqClient | None = None
_account_id: int | None = None


def get_client() -> BunqClient:
    global _client, _account_id
    if _client is None:
        api_key = os.environ.get("BUNQ_API_KEY", "").strip()
        if not api_key:
            api_key = BunqClient.create_sandbox_user()
            os.environ["BUNQ_API_KEY"] = api_key
        _client = BunqClient(api_key=api_key, sandbox=True)
        _client.authenticate()
        _account_id = _client.get_primary_account_id()
    return _client


def get_account_id() -> int:
    get_client()
    return _account_id


def request_sandbox_money(amount: str = "500.00"):
    client = get_client()
    client.post(f"user/{client.user_id}/monetary-account/{get_account_id()}/request-inquiry", {
        "amount_inquired": {"value": amount, "currency": "EUR"},
        "counterparty_alias": {
            "type": "EMAIL",
            "value": "sugardaddy@bunq.com",
            "name": "Sugar Daddy",
        },
        "description": "SplitSmart test funds",
        "allow_bunqme": False,
    })


def send_payment_request(email: str, name: str, amount: str, description: str) -> dict:
    client = get_client()
    resp = client.post(
        f"user/{client.user_id}/monetary-account/{get_account_id()}/request-inquiry",
        {
            "amount_inquired": {"value": amount, "currency": "EUR"},
            "counterparty_alias": {
                "type": "EMAIL",
                "value": email,
                "name": name,
            },
            "description": description,
            "allow_bunqme": True,
        },
    )
    request_id = resp[0]["Id"]["id"] if resp else None
    return {"request_id": request_id, "amount": amount, "email": email, "name": name}


def get_account_info() -> dict:
    client = get_client()
    accounts = client.get(f"user/{client.user_id}/monetary-account-bank")
    for item in accounts:
        acc = item.get("MonetaryAccountBank", {})
        if acc.get("status") == "ACTIVE":
            balance = acc.get("balance", {})
            return {
                "id": acc["id"],
                "description": acc.get("description", ""),
                "balance": balance.get("value", "0.00"),
                "currency": balance.get("currency", "EUR"),
            }
    return {}


# --- Flatmate management ---

def _load_flatmates() -> list:
    DATA_DIR.mkdir(exist_ok=True)
    if FLATMATES_FILE.exists():
        return json.loads(FLATMATES_FILE.read_text())
    return []


def _save_flatmates(flatmates: list):
    DATA_DIR.mkdir(exist_ok=True)
    FLATMATES_FILE.write_text(json.dumps(flatmates, indent=2))


def get_flatmates() -> list:
    return _load_flatmates()


def add_flatmate(name: str, email: str) -> dict:
    flatmates = _load_flatmates()
    fm = {"name": name, "email": email}
    for existing in flatmates:
        if existing["email"].lower() == email.lower():
            existing["name"] = name
            _save_flatmates(flatmates)
            return existing
    flatmates.append(fm)
    _save_flatmates(flatmates)
    return fm


def remove_flatmate(email: str) -> bool:
    flatmates = _load_flatmates()
    new = [f for f in flatmates if f["email"].lower() != email.lower()]
    if len(new) == len(flatmates):
        return False
    _save_flatmates(new)
    return True
