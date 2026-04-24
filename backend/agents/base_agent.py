"""
Single investment agent — uses Claude on AWS Bedrock with streaming.
Emits individual strategies as they are parsed from the stream.
"""

import json
import os
import re
from dataclasses import dataclass

import boto3

BEDROCK_MODEL_ID = "eu.anthropic.claude-opus-4-6-v1"


@dataclass
class InvestmentStrategy:
    name: str
    risk_level: str
    symbol: str
    asset_type: str
    action: str
    amount_eur: float
    reasoning: str
    current_price: float
    target_price: float | None = None
    stop_loss: float | None = None
    time_horizon: str = ""
    confidence: float = 0.0
    risk_score: int = 0


@dataclass
class AgentResult:
    summary: str
    strategies: list[InvestmentStrategy]
    warnings: list[str]
    total_suggested_investment: float

    def to_dict(self) -> dict:
        return {
            "summary": self.summary,
            "total_suggested_investment": self.total_suggested_investment,
            "warnings": self.warnings,
            "strategies": [
                {
                    "name": s.name,
                    "risk_level": s.risk_level,
                    "symbol": s.symbol,
                    "asset_type": s.asset_type,
                    "action": s.action,
                    "amount_eur": s.amount_eur,
                    "reasoning": s.reasoning,
                    "current_price": s.current_price,
                    "target_price": s.target_price,
                    "stop_loss": s.stop_loss,
                    "time_horizon": s.time_horizon,
                    "confidence": s.confidence,
                    "risk_score": s.risk_score,
                }
                for s in self.strategies
            ],
        }


SYSTEM_PROMPT = """You are VoiceInvest Advisor, an expert AI investment analyst.

You have access to the user's bank account data and live market prices across ALL major asset classes (stocks, ETFs, commodities, crypto, forex, indices).

YOUR TASK:
Analyze the user's financial situation, review current market conditions, and produce exactly 5 investment strategies.

OUTPUT FORMAT:
You MUST output valid JSON and nothing else. No markdown, no narration, no explanation before or after.

Output this exact JSON structure:
{
    "summary": "Brief overall summary of your recommendation",
    "strategies": [
        {
            "name": "Strategy display name",
            "risk_level": "low|medium|high",
            "symbol": "TICKER",
            "asset_type": "stock|etf|commodity|crypto|forex|bond",
            "action": "BUY",
            "amount_eur": 50.00,
            "reasoning": "Detailed reasoning grounded in the data",
            "current_price": 150.00,
            "target_price": 165.00,
            "stop_loss": 140.00,
            "time_horizon": "3-6 months",
            "confidence": 0.85,
            "risk_score": 3
        }
    ],
    "warnings": ["Important caveats"]
}

RULES:
- Produce exactly 5 strategies: 2 low-risk, 2 medium-risk, 1 high-risk
- Never suggest investing more than the user can afford
- Use specific tickers from the market data provided
- Ground reasoning in actual prices and trends from the data
- Include realistic target prices and stop-losses
- Total investment across all 5 should not exceed 80% of available balance
- Output ONLY valid JSON, no other text
"""


def _get_bedrock_client():
    return boto3.client(
        "bedrock-runtime",
        region_name="eu-central-1",
    )


def _parse_strategy(s: dict) -> InvestmentStrategy:
    return InvestmentStrategy(
        name=s.get("name", ""),
        risk_level=s.get("risk_level", "medium"),
        symbol=s.get("symbol", ""),
        asset_type=s.get("asset_type", ""),
        action=s.get("action", "BUY"),
        amount_eur=float(s.get("amount_eur", 0)),
        reasoning=s.get("reasoning", ""),
        current_price=float(s.get("current_price", 0)),
        target_price=s.get("target_price"),
        stop_loss=s.get("stop_loss"),
        time_horizon=s.get("time_horizon", ""),
        confidence=float(s.get("confidence", 0)),
        risk_score=int(s.get("risk_score", 5)),
    )


def _strategy_to_dict(s: InvestmentStrategy) -> dict:
    return {
        "name": s.name,
        "risk_level": s.risk_level,
        "symbol": s.symbol,
        "asset_type": s.asset_type,
        "action": s.action,
        "amount_eur": s.amount_eur,
        "reasoning": s.reasoning,
        "current_price": s.current_price,
        "target_price": s.target_price,
        "stop_loss": s.stop_loss,
        "time_horizon": s.time_horizon,
        "confidence": s.confidence,
        "risk_score": s.risk_score,
    }


