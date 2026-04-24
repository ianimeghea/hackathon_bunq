"""
Spending analysis agent — analyzes bunq transactions to find savings opportunities
and calculate potential investment ROI using Claude on Bedrock.
"""

import asyncio
import json
import re
from concurrent.futures import ThreadPoolExecutor

import boto3

BEDROCK_MODEL_ID = "eu.anthropic.claude-opus-4-6-v1"
_executor = ThreadPoolExecutor(max_workers=2)

SYSTEM_PROMPT = """You are a personal finance advisor. Analyze spending and output ONLY valid JSON — no markdown, no comments, no trailing commas.

Keep string values short (under 100 chars). Use only ASCII characters in strings — no special quotes, dashes, or unicode.

{
  "monthly_spending": {
    "category_name": {"amount": 100.00, "count": 5, "avg_per_transaction": 20.00}
  },
  "savings_opportunities": [
    {
      "category": "category_name",
      "current_monthly": 100.00,
      "recommended_monthly": 60.00,
      "monthly_savings": 40.00,
      "annual_savings": 480.00,
      "suggestion": "Short actionable tip",
      "difficulty": "easy",
      "impact_score": 7.0
    }
  ],
  "investment_projections": [
    {
      "monthly_redirect": 40.00,
      "annual_amount": 480.00,
      "projected_5yr_value": 600.00,
      "projected_10yr_value": 800.00,
      "investment_type": "ETF portfolio",
      "expected_annual_return": 7.0
    }
  ],
  "total_monthly_savings_potential": 40.00,
  "total_annual_savings_potential": 480.00
}

Categories: food_delivery, subscriptions, entertainment, shopping, transport, dining, groceries, other.
Difficulty: easy, medium, hard. Impact: 1-10. Max 4 savings opportunities. Max 2 projections."""


def _repair_json(raw: str) -> str:
    """Try to extract and fix JSON from LLM output."""
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r'^```\w*\n?', '', text)
        text = re.sub(r'\n?```$', '', text)
    text = text.strip()

    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        return text
    text = text[start:end]

    # Fix trailing commas before } or ]
    text = re.sub(r',\s*([}\]])', r'\1', text)
    # Fix smart quotes
    text = text.replace('\u201c', '"').replace('\u201d', '"')
    text = text.replace('\u2018', "'").replace('\u2019', "'")
    # Fix en/em dashes
    text = text.replace('\u2013', '-').replace('\u2014', '-')
    # Remove control characters
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)

    return text


def _call_bedrock(user_message: str) -> str:
    client = boto3.client("bedrock-runtime", region_name="eu-central-1")
    try:
        response = client.converse(
            modelId=BEDROCK_MODEL_ID,
            system=[{"text": SYSTEM_PROMPT}],
            messages=[{"role": "user", "content": [{"text": user_message}]}],
            inferenceConfig={"maxTokens": 1500},
        )
        return response["output"]["message"]["content"][0]["text"]
    except Exception as e:
        return json.dumps({
            "monthly_spending": {},
            "savings_opportunities": [],
            "investment_projections": [],
            "total_monthly_savings_potential": 0,
            "total_annual_savings_potential": 0,
            "error": f"Analysis failed: {str(e)[:100]}"
        })


async def analyze_spending(transactions: list[dict], current_balance: float) -> dict:
    if not transactions:
        return {
            "monthly_spending": {},
            "savings_opportunities": [],
            "investment_projections": [],
            "total_monthly_savings_potential": 0,
            "total_annual_savings_potential": 0,
        }

    tx_lines = []
    total_expenses = 0
    total_income = 0

    for tx in transactions:
        amount = float(tx.get("amount", {}).get("value", 0))
        if amount < 0:
            total_expenses += abs(amount)
            cp = (tx.get("counterparty", "") or "")[:30]
            desc = (tx.get("description", "") or "")[:40]
            tx_lines.append(f"{abs(amount):.2f} | {cp} | {desc}")
        else:
            total_income += amount

    user_msg = f"""Balance: {current_balance:.2f} EUR
Expenses: {total_expenses:.2f} EUR
Income: {total_income:.2f} EUR

Transactions:
""" + "\n".join(tx_lines[:40]) + """

Categorize spending, find up to 4 realistic savings opportunities, and project investment ROI. JSON only."""

    loop = asyncio.get_event_loop()
    raw = await loop.run_in_executor(_executor, _call_bedrock, user_msg)

    try:
        cleaned = _repair_json(raw)
        result = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        # Last resort: try to find each top-level key and build manually
        result = _fallback_parse(raw)

    result.setdefault("monthly_spending", {})
    result.setdefault("savings_opportunities", [])
    result.setdefault("investment_projections", [])
    result.setdefault("total_monthly_savings_potential", 0)
    result.setdefault("total_annual_savings_potential", 0)
    return result


def _fallback_parse(raw: str) -> dict:
    """Extract what we can even from broken JSON."""
    result = {}

    # Try to find monthly_spending object
    m = re.search(r'"monthly_spending"\s*:\s*(\{[^}]*(?:\{[^}]*\}[^}]*)*\})', raw, re.DOTALL)
    if m:
        try:
            result["monthly_spending"] = json.loads(_repair_json("{" + m.group(0) + "}"))["monthly_spending"]
        except Exception:
            pass

    # Try to find savings_opportunities array
    m = re.search(r'"savings_opportunities"\s*:\s*\[(.*?)\]', raw, re.DOTALL)
    if m:
        items = re.findall(r'\{[^{}]+\}', m.group(1))
        opps = []
        for item in items:
            try:
                opps.append(json.loads(_repair_json(item)))
            except Exception:
                continue
        if opps:
            result["savings_opportunities"] = opps

    # Try to find investment_projections array
    m = re.search(r'"investment_projections"\s*:\s*\[(.*?)\]', raw, re.DOTALL)
    if m:
        items = re.findall(r'\{[^{}]+\}', m.group(1))
        projs = []
        for item in items:
            try:
                projs.append(json.loads(_repair_json(item)))
            except Exception:
                continue
        if projs:
            result["investment_projections"] = projs

    # Try to find totals
    for key in ["total_monthly_savings_potential", "total_annual_savings_potential"]:
        m = re.search(rf'"{key}"\s*:\s*([\d.]+)', raw)
        if m:
            try:
                result[key] = float(m.group(1))
            except ValueError:
                pass

    return result
