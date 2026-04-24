"""
Populate the bunq sandbox account with realistic transaction history
for demonstrating the analytics tab.

Creates a mix of:
- Investment purchases (ETFs, stocks)
- Salary income
- Subscription payments
- Shopping expenses
- Utility bills
- Restaurant/entertainment spending
"""

import os
import time
import sys

from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))
from bunq_client import BunqClient


def main():
    api_key = os.getenv("BUNQ_API_KEY", "").strip()
    if not api_key:
        print("Creating sandbox user...")
        api_key = BunqClient.create_sandbox_user()
        print(f"  API key: {api_key}")

    client = BunqClient(api_key=api_key, sandbox=True)
    client.authenticate()
    account_id = client.get_primary_account_id()
    user_id = client.user_id
    print(f"Authenticated — user {user_id}, account {account_id}")

    # Request initial funds (multiple times to build up balance)
    print("\nRequesting sandbox funds...")
    for i in range(4):
        try:
            client.post(f"user/{user_id}/monetary-account/{account_id}/request-inquiry", {
                "amount_inquired": {"value": "500.00", "currency": "EUR"},
                "counterparty_alias": {
                    "type": "EMAIL",
                    "value": "sugardaddy@bunq.com",
                    "name": "Sugar Daddy",
                },
                "description": f"Salary deposit #{i+1}",
                "allow_bunqme": False,
            })
            print(f"  Requested €500 batch #{i+1}")
            time.sleep(1.5)
        except Exception as e:
            print(f"  Request #{i+1} failed: {e}")
            time.sleep(2)

    time.sleep(3)

    # Check balance
    accounts = client.get(f"user/{user_id}/monetary-account-bank")
    for item in accounts:
        acc = item.get("MonetaryAccountBank", {})
        if acc.get("status") == "ACTIVE":
            bal = acc.get("balance", {})
            print(f"\nBalance: {bal.get('value')} {bal.get('currency')}")

    # Now create outgoing payments to simulate spending history
    payments = [
        # Investment purchases
        ("15.00", "SPDR S&P 500 ETF (SPY) purchase"),
        ("12.50", "Vanguard Total Bond ETF (BND) purchase"),
        ("20.00", "iShares Gold ETF (GLD) purchase"),
        ("8.75", "Invesco QQQ Trust purchase"),
        ("25.00", "Vanguard Total Stock Market (VTI) purchase"),
        ("10.00", "iShares Silver Trust (SLV) purchase"),
        ("30.00", "Apple Inc. (AAPL) fractional share"),
        ("18.00", "Microsoft Corp. (MSFT) fractional share"),
        ("22.00", "NVIDIA Corp. (NVDA) fractional share"),
        ("5.00", "Bitcoin (BTC) micro purchase"),
        ("7.50", "Ethereum (ETH) micro purchase"),
        # Monthly bills
        ("45.00", "Netflix + Spotify subscription"),
        ("62.00", "Mobile phone bill — T-Mobile"),
        ("89.00", "Electricity bill — Vattenfall"),
        ("35.00", "Internet — Ziggo"),
        ("120.00", "Health insurance premium"),
        # Shopping & groceries
        ("67.30", "Albert Heijn — weekly groceries"),
        ("43.20", "Jumbo supermarket"),
        ("28.50", "HEMA household items"),
        ("156.00", "Zalando clothing order"),
        ("89.90", "Bol.com electronics"),
        # Dining & entertainment
        ("32.50", "Restaurant De Kas — dinner"),
        ("18.75", "Cafe Amsterdam — drinks"),
        ("24.00", "Cinema Pathe — movie night"),
        ("15.50", "Foodora delivery"),
        # Transport
        ("35.00", "NS Train monthly pass"),
        ("12.00", "Uber ride"),
        ("45.00", "Shell fuel"),
    ]

    print(f"\nCreating {len(payments)} transactions...")
    success_count = 0

    for amount, description in payments:
        try:
            client.post(f"user/{user_id}/monetary-account/{account_id}/payment", {
                "amount": {"value": amount, "currency": "EUR"},
                "counterparty_alias": {
                    "type": "EMAIL",
                    "value": "sugardaddy@bunq.com",
                    "name": description.split(" — ")[0].split(" - ")[0][:30],
                },
                "description": description,
            })
            success_count += 1
            print(f"  ✓ €{amount:>7} — {description}")
            time.sleep(0.8)
        except Exception as e:
            print(f"  ✗ €{amount:>7} — {description} FAILED: {e}")
            time.sleep(1.5)

    print(f"\nDone! {success_count}/{len(payments)} transactions created.")

    # Final balance check
    time.sleep(2)
    accounts = client.get(f"user/{user_id}/monetary-account-bank")
    for item in accounts:
        acc = item.get("MonetaryAccountBank", {})
        if acc.get("status") == "ACTIVE":
            bal = acc.get("balance", {})
            print(f"Final balance: {bal.get('value')} {bal.get('currency')}")

    # List recent transactions
    print("\nRecent transactions:")
    payments_list = client.get(
        f"user/{user_id}/monetary-account/{account_id}/payment",
        params={"count": 50},
    )
    for item in payments_list[:10]:
        p = item.get("Payment", {})
        amt = p.get("amount", {})
        print(f"  {amt.get('value'):>10} {amt.get('currency')}  {p.get('description', '')[:50]}")
    print(f"  ... and {len(payments_list) - 10} more")


if __name__ == "__main__":
    main()