class InvestmentAgent:
    def _build_user_message(self, user_command: str, financial_context: str, market_data_text: str) -> str:
        return f"""USER'S REQUEST:
"{user_command}"

{financial_context}

{market_data_text}

Provide exactly 5 investment strategies as JSON only."""

    def analyze_streaming(self, user_command: str, financial_context: str, market_data_text: str):
        """Generator yielding events: thinking status, individual strategies, and done."""
        user_message = self._build_user_message(user_command, financial_context, market_data_text)
        client = _get_bedrock_client()
        use_streaming = True

        try:
            response = client.converse_stream(
                modelId=BEDROCK_MODEL_ID,
                system=[{"text": SYSTEM_PROMPT}],
                messages=[{"role": "user", "content": [{"text": user_message}]}],
                inferenceConfig={"maxTokens": 4096},
            )
        except Exception as e:
            if "AccessDenied" in str(type(e).__name__) or "AccessDenied" in str(e):
                use_streaming = False
            else:
                raise

        if use_streaming:
            full_text = ""
            emitted_count = 0
            for event in response["stream"]:
                if "contentBlockDelta" in event:
                    delta = event["contentBlockDelta"]["delta"]
                    if "text" in delta:
                        full_text += delta["text"]
                        new_strategies = self._try_extract_strategies(full_text, emitted_count)
                        for s in new_strategies:
                            emitted_count += 1
                            yield {"type": "strategy", "index": emitted_count - 1, "data": _strategy_to_dict(s)}
            yield {"type": "done", "full_text": full_text}
            return

        response = client.converse(
            modelId=BEDROCK_MODEL_ID,
            system=[{"text": SYSTEM_PROMPT}],
            messages=[{"role": "user", "content": [{"text": user_message}]}],
            inferenceConfig={"maxTokens": 4096},
        )
        full_text = response["output"]["message"]["content"][0]["text"]
        strategies = self._parse_all_strategies(full_text)
        for i, s in enumerate(strategies):
            yield {"type": "strategy", "index": i, "data": _strategy_to_dict(s)}
        yield {"type": "done", "full_text": full_text}

    def _try_extract_strategies(self, text: str, already_emitted: int) -> list[InvestmentStrategy]:
        """Try to incrementally extract strategies from partial JSON."""
        pattern = r'\{[^{}]*?"name"\s*:\s*"[^"]+?"[^{}]*?"risk_score"\s*:\s*\d+[^{}]*?\}'
        matches = list(re.finditer(pattern, text, re.DOTALL))
        new_strategies = []
        for match in matches[already_emitted:]:
            try:
                obj = json.loads(match.group())
                if "symbol" in obj and "name" in obj:
                    new_strategies.append(_parse_strategy(obj))
            except json.JSONDecodeError:
                continue
        return new_strategies

    def _parse_all_strategies(self, full_text: str) -> list[InvestmentStrategy]:
        """Parse the complete response."""
        try:
            json_start = full_text.find("{")
            json_end = full_text.rfind("}") + 1
            if json_start == -1:
                return []
            parsed = json.loads(full_text[json_start:json_end])
            return [_parse_strategy(s) for s in parsed.get("strategies", [])]
        except (json.JSONDecodeError, ValueError):
            return self._try_extract_strategies(full_text, 0)

    def parse_result(self, full_text: str) -> AgentResult:
        """Parse the complete JSON from the full text."""
        try:
            clean = full_text.strip()
            if clean.startswith("```"):
                clean = re.sub(r'^```\w*\n?', '', clean)
                clean = re.sub(r'\n?```$', '', clean)
            json_start = clean.find("{")
            json_end = clean.rfind("}") + 1
            parsed = json.loads(clean[json_start:json_end])
        except (json.JSONDecodeError, ValueError):
            strategies = self._try_extract_strategies(full_text, 0)
            return AgentResult(
                summary="Analysis complete.",
                strategies=strategies,
                warnings=[],
                total_suggested_investment=sum(s.amount_eur for s in strategies),
            )

        strategies = [_parse_strategy(s) for s in parsed.get("strategies", [])]
        total = sum(s.amount_eur for s in strategies)

        return AgentResult(
            summary=parsed.get("summary", ""),
            strategies=strategies,
            warnings=parsed.get("warnings", []),
            total_suggested_investment=total,
        )
