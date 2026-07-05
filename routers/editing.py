"""
Editing, subtitle, hook, and translation routes.
"""

import os
import json
import glob
import time
import shutil
import asyncio
from typing import Optional, List
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app_logger import logger

from routers.state import jobs, OUTPUT_DIR

from editor import VideoEditor
from subtitles import generate_srt, burn_subtitles, generate_srt_from_video
from hooks import add_hook_to_video
from translate import translate_video, get_supported_languages

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════
# Pydantic models
# ═══════════════════════════════════════════════════════════════════════

class EditRequest(BaseModel):
    job_id: str
    clip_index: int
    api_key: Optional[str] = None
    input_filename: Optional[str] = None


class SubtitleRequest(BaseModel):
    job_id: str
    clip_index: int
    position: str = "bottom"
    font_size: int = 16
    font_name: str = "Verdana"
    font_color: str = "#FFFFFF"
    border_color: str = "#000000"
    border_width: int = 2
    bg_color: str = "#000000"
    bg_opacity: float = 0.0
    input_filename: Optional[str] = None


class HookRequest(BaseModel):
    job_id: str
    clip_index: int
    text: str
    input_filename: Optional[str] = None
    position: Optional[str] = "top"
    size: Optional[str] = "M"


class TranslateRequest(BaseModel):
    job_id: str
    clip_index: int
    target_language: str
    source_language: Optional[str] = None
    input_filename: Optional[str] = None


class EffectsGenerateRequest(BaseModel):
    job_id: str
    clip_index: int
    input_filename: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════
# Edit
# ═══════════════════════════════════════════════════════════════════════

