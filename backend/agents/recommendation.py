"""
Investment recommendation agent — gives hold/sell/buy-more advice
for an active investment using Claude on Bedrock.
"""

import asyncio
import json
from concurrent.futures import ThreadPoolExecutor

import boto3

BEDROCK_MODEL_ID = "eu.anthropic.claude-opus-4-6-v1"
_executor = ThreadPoolExecutor(max_workers=2)

SYSTEM_PROMPT = """You are a concise investment advisor. Given an active investment position and current market data, provide a short actionable recommendation.

OUTPUT FORMAT — valid JSON only, no markdown:
{
    "action": "HOLD|SELL|BUY_MORE",
    "summary": "2-3 sentence recommendation explaining why",
    "urgency": "low|medium|high",
    "revised_target": null or number,
    "revised_stop_loss": null or number
}

Be direct. Reference actual price movements and P&L. If the position is losing money, be honest about whether to cut losses or hold."""


def _call_bedrock(user_message: str) -> str:
    client = boto3.client("bedrock-runtime", region_name="eu-central-1")
    try:
        response = client.converse(
            modelId=BEDROCK_MODEL_ID,
            system=[{"text": SYSTEM_PROMPT}],
            messages=[{"role": "user", "content": [{"text": user_message}]}],
            inferenceConfig={"maxTokens": 512},
        )
        return response["output"]["message"]["content"][0]["text"]
    except Exception as e:
        return json.dumps({
            "action": "HOLD",
            "summary": f"Unable to get AI recommendation: {str(e)[:100]}. Holding position is safest default.",
            "urgency": "low",
            "revised_target": None,
            "revised_stop_loss": None,
        })


async def get_recommendation(enriched_investment: dict, market_text: str) -> dict:
    inv = enriched_investment
    user_msg = f"""ACTIVE INVESTMENT:
- {inv['name']} ({inv['symbol']}) — {inv['asset_type']}
- Action: {inv['action']}
- Entry price: ${inv['entry_price']}
- Current price: ${inv['current_price']}
- P&L: {inv['pnl_percent']:+.2f}% (€{inv['pnl_eur']:+.2f})
- Amount invested: €{inv['amount_eur']}
- Current value: €{inv['current_value_eur']}
- Target price: ${inv.get('target_price') or 'N/A'}
- Stop loss: ${inv.get('stop_loss') or 'N/A'}
- Time horizon: {inv.get('time_horizon', 'N/A')}
- Age: {inv['age_seconds']}s since execution

{market_text}

What should I do with this position? Respond with JSON only."""

    loop = asyncio.get_event_loop()
    raw = await loop.run_in_executor(_executor, _call_bedrock, user_msg)

    try:
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[-1].rsplit("```", 1)[0]
        return json.loads(clean)
    except (json.JSONDecodeError, ValueError):
        return {
            "action": "HOLD",
            "summary": raw[:300],
            "urgency": "low",
            "revised_target": None,
            "revised_stop_loss": None,
        }
