"""
Video processing routes: upload, queue, status, and background workers.
"""

import os
import re
import uuid
import json
import glob
import time
import shutil
import subprocess
import threading
import asyncio
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from pydantic import BaseModel
from dotenv import load_dotenv

from app_logger import logger

from routers.webhooks import dispatch_webhooks

from routers.state import (
    job_queue,
    jobs,
    concurrency_semaphore,
    manager,
    UPLOAD_DIR,
    OUTPUT_DIR,
    MAX_FILE_SIZE_MB,
    JOB_RETENTION_SECONDS,
    DISABLE_YOUTUBE_URL,
    MAX_JOBS,
    MAX_THUMBNAIL_SESSIONS,
    MAX_SAAS_JOBS,
    thumbnail_sessions,
    saas_jobs,
    THUMBNAILS_DIR,
)

load_dotenv()

router = APIRouter()

# ── Constants local to this module ───────────────────────────────────
RENDER_SERVICE_URL = os.getenv("RENDER_SERVICE_URL", "http://renderer:3100")

# ── Pydantic models ──────────────────────────────────────────────────

class ProcessRequest(BaseModel):
    url: str


# ═══════════════════════════════════════════════════════════════════════
# Background workers
# ═══════════════════════════════════════════════════════════════════════

def _relocate_root_job_artifacts(job_id: str, job_output_dir: str) -> bool:
    """
    Backward-compat rescue:
    If main.py accidentally wrote metadata/clips into OUTPUT_DIR root (e.g. output/<jobid>_...),
    move them into output/<job_id>/ so the API can find and serve them.
    """
    try:
        os.makedirs(job_output_dir, exist_ok=True)
        root = OUTPUT_DIR
        pattern = os.path.join(root, f"{job_id}_*_metadata.json")
        meta_candidates = sorted(glob.glob(pattern), key=lambda p: os.path.getmtime(p), reverse=True)
        if not meta_candidates:
            return False

        # Move the newest metadata and its associated clips.
        metadata_path = meta_candidates[0]
        base_name = os.path.basename(metadata_path).replace("_metadata.json", "")

        # Move metadata
        dest_metadata = os.path.join(job_output_dir, os.path.basename(metadata_path))
        if os.path.abspath(metadata_path) != os.path.abspath(dest_metadata):
            shutil.move(metadata_path, dest_metadata)

        # Move any clips that match the same base_name into the job folder
        clip_pattern = os.path.join(root, f"{base_name}_clip_*.mp4")
        for clip_path in glob.glob(clip_pattern):
            dest_clip = os.path.join(job_output_dir, os.path.basename(clip_path))
            if os.path.abspath(clip_path) != os.path.abspath(dest_clip):
                shutil.move(clip_path, dest_clip)

        # Also move any temp_ clips that might remain
        temp_clip_pattern = os.path.join(root, f"temp_{base_name}_clip_*.mp4")
        for clip_path in glob.glob(temp_clip_pattern):
            dest_clip = os.path.join(job_output_dir, os.path.basename(clip_path))
            if os.path.abspath(clip_path) != os.path.abspath(dest_clip):
                shutil.move(clip_path, dest_clip)

        return True
    except Exception:
        return False


