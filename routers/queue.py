"""Job queue with Redis support and in-memory fallback."""
import os
import json
import asyncio
from typing import Optional

REDIS_URL = os.environ.get("REDIS_URL", "")


class JobQueue:
    def __init__(self):
        self._redis = None
        self._memory_queue = asyncio.Queue()
        self._use_redis = bool(REDIS_URL)

        if self._use_redis:
            try:
                import redis.asyncio as aioredis
                self._redis = aioredis.from_url(REDIS_URL, decode_responses=True)
            except Exception as e:
                print(f"[Queue] Redis unavailable, falling back to in-memory: {e}")
                self._use_redis = False

    async def put(self, job_id: str, data: dict = None):
        if self._use_redis and self._redis:
            await self._redis.lpush("job_queue", json.dumps({"job_id": job_id, "data": data}))
            await self._redis.hset(f"job:{job_id}", mapping=data or {})
        else:
            await self._memory_queue.put(job_id)

    async def get(self) -> str:
        if self._use_redis and self._redis:
            _, item = await self._redis.brpop("job_queue", timeout=30)
            return json.loads(item)["job_id"]
        return await self._memory_queue.get()

    async def task_done(self):
        if not self._use_redis:
            self._memory_queue.task_done()


job_queue = JobQueue()
