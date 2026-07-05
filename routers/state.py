"""
Shared application state for all routers.

This module holds the global dictionaries and concurrency primitives
that are shared across the processing, editing, thumbnail, saasshorts,
and gallery routers.
"""

import os
import asyncio
from typing import Dict, List
from fastapi import WebSocket
from slowapi import Limiter
from slowapi.util import get_remote_address

from app_logger import logger
from routers.queue import job_queue

# ── Directory constants ──────────────────────────────────────────────
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "output"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Thumbnails directory (mounted separately) ────────────────────────
THUMBNAILS_DIR = os.path.join(OUTPUT_DIR, "thumbnails")
os.makedirs(THUMBNAILS_DIR, exist_ok=True)

# ── Concurrency ──────────────────────────────────────────────────────
MAX_CONCURRENT_JOBS = int(os.environ.get("MAX_CONCURRENT_JOBS", "5"))

# ── Processing job queue & state ─────────────────────────────────────
jobs: Dict[str, Dict] = {}

# ── Thumbnail studio sessions ────────────────────────────────────────
thumbnail_sessions: Dict[str, Dict] = {}

# ── Publish jobs (YouTube upload via Upload-Post) ────────────────────
publish_jobs: Dict[str, Dict] = {}

# ── SaaSShorts job state ─────────────────────────────────────────────
saas_jobs: Dict[str, Dict] = {}

# ── Concurrency semaphore (limits parallel background jobs) ──────────
concurrency_semaphore: asyncio.Semaphore = asyncio.Semaphore(MAX_CONCURRENT_JOBS)

# ── Capacity limits (DoS protection) ─────────────────────────────────
MAX_JOBS = 1000
MAX_THUMBNAIL_SESSIONS = 100
MAX_SAAS_JOBS = 500
MAX_FILE_SIZE_MB = 2048  # 2 GB upload limit
JOB_RETENTION_SECONDS = 3600  # 1 hour TTL
DISABLE_YOUTUBE_URL = os.environ.get("DISABLE_YOUTUBE_URL", "false").lower() in ("1", "true", "yes")


class ConnectionManager:
    """Manages WebSocket connections for real-time job status updates."""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, job_id: str):
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        self.active_connections[job_id].append(websocket)

    def disconnect(self, websocket: WebSocket, job_id: str):
        if job_id in self.active_connections:
            self.active_connections[job_id].remove(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]

    async def broadcast(self, job_id: str, message: dict):
        if job_id in self.active_connections:
            disconnected = []
            for ws in self.active_connections[job_id]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.debug(f"WebSocket send failed for job {job_id}: {e}")
                    disconnected.append(ws)
            for ws in disconnected:
                self.active_connections[job_id].remove(ws)


manager = ConnectionManager()

# ── Rate Limiting ────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