@router.post("/api/edit", tags=["Editing"])
async def edit_clip(
    req: EditRequest,
    x_gemini_key: Optional[str] = Header(None, alias="X-Gemini-Key"),
    x_openrouter_key: Optional[str] = Header(None, alias="X-OpenRouter-Key"),
    x_llm_provider: Optional[str] = Header(None, alias="X-LLM-Provider"),
    x_llm_model: Optional[str] = Header(None, alias="X-LLM-Model"),
):
    final_api_key = req.api_key or x_gemini_key or x_openrouter_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
    provider = x_llm_provider or os.environ.get("LLM_PROVIDER", "gemini")
    model = x_llm_model or os.environ.get("LLM_MODEL") or None

    if not final_api_key:
        raise HTTPException(status_code=400, detail="Missing Gemini API Key (Header or Body)")

    if req.job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[req.job_id]
    if 'result' not in job or 'clips' not in job['result']:
        raise HTTPException(status_code=400, detail="Job result not available")

    try:
        if req.input_filename:
            safe_name = os.path.basename(req.input_filename)
            input_path = os.path.join(OUTPUT_DIR, req.job_id, safe_name)
            filename = safe_name
        else:
            clip = job['result']['clips'][req.clip_index]
            filename = clip['video_url'].split('/')[-1]
            input_path = os.path.join(OUTPUT_DIR, req.job_id, filename)

        if not os.path.exists(input_path):
            raise HTTPException(status_code=404, detail=f"Video file not found")

        edited_filename = f"edited_{filename}"
        output_path = os.path.join(OUTPUT_DIR, req.job_id, edited_filename)

        def run_edit():
            editor = VideoEditor(api_key=final_api_key, provider=provider, model=model)

            safe_filename = f"temp_input_{req.job_id}.mp4"
            safe_input_path = os.path.join(OUTPUT_DIR, req.job_id, safe_filename)

            shutil.copy(input_path, safe_input_path)

            try:
                vid_file = editor.upload_video(safe_input_path)

                import cv2
                cap = cv2.VideoCapture(safe_input_path)
                fps = cap.get(cv2.CAP_PROP_FPS)
                frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                duration = frame_count / fps if fps else 0
                cap.release()

                transcript = None
                try:
                    meta_files = glob.glob(os.path.join(OUTPUT_DIR, req.job_id, "*_metadata.json"))
                    if meta_files:
                        with open(meta_files[0], 'r') as f:
                            data = json.load(f)
                            transcript = data.get('transcript')
                except Exception as e:
                    logger.warning(f"Could not load transcript for editing context: {e}")

                filter_data = editor.get_ffmpeg_filter(vid_file, duration, fps=fps, width=width, height=height, transcript=transcript)

                safe_output_path = os.path.join(OUTPUT_DIR, req.job_id, f"temp_output_{req.job_id}.mp4")
                editor.apply_edits(safe_input_path, safe_output_path, filter_data)

                if os.path.exists(safe_output_path):
                    shutil.move(safe_output_path, output_path)

                return filter_data
            finally:
                if os.path.exists(safe_input_path):
                    os.remove(safe_input_path)

        loop = asyncio.get_running_loop()
        plan = await loop.run_in_executor(None, run_edit)

        new_video_url = f"/videos/{req.job_id}/{edited_filename}"

        return {
            "success": True,
            "new_video_url": new_video_url,
            "edit_plan": plan
        }

    except Exception as e:
        logger.error(f"Edit Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Effects Generate
# ═══════════════════════════════════════════════════════════════════════

@router.post("/api/effects/generate", tags=["Editing"])
async def generate_effects_config(
    req: EffectsGenerateRequest,
    x_gemini_key: Optional[str] = Header(None, alias="X-Gemini-Key"),
    x_openrouter_key: Optional[str] = Header(None, alias="X-OpenRouter-Key"),
    x_llm_provider: Optional[str] = Header(None, alias="X-LLM-Provider"),
    x_llm_model: Optional[str] = Header(None, alias="X-LLM-Model"),
):
    """Generate structured EffectsConfig JSON for Remotion rendering via LLM."""
    final_api_key = x_gemini_key or x_openrouter_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
    provider = x_llm_provider or os.environ.get("LLM_PROVIDER", "gemini")
    model = x_llm_model or os.environ.get("LLM_MODEL") or None

    if not final_api_key:
        raise HTTPException(status_code=400, detail="Missing Gemini API Key (Header)")

    if req.job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[req.job_id]
    if 'result' not in job or 'clips' not in job['result']:
        raise HTTPException(status_code=400, detail="Job result not available")

    try:
        if req.input_filename:
            safe_name = os.path.basename(req.input_filename)
            input_path = os.path.join(OUTPUT_DIR, req.job_id, safe_name)
        else:
            clip = job['result']['clips'][req.clip_index]
            filename = clip['video_url'].split('/')[-1]
            input_path = os.path.join(OUTPUT_DIR, req.job_id, filename)

        if not os.path.exists(input_path):
            raise HTTPException(status_code=404, detail=f"Video file not found")

        def run_effects_generation():
            editor = VideoEditor(api_key=final_api_key, provider=provider, model=model)

            safe_filename = f"temp_effects_{req.job_id}.mp4"
            safe_input_path = os.path.join(OUTPUT_DIR, req.job_id, safe_filename)
            shutil.copy(input_path, safe_input_path)

            try:
                vid_file = editor.upload_video(safe_input_path)

                import subprocess
                probe_cmd = [
                    'ffprobe', '-v', 'error',
                    '-select_streams', 'v:0',
                    '-show_entries', 'stream=width,height,r_frame_rate,duration',
                    '-show_entries', 'format=duration',
                    '-of', 'json',
                    safe_input_path
                ]
                probe_result = subprocess.check_output(probe_cmd, timeout=60).decode().strip()
                probe_data = json.loads(probe_result)

                stream = probe_data.get('streams', [{}])[0]
                width = int(stream.get('width', 1080))
                height = int(stream.get('height', 1920))

                r_frame_rate = stream.get('r_frame_rate', '30/1')
                num, den = r_frame_rate.split('/')
                fps = round(int(num) / int(den), 2)

                duration = float(stream.get('duration', 0))
                if duration == 0:
                    duration = float(probe_data.get('format', {}).get('duration', 0))

                transcript = None
                try:
                    meta_files = glob.glob(os.path.join(OUTPUT_DIR, req.job_id, "*_metadata.json"))
                    if meta_files:
                        with open(meta_files[0], 'r') as f:
                            data = json.load(f)
                            transcript = data.get('transcript')
                except Exception as e:
                    logger.warning(f"Could not load transcript for effects config: {e}")

                effects_config = editor.get_effects_config(
                    vid_file, duration, fps=fps, width=width, height=height, transcript=transcript
                )
                return effects_config
            finally:
                if os.path.exists(safe_input_path):
                    os.remove(safe_input_path)

        loop = asyncio.get_running_loop()
        effects_config = await loop.run_in_executor(None, run_effects_generation)

        if effects_config is None:
            raise HTTPException(status_code=500, detail="Failed to generate effects config from Gemini")

        return {"effects": effects_config}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Effects Generation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Subtitles
# ═══════════════════════════════════════════════════════════════════════

@router.post("/api/subtitle", tags=["Editing"])
async def add_subtitles(req: SubtitleRequest):
    if req.job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[req.job_id]
    output_dir = os.path.join(OUTPUT_DIR, req.job_id)
    json_files = glob.glob(os.path.join(output_dir, "*_metadata.json"))

    if not json_files:
        raise HTTPException(status_code=404, detail="Metadata not found")

    with open(json_files[0], 'r') as f:
        data = json.load(f)

    transcript = data.get('transcript')
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript not found in metadata. Please process a new video.")

    clips = data.get('shorts', [])
    if req.clip_index >= len(clips):
        raise HTTPException(status_code=404, detail="Clip not found")

    clip_data = clips[req.clip_index]

    if req.input_filename:
        filename = os.path.basename(req.input_filename)
    else:
        filename = clip_data.get('video_url', '').split('/')[-1]
        if not filename:
            base_name = os.path.basename(json_files[0]).replace('_metadata.json', '')
            filename = f"{base_name}_clip_{req.clip_index+1}.mp4"

    input_path = os.path.join(output_dir, filename)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail=f"Video file not found")

    srt_filename = f"subs_{req.clip_index}_{int(time.time())}.srt"
    srt_path = os.path.join(output_dir, srt_filename)

    output_filename = f"subtitled_{filename}"
    output_path = os.path.join(output_dir, output_filename)

    try:
        is_dubbed = filename.startswith("translated_")

        if is_dubbed:
            logger.info("Dubbed video detected, transcribing audio for subtitles...")

            def run_transcribe_srt():
                return generate_srt_from_video(input_path, srt_path)

            loop = asyncio.get_running_loop()
            success = await loop.run_in_executor(None, run_transcribe_srt)
        else:
            success = generate_srt(transcript, clip_data['start'], clip_data['end'], srt_path)

        if not success:
            raise HTTPException(status_code=400, detail="No words found for this clip range.")

        def run_burn():
            burn_subtitles(input_path, srt_path, output_path,
                          alignment=req.position, fontsize=req.font_size,
                          font_name=req.font_name, font_color=req.font_color,
                          border_color=req.border_color, border_width=req.border_width,
                          bg_color=req.bg_color, bg_opacity=req.bg_opacity)

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, run_burn)

    except Exception as e:
        logger.error(f"Subtitle Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    if req.clip_index < len(job['result']['clips']):
        job['result']['clips'][req.clip_index]['video_url'] = f"/videos/{req.job_id}/{output_filename}"

    try:
        if req.clip_index < len(clips):
            clips[req.clip_index]['video_url'] = f"/videos/{req.job_id}/{output_filename}"
            data['shorts'] = clips
            with open(json_files[0], 'w') as f:
                json.dump(data, f, indent=4)
                logger.info(f"Metadata updated with subtitled video for clip {req.clip_index}")
    except Exception as e:
        logger.warning(f"Failed to update metadata.json: {e}")

    return {
        "success": True,
        "new_video_url": f"/videos/{req.job_id}/{output_filename}"
    }


# ═══════════════════════════════════════════════════════════════════════
# Hook
# ═══════════════════════════════════════════════════════════════════════

@router.post("/api/hook", tags=["Editing"])
async def add_hook(req: HookRequest):
    if req.job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[req.job_id]
    output_dir = os.path.join(OUTPUT_DIR, req.job_id)
    json_files = glob.glob(os.path.join(output_dir, "*_metadata.json"))

    if not json_files:
        raise HTTPException(status_code=404, detail="Metadata not found")

    with open(json_files[0], 'r') as f:
        data = json.load(f)

    clips = data.get('shorts', [])
    if req.clip_index >= len(clips):
        raise HTTPException(status_code=404, detail="Clip not found")

    clip_data = clips[req.clip_index]

    if req.input_filename:
        filename = os.path.basename(req.input_filename)
    else:
        filename = clip_data.get('video_url', '').split('/')[-1]
        if not filename:
            base_name = os.path.basename(json_files[0]).replace('_metadata.json', '')
            filename = f"{base_name}_clip_{req.clip_index+1}.mp4"

    input_path = os.path.join(output_dir, filename)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail=f"Video file not found")

    output_filename = f"hook_{filename}"
    output_path = os.path.join(output_dir, output_filename)

    size_map = {"S": 0.8, "M": 1.0, "L": 1.3}
    font_scale = size_map.get(req.size, 1.0)

    try:
        def run_hook():
            add_hook_to_video(input_path, req.text, output_path, position=req.position, font_scale=font_scale)

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, run_hook)

    except Exception as e:
        logger.error(f"Hook Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    if req.clip_index < len(job['result']['clips']):
        job['result']['clips'][req.clip_index]['video_url'] = f"/videos/{req.job_id}/{output_filename}"

    try:
        if req.clip_index < len(clips):
            clips[req.clip_index]['video_url'] = f"/videos/{req.job_id}/{output_filename}"
            data['shorts'] = clips
            with open(json_files[0], 'w') as f:
                json.dump(data, f, indent=4)
                logger.info(f"Metadata updated with hook video for clip {req.clip_index}")
    except Exception as e:
        logger.warning(f"Failed to update metadata.json: {e}")

    return {
        "success": True,
        "new_video_url": f"/videos/{req.job_id}/{output_filename}"
    }


# ═══════════════════════════════════════════════════════════════════════
# Translate
# ═══════════════════════════════════════════════════════════════════════

@router.get("/api/translate/languages", tags=["Editing"])
async def get_languages():
    """Return supported languages for translation."""
    return {"languages": get_supported_languages()}


@router.post("/api/translate", tags=["Editing"])
async def translate_clip(
    req: TranslateRequest,
    x_elevenlabs_key: Optional[str] = Header(None, alias="X-ElevenLabs-Key")
):
    """Translate a video clip to a different language using ElevenLabs dubbing."""
    if not x_elevenlabs_key:
        raise HTTPException(status_code=400, detail="Missing X-ElevenLabs-Key header")

    if req.job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[req.job_id]
    output_dir = os.path.join(OUTPUT_DIR, req.job_id)
    json_files = glob.glob(os.path.join(output_dir, "*_metadata.json"))

    if not json_files:
        raise HTTPException(status_code=404, detail="Metadata not found")

    with open(json_files[0], 'r') as f:
        data = json.load(f)

    clips = data.get('shorts', [])
    if req.clip_index >= len(clips):
        raise HTTPException(status_code=404, detail="Clip not found")

    clip_data = clips[req.clip_index]

    if req.input_filename:
        filename = os.path.basename(req.input_filename)
    else:
        filename = clip_data.get('video_url', '').split('/')[-1]
        if not filename:
            base_name = os.path.basename(json_files[0]).replace('_metadata.json', '')
            filename = f"{base_name}_clip_{req.clip_index+1}.mp4"

    input_path = os.path.join(output_dir, filename)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail=f"Video file not found")

    base, ext = os.path.splitext(filename)
    output_filename = f"translated_{req.target_language}_{base}{ext}"
    output_path = os.path.join(output_dir, output_filename)

    try:
        def run_translate():
            return translate_video(
                video_path=input_path,
                output_path=output_path,
                target_language=req.target_language,
                api_key=x_elevenlabs_key,
                source_language=req.source_language,
            )

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, run_translate)

    except Exception as e:
        logger.error(f"Translation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    if req.clip_index < len(job['result']['clips']):
        job['result']['clips'][req.clip_index]['video_url'] = f"/videos/{req.job_id}/{output_filename}"

    try:
        if req.clip_index < len(clips):
            clips[req.clip_index]['video_url'] = f"/videos/{req.job_id}/{output_filename}"
            data['shorts'] = clips
            with open(json_files[0], 'w') as f:
                json.dump(data, f, indent=4)
                logger.info(f"Metadata updated with translated video for clip {req.clip_index}")
    except Exception as e:
        logger.warning(f"Failed to update metadata.json: {e}")

    return {
        "success": True,
        "new_video_url": f"/videos/{req.job_id}/{output_filename}"
    }