async def cleanup_jobs():
    """Background task to remove old jobs and files with TTL and capacity limits."""
    logger.info("Cleanup task started.")
    while True:
        try:
            await asyncio.sleep(300)  # Check every 5 minutes
            now = time.time()

            # Simple directory cleanup based on modification time
            for job_id in os.listdir(OUTPUT_DIR):
                job_path = os.path.join(OUTPUT_DIR, job_id)
                if os.path.isdir(job_path):
                    if now - os.path.getmtime(job_path) > JOB_RETENTION_SECONDS:
                        logger.info(f"Purging old job: {job_id}")
                        shutil.rmtree(job_path, ignore_errors=True)
                        if job_id in jobs:
                            del jobs[job_id]

            # Enforce capacity limits
            if len(jobs) > MAX_JOBS:
                oldest = sorted(jobs.keys(), key=lambda k: jobs[k].get("created_at", 0))[:len(jobs) - MAX_JOBS]
                for jid in oldest:
                    del jobs[jid]

            # Cleanup SaaSShorts jobs
            saas_expired = [
                jid for jid, jdata in list(saas_jobs.items())
                if jdata.get("status") in ("completed", "failed")
                and jdata.get("output_dir")
                and os.path.isdir(jdata["output_dir"])
                and now - os.path.getmtime(jdata["output_dir"]) > JOB_RETENTION_SECONDS
            ]
            for jid in saas_expired:
                del saas_jobs[jid]

            # Enforce saas_jobs capacity limit
            if len(saas_jobs) > MAX_SAAS_JOBS:
                oldest = sorted(saas_jobs.keys(), key=lambda k: saas_jobs[k].get("created_at", 0))[:len(saas_jobs) - MAX_SAAS_JOBS]
                for jid in oldest:
                    del saas_jobs[jid]

            # Cleanup thumbnail sessions
            expired_sessions = [
                sid for sid, sdata in list(thumbnail_sessions.items())
                if now - sdata.get("created_at", 0) > JOB_RETENTION_SECONDS
            ]
            for sid in expired_sessions:
                del thumbnail_sessions[sid]

            if len(thumbnail_sessions) > MAX_THUMBNAIL_SESSIONS:
                oldest = sorted(thumbnail_sessions.keys(), key=lambda k: thumbnail_sessions[k].get("created_at", 0))[:len(thumbnail_sessions) - MAX_THUMBNAIL_SESSIONS]
                for sid in oldest:
                    del thumbnail_sessions[sid]

            # Cleanup Uploads
            for filename in os.listdir(UPLOAD_DIR):
                file_path = os.path.join(UPLOAD_DIR, filename)
                try:
                    if now - os.path.getmtime(file_path) > JOB_RETENTION_SECONDS:
                        os.remove(file_path)
                except Exception:
                    pass

        except Exception as e:
            logger.warning(f"Cleanup error: {e}")


def enqueue_output(out, job_id):
    """Reads output from a subprocess and appends it to jobs logs."""
    try:
        for line in iter(out.readline, b''):
            decoded_line = line.decode('utf-8').strip()
            if decoded_line:
                logger.info(f"[Job Output] {decoded_line}")
                if job_id in jobs:
                    jobs[job_id]['logs'].append(decoded_line)
    except Exception as e:
        logger.error(f"Error reading output for job {job_id}: {e}")
    finally:
        out.close()


