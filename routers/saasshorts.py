"""
SaaSShorts routes: AI UGC video generator for SaaS products.
"""

import os
import uuid
import json
import time
import asyncio
import functools
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request, Header
from pydantic import BaseModel

from app_logger import logger

from routers.state import (
    saas_jobs,
    concurrency_semaphore,
    OUTPUT_DIR,
    UPLOAD_DIR,
    MAX_FILE_SIZE_MB,
)

from saasshorts import (
    scrape_website,
    research_saas_online,
    analyze_saas,
    generate_scripts,
    generate_full_video,
    generate_actor_images,
    get_elevenlabs_voices,
    DEFAULT_VOICES,
)
from s3_uploader import upload_actor_to_s3, list_actor_gallery, upload_video_to_gallery, list_video_gallery

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════
# Pydantic models
# ═══════════════════════════════════════════════════════════════════════

class SaaSAnalyzeRequest(BaseModel):
    url: Optional[str] = None
    description: Optional[str] = None
    num_scripts: int = 3
    style: str = "ugc"
    language: str = "en"
    actor_gender: str = "female"


class SaaSActorRequest(BaseModel):
    actor_description: str
    num_options: int = 3
    product_description: Optional[str] = None


class SaaSPostRequest(BaseModel):
    job_id: str
    api_key: str
    user_id: str
    platforms: List[str]
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[str] = None
    timezone: Optional[str] = "UTC"


class SaaSGenerateRequest(BaseModel):
    script: dict
    voice_id: Optional[str] = None
    actor_description: Optional[str] = None
    selected_actor_url: Optional[str] = None
    retry_job_id: Optional[str] = None
    video_mode: str = "lowcost"


# ═══════════════════════════════════════════════════════════════════════
# Analyze
# ═══════════════════════════════════════════════════════════════════════

@router.post("/api/saasshorts/analyze", tags=["AI Shorts"])
async def saasshorts_analyze(
    req: SaaSAnalyzeRequest,
    x_gemini_key: Optional[str] = Header(None, alias="X-Gemini-Key"),
    x_openrouter_key: Optional[str] = Header(None, alias="X-OpenRouter-Key"),
    x_llm_provider: Optional[str] = Header(None, alias="X-LLM-Provider"),
    x_llm_model: Optional[str] = Header(None, alias="X-LLM-Model"),
):
    """Analyze a URL or manual description and generate video scripts."""
    gemini_key = x_gemini_key or x_openrouter_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
    provider = x_llm_provider or os.environ.get("LLM_PROVIDER", "gemini")
    model = x_llm_model or os.environ.get("LLM_MODEL") or None
    if not gemini_key:
        raise HTTPException(status_code=400, detail="Missing API key")

    if not req.url and not req.description:
        raise HTTPException(status_code=400, detail="Provide a URL or a product description")

    try:
        loop = asyncio.get_running_loop()

        def run_analysis():
            web_research = None

            if req.url and req.url.strip():
                scraped = scrape_website(req.url)
                web_research = research_saas_online(req.url, gemini_key, provider=provider, model=model)
                analysis = analyze_saas(scraped, gemini_key, web_research=web_research, provider=provider, model=model)
            else:
                analysis = {
                    "product_name": req.description.split(",")[0].strip()[:60] if req.description else "Product",
                    "description": req.description,
                    "value_proposition": req.description,
                    "target_audience": "general audience",
                    "key_features": [req.description],
                    "pain_points": [],
                    "tone": "casual and authentic",
                }

            scripts = generate_scripts(analysis, gemini_key, req.num_scripts, req.style, req.language, req.actor_gender, provider=provider, model=model)
            return {
                "analysis": analysis,
                "scripts": scripts,
                "web_research": web_research,
            }

        result = await loop.run_in_executor(None, run_analysis)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Actor upload
# ═══════════════════════════════════════════════════════════════════════

