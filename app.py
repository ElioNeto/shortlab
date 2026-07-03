"""
ShortLab API — FastAPI application entry point.

This module wires together all routers, middleware, and background workers.
Route logic lives in the routers/ package.
"""

import os
import asyncio
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

from app_logger import logger as app_logger

from routers.auth import router as auth_router
from routers.processing import router as processing_router, process_queue, cleanup_jobs
from routers.editing import router as editing_router
from routers.social import router as social_router
from routers.thumbnail import router as thumbnail_router
from routers.saasshorts import router as saasshorts_router
from routers.gallery import router as gallery_router
from routers.templates import router as templates_router
from routers.analytics import router as analytics_router
from routers.plugins import router as plugins_router
from routers.abtesting import router as abtesting_router
from routers.manual_editor import router as manual_editor_router

from routers.state import OUTPUT_DIR, THUMBNAILS_DIR

load_dotenv()

# ── API Key Authentication ───────────────────────────────────────────
API_AUTH_KEY = os.environ.get("API_AUTH_KEY", "")
ENABLE_AUTH = bool(API_AUTH_KEY)


async def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """Dependency to verify API key for protected endpoints."""
    if not ENABLE_AUTH:
        return True
    if not x_api_key or x_api_key != API_AUTH_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")
    return True


# ── Rate Limiting ────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


# ── Lifespan (start background workers) ──────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    worker_task = asyncio.create_task(process_queue())
    cleanup_task = asyncio.create_task(cleanup_jobs())
    yield
    # Cleanup would go here if needed


# ── Application ──────────────────────────────────────────────────────
app = FastAPI(
    lifespan=lifespan,
    title="ShortLab API",
    description="AI-powered vertical video generator API. Generate viral short clips, AI UGC videos, and manage YouTube publishing.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "Processing", "description": "Video processing and clip generation"},
        {"name": "Editing", "description": "Subtitles, hooks, effects, translation, manual editing, PiP, split screen"},
        {"name": "Thumbnails", "description": "AI thumbnail and title generation"},
        {"name": "Social", "description": "Social media publishing"},
        {"name": "AI Shorts", "description": "AI UGC video generation"},
        {"name": "Gallery", "description": "Public video gallery"},
        {"name": "WebSocket", "description": "Real-time job status updates"},
    ],
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS — restricted to specific origins ────────────────────────────
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5175").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static file mounts ───────────────────────────────────────────────
app.mount("/videos", StaticFiles(directory=OUTPUT_DIR), name="videos")
app.mount("/thumbnails", StaticFiles(directory=THUMBNAILS_DIR), name="thumbnails")

# ── Auth middleware for /api/ routes ─────────────────────────────────
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if ENABLE_AUTH and request.url.path.startswith("/api/") and request.url.path not in ("/api/config", "/api/status", "/health"):
        api_key = request.headers.get("X-API-Key")
        if not api_key or api_key != API_AUTH_KEY:
            return JSONResponse(status_code=403, content={"detail": "Invalid or missing API key"})
    response = await call_next(request)
    return response


# ── Health check ─────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Routers ──────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(processing_router)
app.include_router(editing_router)
app.include_router(social_router)
app.include_router(thumbnail_router)
app.include_router(saasshorts_router)
app.include_router(gallery_router)
app.include_router(templates_router)
app.include_router(analytics_router)
app.include_router(plugins_router)
app.include_router(abtesting_router)
app.include_router(manual_editor_router)
app.include_router(batch_router)
app.include_router(preview_router)