async def run_job(job_id, job_data):
    """Executes the subprocess for a specific job."""
    cmd = job_data['cmd']
    env = job_data['env']
    output_dir = job_data['output_dir']

    jobs[job_id]['status'] = 'processing'
    jobs[job_id]['logs'].append("Job started by worker.")
    await manager.broadcast(job_id, {"status": "processing", "job_id": job_id})
    logger.info(f"[run_job] Executing command for {job_id}: {' '.join(cmd)}")

    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env=env,
            cwd=os.getcwd()
        )

        t_log = threading.Thread(target=enqueue_output, args=(process.stdout, job_id))
        t_log.daemon = True
        t_log.start()

        # Async wait for process with incremental updates
        while process.poll() is None:
            await asyncio.sleep(2)

            # Check for partial results every 2 seconds
            try:
                json_files = glob.glob(os.path.join(output_dir, "*_metadata.json"))
                if json_files:
                    target_json = json_files[0]
                    if os.path.getsize(target_json) > 0:
                        with open(target_json, 'r') as f:
                            data = json.load(f)

                        base_name = os.path.basename(target_json).replace('_metadata.json', '')
                        clips = data.get('shorts', [])
                        cost_analysis = data.get('cost_analysis')

                        ready_clips = []
                        for i, clip in enumerate(clips):
                            clip_filename = f"{base_name}_clip_{i+1}.mp4"
                            clip_path = os.path.join(output_dir, clip_filename)
                            if os.path.exists(clip_path) and os.path.getsize(clip_path) > 0:
                                clip['video_url'] = f"/videos/{job_id}/{clip_filename}"
                                ready_clips.append(clip)

                        if ready_clips:
                            jobs[job_id]['result'] = {'clips': ready_clips, 'cost_analysis': cost_analysis}
            except Exception:
                pass

        returncode = process.returncode

        if returncode == 0:
            jobs[job_id]['status'] = 'completed'
            jobs[job_id]['logs'].append("Process finished successfully.")
            await manager.broadcast(job_id, {"status": "completed", "job_id": job_id})
            asyncio.create_task(dispatch_webhooks("job.completed", job_id, {"status": "completed", "job_id": job_id}))

            # Start S3 upload in background (silent, non-blocking)
            from s3_uploader import upload_job_artifacts
            loop = asyncio.get_running_loop()
            loop.run_in_executor(None, upload_job_artifacts, output_dir, job_id)

            # Find result JSON
            json_files = glob.glob(os.path.join(output_dir, "*_metadata.json"))
            if not json_files:
                if _relocate_root_job_artifacts(job_id, output_dir):
                    json_files = glob.glob(os.path.join(output_dir, "*_metadata.json"))
            if json_files:
                target_json = json_files[0]
                with open(target_json, 'r') as f:
                    data = json.load(f)

                base_name = os.path.basename(target_json).replace('_metadata.json', '')
                clips = data.get('shorts', [])
                cost_analysis = data.get('cost_analysis')

                for i, clip in enumerate(clips):
                    clip_filename = f"{base_name}_clip_{i+1}.mp4"
                    clip['video_url'] = f"/videos/{job_id}/{clip_filename}"

                jobs[job_id]['result'] = {'clips': clips, 'cost_analysis': cost_analysis}
            else:
                jobs[job_id]['status'] = 'failed'
                jobs[job_id]['logs'].append("No metadata file generated.")
                await manager.broadcast(job_id, {"status": "failed", "job_id": job_id})
                asyncio.create_task(dispatch_webhooks("job.failed", job_id, {"status": "failed", "job_id": job_id}))
        else:
            jobs[job_id]['status'] = 'failed'
            jobs[job_id]['logs'].append(f"Process failed with exit code {returncode}")
            await manager.broadcast(job_id, {"status": "failed", "job_id": job_id})
            asyncio.create_task(dispatch_webhooks("job.failed", job_id, {"status": "failed", "job_id": job_id}))

    except Exception as e:
        jobs[job_id]['status'] = 'failed'
        jobs[job_id]['logs'].append(f"Execution error: {str(e)}")
        await manager.broadcast(job_id, {"status": "failed", "job_id": job_id})
        asyncio.create_task(dispatch_webhooks("job.failed", job_id, {"status": "failed", "job_id": job_id}))


async def run_job_wrapper(job_id):
    """Wrapper to run job and release semaphore"""
    try:
        job = jobs.get(job_id)
        if job:
            await run_job(job_id, job)
    except Exception as e:
        logger.error(f"Job wrapper error {job_id}: {e}")
    finally:
        concurrency_semaphore.release()
        job_queue.task_done()
        logger.info(f"Released slot for job: {job_id}")


async def process_queue():
    """Background worker to process jobs from the queue with concurrency limit."""
    logger.info(f"Job Queue Worker started.")
    while True:
        try:
            job_id = await job_queue.get()
            await concurrency_semaphore.acquire()
            logger.info(f"Acquired slot for job: {job_id}")
            asyncio.create_task(run_job_wrapper(job_id))
        except Exception as e:
            logger.error(f"Queue dispatch error: {e}")
            await asyncio.sleep(1)


# ═══════════════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════════════

@router.get("/api/config")
async def get_config():
    return {"youtubeUrlEnabled": not DISABLE_YOUTUBE_URL}


