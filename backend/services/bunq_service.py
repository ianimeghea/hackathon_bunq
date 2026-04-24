"""
bunq banking service — wraps the existing BunqClient for the investment platform.

Provides async-friendly methods for:
- Account balance and details
- Transaction history
- Payment execution
"""

import asyncio
import os
import sys
from functools import partial

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from bunq_client import BunqClient


class BunqService:
    def __init__(self):
        self.client: BunqClient | None = None
        self.api_key: str | None = None
        self.user_id: int | None = None
        self.primary_account_id: int | None = None
        self._broker_email: str | None = None
        self._broker_name: str = "VoiceInvest Broker"

    async def initialize(self, api_key: str | None = None) -> dict:
        loop = asyncio.get_event_loop()

        if not api_key:
            api_key = os.getenv("BUNQ_API_KEY", "").strip()

        if not api_key:
            api_key = await loop.run_in_executor(None, BunqClient.create_sandbox_user)

        self.api_key = api_key
        self.client = BunqClient(api_key=api_key, sandbox=True)
        await loop.run_in_executor(None, self.client.authenticate)
        self.user_id = self.client.user_id
        self.primary_account_id = await loop.run_in_executor(
            None, self.client.get_primary_account_id
        )

        return {
            "user_id": self.user_id,
            "account_id": self.primary_account_id,
            "api_key": self.api_key,
        }

    async def get_accounts(self) -> list[dict]:
        if not self.client:
            raise RuntimeError("BunqService not initialized")

        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(
            None,
            partial(self.client.get, f"user/{self.user_id}/monetary-account-bank"),
        )

        accounts = []
        for item in raw:
            account_type = next(iter(item))
            acc = item[account_type]
            ibans = [a["value"] for a in acc.get("alias", []) if a.get("type") == "IBAN"]
            balance = acc.get("balance", {})
            accounts.append({
                "id": acc.get("id"),
                "type": account_type,
                "status": acc.get("status"),
                "description": acc.get("description"),
                "balance": {
                    "value": balance.get("value", "0.00"),
                    "currency": balance.get("currency", "EUR"),
                },
                "iban": ibans[0] if ibans else None,
            })

        return accounts

    async def get_balance(self) -> dict:
        accounts = await self.get_accounts()
        for acc in accounts:
            if acc["id"] == self.primary_account_id:
                return acc["balance"]
        return {"value": "0.00", "currency": "EUR"}

    async def get_transactions(self, count: int = 50) -> list[dict]:
        if not self.client:
            raise RuntimeError("BunqService not initialized")

        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(
            None,
            partial(
                self.client.get,
                f"user/{self.user_id}/monetary-account/{self.primary_account_id}/payment",
                params={"count": count},
            ),
        )

        transactions = []
        for item in raw:
            p = item.get("Payment", {})
            amount = p.get("amount", {})
            transactions.append({
                "id": p.get("id"),
                "created": p.get("created", ""),
                "amount": {
                    "value": amount.get("value", "0.00"),
                    "currency": amount.get("currency", "EUR"),
                },
                "description": p.get("description", ""),
                "counterparty": p.get("counterparty_alias", {}).get("display_name", ""),
                "type": p.get("type", ""),
                "sub_type": p.get("sub_type", ""),
            })

        return transactions

    async def request_sandbox_money(self, amount: str = "500.00") -> dict:
        if not self.client:
            raise RuntimeError("BunqService not initialized")

        loop = asyncio.get_event_loop()
        body = {
            "amount_inquired": {"value": amount, "currency": "EUR"},
            "counterparty_alias": {
                "type": "EMAIL",
                "value": "sugardaddy@bunq.com",
                "name": "Sugar Daddy",
            },
            "description": "Investment fund top-up",
            "allow_bunqme": False,
        }
        raw = await loop.run_in_executor(
            None,
            partial(
                self.client.post,
                f"user/{self.user_id}/monetary-account/{self.primary_account_id}/request-inquiry",
                body,
            ),
        )
        return {"status": "requested", "amount": amount, "response": raw}

    async def ensure_broker_account(self):
        """Create a second sandbox user to act as the 'broker' for payments."""
        if self._broker_email:
            return
        loop = asyncio.get_event_loop()
        try:
            api_key = await loop.run_in_executor(None, BunqClient.create_sandbox_user)
            broker = BunqClient(api_key=api_key, sandbox=True)
            await loop.run_in_executor(None, broker.authenticate)
            # Get broker's email alias
            raw = await loop.run_in_executor(
                None,
                partial(broker.get, f"user/{broker.user_id}"),
            )
            for item in raw:
                for key in ("UserPerson", "UserCompany", "UserApiKey"):
                    if key in item:
                        for alias in item[key].get("alias", []):
                            if alias.get("type") == "EMAIL":
                                self._broker_email = alias["value"]
                                self._broker_name = "VoiceInvest Broker"
                                print(f"[bunq] Broker account ready: {self._broker_email}")
                                return
            # If no email alias found, use a phone alias
            print("[bunq] No broker email found, payments will be recorded locally only")
        except Exception as e:
            print(f"[bunq] Broker creation failed: {e}")

    async def make_payment(self, amount: str, recipient_iban: str, recipient_name: str, description: str) -> dict:
        if not self.client:
            raise RuntimeError("BunqService not initialized")

        loop = asyncio.get_event_loop()

        # Try paying to the sandbox broker account (creates real visible transaction)
        await self.ensure_broker_account()
        if self._broker_email:
            try:
                body = {
                    "amount": {"value": amount, "currency": "EUR"},
                    "counterparty_alias": {
                        "type": "EMAIL",
                        "value": self._broker_email,
                        "name": recipient_name,
                    },
                    "description": description,
                }
                raw = await loop.run_in_executor(
                    None,
                    partial(
                        self.client.post,
                        f"user/{self.user_id}/monetary-account/{self.primary_account_id}/payment",
                        body,
                    ),
                )
                return {"status": "sent", "amount": amount, "recipient": recipient_name, "response": raw}
            except Exception as e:
                print(f"[bunq] Broker payment failed: {e}")

        # Fallback: direct IBAN payment
        try:
            body = {
                "amount": {"value": amount, "currency": "EUR"},
                "counterparty_alias": {
                    "type": "IBAN",
                    "value": recipient_iban,
                    "name": recipient_name,
                },
                "description": description,
            }
            raw = await loop.run_in_executor(
                None,
                partial(
                    self.client.post,
                    f"user/{self.user_id}/monetary-account/{self.primary_account_id}/payment",
                    body,
                ),
            )
            return {"status": "sent", "amount": amount, "recipient": recipient_name, "response": raw}
        except Exception as e:
            print(f"[bunq] IBAN payment failed: {e}")
            raise

    def get_user_financial_context(self, accounts: list[dict], transactions: list[dict]) -> str:
        lines = ["=== USER FINANCIAL PROFILE ===\n"]

        lines.append("ACCOUNTS:")
        total_balance = 0.0
        for acc in accounts:
            bal = float(acc["balance"]["value"])
            total_balance += bal
            currency = acc["balance"]["currency"]
            lines.append(
                f"  {acc['description'] or 'Main Account'}: {bal:,.2f} {currency} "
                f"(Status: {acc['status']}, IBAN: {acc.get('iban', 'N/A')})"
            )
        lines.append(f"  TOTAL BALANCE: {total_balance:,.2f} EUR\n")

        lines.append("RECENT TRANSACTIONS:")
        income = 0.0
        expenses = 0.0
        for tx in transactions[:30]:
            val = float(tx["amount"]["value"])
            if val > 0:
                income += val
            else:
                expenses += abs(val)
            lines.append(
                f"  {tx['created'][:10]}  {val:>10,.2f} EUR  "
                f"{tx['counterparty']:<25}  {tx['description']}"
            )

        lines.append(f"\n  Period income:   +{income:,.2f} EUR")
        lines.append(f"  Period expenses: -{expenses:,.2f} EUR")
        lines.append(f"  Net flow:        {income - expenses:,.2f} EUR")

        return "\n".join(lines)
