"""Analytics endpoints for tracking processing metrics."""
import os
import json
import time
from fastapi import APIRouter
from routers.state import OUTPUT_DIR, jobs, thumbnail_sessions, saas_jobs

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/stats")
async def get_stats():
    # Count total videos processed from output dirs
    total_jobs = len([d for d in os.listdir(OUTPUT_DIR) if os.path.isdir(os.path.join(OUTPUT_DIR, d))])
    
    # Active jobs
    active = sum(1 for j in jobs.values() if j.get("status") in ("queued", "processing"))
    completed = sum(1 for j in jobs.values() if j.get("status") == "completed")
    failed = sum(1 for j in jobs.values() if j.get("status") == "failed")
    
    # Count output clips
    clip_count = 0
    for d in os.listdir(OUTPUT_DIR):
        dp = os.path.join(OUTPUT_DIR, d)
        if os.path.isdir(dp):
            clip_count += len([f for f in os.listdir(dp) if f.endswith(".mp4")])
    
    return {
        "total_jobs_processed": total_jobs,
        "active_jobs": active,
        "completed_jobs": completed,
        "failed_jobs": failed,
        "total_clips_generated": clip_count,
        "active_sessions": len(thumbnail_sessions),
        "active_saas_jobs": len(saas_jobs),
    }

@router.get("/costs")
async def cost_estimates():
    """Estimated costs based on API usage."""
    total_clips = 0
    for d in os.listdir(OUTPUT_DIR):
        dp = os.path.join(OUTPUT_DIR, d)
        if os.path.isdir(dp):
            total_clips += len([f for f in os.listdir(dp) if f.endswith(".mp4")])
    
    # Approximate costs (Gemini free tier covers most)
    gemini_cost = max(0, (total_clips - 1500) * 0.002)  # $0.002 per clip after free tier
    storage_mb = sum(
        os.path.getsize(os.path.join(dp, f)) for d in os.listdir(OUTPUT_DIR)
        for dp in [os.path.join(OUTPUT_DIR, d)] if os.path.isdir(dp)
        for f in os.listdir(dp) if f.endswith(".mp4")
    ) / (1024 * 1024)
    
    return {
        "estimated_gemini_cost": round(gemini_cost, 2),
        "estimated_storage_mb": round(storage_mb, 1),
        "total_clips": total_clips,
        "note": "Gemini has 1500 free requests/day. Costs shown are estimates only.",
    }