@router.post("/api/process")
async def process_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    acknowledged: Optional[str] = Form(None)
):
    api_key = request.headers.get("X-Gemini-Key") or request.headers.get("X-OpenRouter-Key")
    llm_provider = request.headers.get("X-LLM-Provider", "gemini")
    llm_model = request.headers.get("X-LLM-Model", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="Missing API key header (X-Gemini-Key or X-OpenRouter-Key)")

    ack_flag = str(acknowledged).lower() in ("1", "true", "yes")

    # Handle JSON body manually for URL payload
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        url = body.get("url")
        ack_flag = bool(body.get("acknowledged"))

    if not url and not file:
        raise HTTPException(status_code=400, detail="Must provide URL or File")

    if not ack_flag:
        raise HTTPException(status_code=400, detail="You must confirm you own the content or have rights to process it.")

    if url and DISABLE_YOUTUBE_URL:
        raise HTTPException(status_code=403, detail="YouTube URL ingest is disabled on this deployment. Please upload a file you own.")

    # Capture attestation context for legal record (IP + timestamp + UA)
    client_ip = request.client.host if request.client else "unknown"
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        client_ip = fwd.split(",")[0].strip()
    user_agent = request.headers.get("user-agent", "")
    attestation = {
        "acknowledged": True,
        "ip": client_ip,
        "user_agent": user_agent,
        "timestamp": time.time(),
        "source": "url" if url else "file",
    }

    job_id = str(uuid.uuid4())
    job_output_dir = os.path.join(OUTPUT_DIR, job_id)
    os.makedirs(job_output_dir, exist_ok=True)

    # Prepare Command
    cmd = ["python3", "-u", "main.py"]
    env = os.environ.copy()
    env["GEMINI_API_KEY"] = api_key
    env["LLM_PROVIDER"] = llm_provider
    if llm_model:
        env["LLM_MODEL"] = llm_model
    if llm_provider == "openrouter":
        env["OPENROUTER_API_KEY"] = api_key

    if url:
        cmd.extend(["-u", url])
    else:
        safe_filename = os.path.basename(file.filename) if file.filename else "upload"
        safe_filename = re.sub(r'[/\\]', '_', safe_filename)
        input_path = os.path.join(UPLOAD_DIR, f"{job_id}_{safe_filename}")

        size = 0
        limit_bytes = MAX_FILE_SIZE_MB * 1024 * 1024

        with open(input_path, "wb") as buffer:
            while content := await file.read(1024 * 1024):
                size += len(content)
                if size > limit_bytes:
                    os.remove(input_path)
                    shutil.rmtree(job_output_dir)
                    raise HTTPException(status_code=413, detail=f"File too large. Max size {MAX_FILE_SIZE_MB}MB")
                buffer.write(content)

        cmd.extend(["-i", input_path])

    cmd.extend(["-o", job_output_dir])

    logger.info(f"[attestation] job={job_id} ip={attestation['ip']} source={attestation['source']} ack=true")

    # Enqueue Job
    jobs[job_id] = {
        'status': 'queued',
        'logs': [f"Job {job_id} queued."],
        'cmd': cmd,
        'env': env,
        'output_dir': job_output_dir,
        'attestation': attestation,
        'created_at': time.time()
    }

    await job_queue.put(job_id)

    return {"job_id": job_id, "status": "queued"}


@router.get("/api/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]
    return {
        "status": job['status'],
        "logs": job['logs'],
        "result": job.get('result')
    }


@router.get("/api/clip/{job_id}/{clip_index}/transcript")
async def get_clip_transcript(job_id: str, clip_index: int):
    """Return word-level captions for a specific clip, formatted for Remotion."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    output_dir = os.path.join(OUTPUT_DIR, job_id)
    json_files = glob.glob(os.path.join(output_dir, "*_metadata.json"))

    if not json_files:
        raise HTTPException(status_code=404, detail="Metadata not found")

    with open(json_files[0], 'r') as f:
        data = json.load(f)

    transcript = data.get('transcript')
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript not found in metadata")

    clips = data.get('shorts', [])
    if clip_index >= len(clips):
        raise HTTPException(status_code=404, detail="Clip not found")

    clip_data = clips[clip_index]
    clip_start = clip_data.get('start', 0)
    clip_end = clip_data.get('end', 0)

    # Extract words within clip range and convert to CaptionWord format
    captions = []
    for segment in transcript.get('segments', []):
        for word_info in segment.get('words', []):
            if word_info['end'] > clip_start and word_info['start'] < clip_end:
                captions.append({
                    "text": word_info.get('word', '').strip(),
                    "startMs": int((max(0, word_info['start'] - clip_start)) * 1000),
                    "endMs": int((max(0, word_info['end'] - clip_start)) * 1000),
                })

    duration_sec = clip_end - clip_start

    return {
        "captions": captions,
        "durationSec": duration_sec,
        "language": transcript.get('language', 'en'),
    }


# ── Remotion Render Proxy ────────────────────────────────────────────

@router.post("/api/render")
async def proxy_render(request: Request):
    """Proxy render requests to the Node.js Remotion render service."""
    import httpx
    body = await request.json()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{RENDER_SERVICE_URL}/render", json=body)
            return resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Render service unavailable: {e}")


@router.get("/api/render/{render_id}")
async def proxy_render_status(render_id: str):
    """Proxy render status polling to the Node.js Remotion render service."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{RENDER_SERVICE_URL}/render/{render_id}")
            return resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Render service unavailable: {e}")
