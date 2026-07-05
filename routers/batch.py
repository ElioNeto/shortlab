"""Batch processing router for multiple videos."""
import os
import uuid
import asyncio
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from routers.state import UPLOAD_DIR, OUTPUT_DIR, jobs, job_queue, MAX_FILE_SIZE_MB
from app_logger import logger

router = APIRouter(prefix="/api/batch", tags=["Processing"])

BATCH_CONCURRENCY = int(os.environ.get("BATCH_CONCURRENCY", "3"))


@router.post("/process")
async def batch_process(
    request: Request,
    files: list[UploadFile] = File(...),
    acknowledged: Optional[str] = Form(None)
):
    if not files or len(files) > 10:
        raise HTTPException(status_code=400, detail="Upload 1-10 files")

    api_key = request.headers.get("X-Gemini-Key") or request.headers.get("X-OpenRouter-Key")
    if not api_key:
        raise HTTPException(status_code=400, detail="API key required")

    batch_id = uuid.uuid4().hex[:12]
    job_ids = []

    for file in files:
        job_id = uuid.uuid4().hex[:12]
        safe_name = os.path.basename(file.filename) if file.filename else "upload"
        input_path = os.path.join(UPLOAD_DIR, f"{job_id}_{safe_name}")

        limit_bytes = MAX_FILE_SIZE_MB * 1024 * 1024
        size = 0
        with open(input_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > limit_bytes:
                    os.remove(input_path)
                    raise HTTPException(status_code=413, detail=f"File too large: {file.filename}")
                buffer.write(chunk)

        job_output_dir = os.path.join(OUTPUT_DIR, job_id)
        os.makedirs(job_output_dir, exist_ok=True)

        cmd = ["python", "main.py", "-i", input_path, "-o", job_output_dir]

        job_env = {}
        if api_key:
            job_env["GEMINI_API_KEY"] = api_key
            job_env["OPENROUTER_API_KEY"] = api_key

        jobs[job_id] = {
            "status": "queued",
            "logs": [f"Batch {batch_id}: {file.filename}"],
            "cmd": cmd,
            "env": job_env,
            "output_dir": job_output_dir,
            "batch_id": batch_id,
        }

        await job_queue.put(job_id)
        job_ids.append({"job_id": job_id, "filename": file.filename})

    return {"batch_id": batch_id, "jobs": job_ids, "count": len(job_ids)}


@router.get("/status/{batch_id}")
async def batch_status(batch_id: str):
    batch_jobs = [(jid, j) for jid, j in jobs.items() if j.get("batch_id") == batch_id]
    return {
        "batch_id": batch_id,
        "total": len(batch_jobs),
        "jobs": [
            {
                "job_id": jid,
                "status": j.get("status"),
                "filename": j.get("logs", [""])[0] if j.get("logs") else "",
            }
            for jid, j in batch_jobs
        ],
    }
