"""
Agent orchestrator — runs a single investment agent, forwarding
individual strategy events as they stream in.
"""

import asyncio
import time
from concurrent.futures import ThreadPoolExecutor

from .base_agent import AgentResult, InvestmentAgent


class AgentOrchestrator:
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=1)
        self.agent = InvestmentAgent()

    async def analyze_streaming(
        self,
        user_command: str,
        financial_context: str,
        market_data_text: str,
        event_queue: asyncio.Queue,
    ) -> AgentResult:
        loop = asyncio.get_event_loop()
        start = time.time()
        full_text = ""
        error_msg = None
        event_buffer = []

        def collect():
            nonlocal full_text, error_msg
            try:
                for event in self.agent.analyze_streaming(user_command, financial_context, market_data_text):
                    event_buffer.append(event)
                    if event["type"] == "done":
                        full_text = event["full_text"]
            except Exception as e:
                error_msg = str(e)

        task = loop.run_in_executor(self.executor, collect)

        sent = 0
        while not task.done():
            await asyncio.sleep(0.15)
            while sent < len(event_buffer):
                ev = event_buffer[sent]
                sent += 1
                if ev["type"] == "strategy":
                    await event_queue.put(ev)

        await task

        while sent < len(event_buffer):
            ev = event_buffer[sent]
            sent += 1
            if ev["type"] == "strategy":
                await event_queue.put(ev)

        if error_msg:
            await event_queue.put({
                "type": "agent_error",
                "message": f"Agent error: {error_msg[:300]}",
            })
            return AgentResult(
                summary="Analysis failed.",
                strategies=[],
                warnings=[error_msg],
                total_suggested_investment=0.0,
            )

        elapsed = round(time.time() - start, 1)
        result = self.agent.parse_result(full_text)

        await event_queue.put({
            "type": "agent_complete",
            "elapsed_seconds": elapsed,
            "message": f"Done in {elapsed}s",
        })

        return result
