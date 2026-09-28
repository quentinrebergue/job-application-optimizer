# System design exercises don't have a single code solution.
# This file illustrates the key API contract and request lifecycle.

# --- API Contract ---
# POST /v1/completions
# {
#   "model": "mistral-7b",
#   "prompt": "string",
#   "max_tokens": 256,
#   "stream": true
# }
#
# Streaming response (SSE):
# data: {"id":"...","choices":[{"delta":{"content":"Hello"}}]}
# data: {"id":"...","choices":[{"delta":{"content":" world"}}]}
# data: [DONE]

# --- Simplified request queue + worker model ---

import asyncio
from dataclasses import dataclass, field
from typing import AsyncIterator


@dataclass
class InferenceRequest:
    id: str
    prompt: str
    max_tokens: int
    future: asyncio.Future = field(default_factory=asyncio.Future)


class InferenceQueue:
    def __init__(self):
        self.queue: list[InferenceRequest] = []
        self.processing = False

    async def enqueue(self, req: InferenceRequest) -> AsyncIterator[str]:
        self.queue.append(req)
        if not self.processing:
            asyncio.create_task(self._process_next())
        return await req.future

    async def _process_next(self) -> None:
        if not self.queue:
            self.processing = False
            return
        self.processing = True
        req = self.queue.pop(0)
        try:
            # In production: gRPC call to GPU worker (vLLM / TGI)
            stream = await self._call_gpu_worker(req)
            req.future.set_result(stream)
        except Exception as err:
            req.future.set_exception(err)
        await self._process_next()

    async def _call_gpu_worker(self, req: InferenceRequest) -> AsyncIterator[str]:
        # Stub — real implementation sends gRPC to vLLM and returns token stream
        raise NotImplementedError