@router.post("/api/saasshorts/actor-upload", tags=["AI Shorts"])
async def saasshorts_actor_upload(file: UploadFile = File(...)):
    """Upload a custom actor image (stored locally only, not S3)."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    max_image_bytes = 10 * 1024 * 1024
    content = b""
    size = 0
    while chunk := await file.read(1024 * 1024):
        size += len(chunk)
        if size > max_image_bytes:
            raise HTTPException(status_code=413, detail="Image too large. Max 10MB")
        content += chunk

    if len(content) < 1000:
        raise HTTPException(status_code=400, detail="File too small to be a valid image")

    upload_id = uuid.uuid4().hex[:8]
    upload_dir = os.path.join(OUTPUT_DIR, "actor_uploads")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"custom_{upload_id}.png"
    file_path = os.path.join(upload_dir, filename)

    try:
        with open(file_path, "wb") as f:
            f.write(content)
        return {"url": f"/videos/actor_uploads/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Actor options (generate with fal.ai)
# ═══════════════════════════════════════════════════════════════════════

@router.post("/api/saasshorts/actor-options", tags=["AI Shorts"])
async def saasshorts_actor_options(
    req: SaaSActorRequest,
    x_fal_key: Optional[str] = Header(None, alias="X-Fal-Key"),
):
    """Generate multiple actor image options for the user to choose from."""
    fal_key = x_fal_key
    if not fal_key:
        raise HTTPException(status_code=400, detail="Missing fal.ai API Key")

    try:
        job_id = str(uuid.uuid4())
        out_dir = os.path.join(OUTPUT_DIR, f"saas_actors_{job_id}")
        os.makedirs(out_dir, exist_ok=True)

        loop = asyncio.get_running_loop()
        paths = await loop.run_in_executor(
            None,
            functools.partial(
                generate_actor_images,
                req.actor_description, fal_key, out_dir, "actor", req.num_options,
                product_description=req.product_description,
            ),
        )

        desc = req.actor_description
        if req.product_description:
            desc += f" (holding {req.product_description})"
        urls = []
        for p in paths:
            s3_url = upload_actor_to_s3(p, description=desc)
            if s3_url:
                urls.append(s3_url)
            else:
                urls.append(f"/videos/saas_actors_{job_id}/{os.path.basename(p)}")

        return {"images": urls}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Gallery
# ═══════════════════════════════════════════════════════════════════════

@router.get("/api/saasshorts/gallery", tags=["AI Shorts"])
async def saasshorts_video_gallery(limit: int = 50):
    """List all UGC videos from the public gallery."""
    try:
        loop = asyncio.get_running_loop()
        videos = await loop.run_in_executor(None, list_video_gallery, limit)
        return {"videos": videos, "total": len(videos)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/saasshorts/actor-gallery", tags=["AI Shorts"])
async def saasshorts_actor_gallery():
    """List all previously generated actor images from public S3."""
    try:
        loop = asyncio.get_running_loop()
        images = await loop.run_in_executor(None, list_actor_gallery)
        return {"images": images}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Voices
# ═══════════════════════════════════════════════════════════════════════

@router.get("/api/saasshorts/voices", tags=["AI Shorts"])
async def saasshorts_voices(
    x_elevenlabs_key: Optional[str] = Header(None, alias="X-ElevenLabs-Key"),
):
    """List available ElevenLabs voices."""
    if x_elevenlabs_key:
        try:
            loop = asyncio.get_running_loop()
            voices = await loop.run_in_executor(
                None, get_elevenlabs_voices, x_elevenlabs_key
            )
            if voices:
                return {"voices": voices, "source": "elevenlabs"}
        except Exception as e:
            logger.debug(f"Failed to fetch ElevenLabs voices, using defaults: {e}")

    return {
        "voices": [
            {"voice_id": vid, "name": name, "category": "default"}
            for name, vid in DEFAULT_VOICES.items()
        ],
        "source": "defaults",
    }


# ═══════════════════════════════════════════════════════════════════════
# Post to social
# ═══════════════════════════════════════════════════════════════════════

@router.post("/api/saasshorts/post", tags=["AI Shorts"])
async def saasshorts_post_to_socials(req: SaaSPostRequest):
    """Post an AI Shorts video to social media via Upload-Post."""
    import httpx

    if req.job_id not in saas_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = saas_jobs[req.job_id]
    result = job.get("result")
    if not result or not result.get("video_url"):
        raise HTTPException(status_code=400, detail="No video available for this job")

    try:
        video_url = result["video_url"]
        rel_path = video_url.replace("/videos/", "")
        file_path = os.path.join(OUTPUT_DIR, rel_path)

        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Video file not found")

        script = result.get("script", {})
        final_title = req.title or script.get("title", "AI Short")
        final_description = req.description or script.get("caption", "")
        if not final_description:
            final_description = script.get("full_narration", "Check this out!")

        url = "https://api.upload-post.com/api/upload"
        headers = {"Authorization": f"Apikey {req.api_key}"}

        data_payload = {
            "user": req.user_id,
            "title": final_title,
            "platform[]": req.platforms,
            "async_upload": "true",
        }

        if req.scheduled_date:
            data_payload["scheduled_date"] = req.scheduled_date
            if req.timezone:
                data_payload["timezone"] = req.timezone

        if "tiktok" in req.platforms:
            data_payload["tiktok_title"] = final_description
        if "instagram" in req.platforms:
            data_payload["instagram_title"] = final_description
            data_payload["media_type"] = "REELS"
        if "youtube" in req.platforms:
            data_payload["youtube_title"] = final_title
            data_payload["youtube_description"] = final_description
            data_payload["privacyStatus"] = "public"

        filename = os.path.basename(file_path)
        with open(file_path, "rb") as f:
            file_content = f.read()

        files = {"video": (filename, file_content, "video/mp4")}

        with httpx.Client(timeout=120.0) as client:
            logger.info(f"[AI Shorts] Sending to Upload-Post: {req.platforms}")
            response = client.post(url, headers=headers, data=data_payload, files=files)

        if response.status_code not in [200, 201, 202]:
            raise HTTPException(status_code=response.status_code, detail=f"Upload-Post Error: {response.text}")

        return response.json()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[AI Shorts] Post Exception: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Generate
# ═══════════════════════════════════════════════════════════════════════

@router.post("/api/saasshorts/generate", tags=["AI Shorts"])
async def saasshorts_generate(
    req: SaaSGenerateRequest,
    x_fal_key: Optional[str] = Header(None, alias="X-Fal-Key"),
    x_elevenlabs_key: Optional[str] = Header(None, alias="X-ElevenLabs-Key"),
):
    """Generate a SaaS UGC video from a script. Returns a job_id for polling."""
    import httpx

    fal_key = x_fal_key
    elevenlabs_key = x_elevenlabs_key

    if not fal_key:
        raise HTTPException(status_code=400, detail="Missing fal.ai API Key (X-Fal-Key header)")
    if not elevenlabs_key:
        raise HTTPException(status_code=400, detail="Missing ElevenLabs API Key (X-ElevenLabs-Key header)")

    reused = False
    if req.retry_job_id:
        old_dir = os.path.join(OUTPUT_DIR, f"saas_{req.retry_job_id}")
        if req.retry_job_id in saas_jobs:
            old_dir = saas_jobs[req.retry_job_id]["output_dir"]

        if os.path.isdir(old_dir):
            job_id = req.retry_job_id
            job_output_dir = old_dir
            reused = True
            for f in os.listdir(old_dir):
                fp = os.path.join(old_dir, f)
                if f.endswith("_final.mp4") and os.path.getsize(fp) == 0:
                    os.remove(fp)
            saas_jobs[job_id] = {
                "status": "processing",
                "logs": [f"Retrying job {job_id[:8]}... reusing cached assets from disk."],
                "result": None,
                "output_dir": job_output_dir,
                "created_at": time.time(),
            }

    if not reused:
        job_id = str(uuid.uuid4())
        job_output_dir = os.path.join(OUTPUT_DIR, f"saas_{job_id}")
        os.makedirs(job_output_dir, exist_ok=True)
        saas_jobs[job_id] = {
            "status": "processing",
            "logs": ["SaaSShorts job started."],
            "result": None,
            "output_dir": job_output_dir,
            "created_at": time.time(),
        }

    selected_actor_path = None
    if req.selected_actor_url:
        if req.selected_actor_url.startswith("http"):
            try:
                actor_local = os.path.join(job_output_dir, "selected_actor.png")
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.get(req.selected_actor_url)
                    if resp.status_code == 200:
                        with open(actor_local, "wb") as f:
                            f.write(resp.content)
                        selected_actor_path = actor_local
            except Exception as e:
                logger.warning(f"Failed to download selected actor image: {e}")
        else:
            src = os.path.join(OUTPUT_DIR, req.selected_actor_url.replace("/videos/", ""))
            if os.path.exists(src):
                selected_actor_path = src

    config = {
        "fal_key": fal_key,
        "elevenlabs_key": elevenlabs_key,
        "voice_id": req.voice_id or "21m00Tcm4TlvDq8ikWAM",
        "actor_description": req.actor_description,
        "selected_actor_path": selected_actor_path,
        "video_mode": req.video_mode,
    }

    async def run_generation():
        await concurrency_semaphore.acquire()
        try:
            loop = asyncio.get_running_loop()

            def log_msg(msg):
                logger.info(f"[SaaSShorts Job {job_id[:8]}] {msg}")
                if job_id in saas_jobs:
                    saas_jobs[job_id]["logs"].append(msg)

            def run():
                return generate_full_video(req.script, config, job_output_dir, log_msg)

            result = await loop.run_in_executor(None, run)

            if job_id in saas_jobs:
                video_filename = result["video_filename"]
                saas_jobs[job_id]["status"] = "completed"
                saas_jobs[job_id]["result"] = {
                    "video_url": f"/videos/saas_{job_id}/{video_filename}",
                    "video_filename": video_filename,
                    "duration": result.get("duration", 0),
                    "cost_estimate": result.get("cost_estimate", {}),
                    "script": req.script,
                }
                saas_jobs[job_id]["logs"].append("Video generation completed!")

                try:
                    gallery_meta = {
                        "title": req.script.get("title", "Untitled"),
                        "hook_text": req.script.get("hook_text", ""),
                        "caption": req.script.get("caption", ""),
                        "hashtags": req.script.get("hashtags", []),
                        "full_narration": req.script.get("full_narration", ""),
                        "actor_description": req.script.get("actor_description", ""),
                        "style": req.script.get("style", "ugc"),
                        "language": req.script.get("language", "en"),
                        "duration": result.get("duration", 0),
                        "video_mode": req.video_mode,
                        "product_name": req.script.get("_product_name", ""),
                        "product_url": req.script.get("_product_url", ""),
                        "segments": req.script.get("segments", []),
                        "cost_estimate": result.get("cost_estimate", {}),
                    }
                    gallery_result = upload_video_to_gallery(
                        video_path=result["video_path"],
                        actor_image_path=result.get("actor_image", ""),
                        metadata=gallery_meta,
                        video_id=job_id[:8],
                    )
                    if gallery_result:
                        saas_jobs[job_id]["result"]["gallery_video_id"] = gallery_result["video_id"]
                        log_msg("Uploaded to public gallery.")
                except Exception as gallery_err:
                    log_msg(f"Gallery upload skipped: {gallery_err}")

        except Exception as e:
            logger.error(f"[SaaSShorts] Job {job_id} failed: {e}")
            if job_id in saas_jobs:
                saas_jobs[job_id]["status"] = "failed"
                saas_jobs[job_id]["logs"].append(f"Error: {str(e)}")
        finally:
            concurrency_semaphore.release()

    asyncio.create_task(run_generation())

    return {"job_id": job_id, "status": "processing"}


# ═══════════════════════════════════════════════════════════════════════
# Status
# ═══════════════════════════════════════════════════════════════════════

@router.get("/api/saasshorts/status/{job_id}", tags=["AI Shorts"])
async def saasshorts_status(job_id: str):
    """Poll SaaSShorts job status."""
    if job_id not in saas_jobs:
        raise HTTPException(status_code=404, detail="SaaSShorts job not found")

    job = saas_jobs[job_id]
    return {
        "status": job["status"],
        "logs": job["logs"],
        "result": job.get("result"),
    }



