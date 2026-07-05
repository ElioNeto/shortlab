"""Manual video editor - trim, cut, concat, reorder video segments."""
import os
import json
import uuid
import subprocess
import tempfile
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from routers.state import OUTPUT_DIR, UPLOAD_DIR
from app_logger import logger

router = APIRouter(prefix="/api/edit/manual", tags=["Editing"])


class TrimRequest(BaseModel):
    input_path: str
    start_sec: float
    end_sec: float
    output_name: Optional[str] = None


class ConcatRequest(BaseModel):
    segments: list[dict]  # [{"path": "...", "start": 0, "end": 10}, ...]
    output_name: Optional[str] = None


class PipRequest(BaseModel):
    main_video: str  # path relative to output
    overlay_video: str
    position: str = "bottom-right"  # top-left, top-right, bottom-left, bottom-right
    overlay_size: float = 0.3  # relative to main (0.0-1.0)
    start_sec: Optional[float] = None
    end_sec: Optional[float] = None
    output_name: Optional[str] = None


class SplitScreenRequest(BaseModel):
    left_video: str
    right_video: str
    layout: str = "vertical"  # horizontal (side-by-side), vertical (top-bottom)
    output_name: Optional[str] = None


@router.post("/trim")
async def trim_video(req: TrimRequest):
    """Trim a video segment using FFmpeg exact seek."""
    input_path = _resolve_path(req.input_path)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="Video not found")

    output_name = req.output_name or f"trim_{uuid.uuid4().hex[:8]}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_name)

    cmd = [
        'ffmpeg', '-y',
        '-ss', str(req.start_sec),
        '-i', input_path,
        '-to', str(req.end_sec - req.start_sec),
        '-c', 'copy',  # Stream copy for speed (no re-encode)
        output_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        logger.error(f"Trim failed: {result.stderr}")
        raise HTTPException(status_code=500, detail=f"Trim failed: {result.stderr[:200]}")

    return {"path": f"/videos/{output_name}", "duration": req.end_sec - req.start_sec}


@router.post("/concat")
async def concat_videos(req: ConcatRequest):
    """Concatenate multiple video segments using FFmpeg concat demuxer."""
    if len(req.segments) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 segments")

    # Create concat file
    concat_file = os.path.join(OUTPUT_DIR, f"concat_{uuid.uuid4().hex[:8]}.txt")
    with open(concat_file, "w") as f:
        for seg in req.segments:
            path = _resolve_path(seg["path"])
            if not os.path.exists(path):
                raise HTTPException(status_code=404, detail=f"Segment not found: {seg['path']}")
            f.write(f"file '{path}'\n")

    output_name = req.output_name or f"concat_{uuid.uuid4().hex[:8]}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_name)

    cmd = [
        'ffmpeg', '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concat_file,
        '-c', 'copy',
        output_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    os.remove(concat_file)

    if result.returncode != 0:
        logger.error(f"Concat failed: {result.stderr}")
        raise HTTPException(status_code=500, detail=f"Concat failed: {result.stderr[:200]}")

    return {"path": f"/videos/{output_name}"}


@router.post("/pip")
async def picture_in_picture(req: PipRequest):
    """Add a picture-in-picture overlay video on the main video."""
    main_path = _resolve_path(req.main_video)
    overlay_path = _resolve_path(req.overlay_video)

    if not os.path.exists(main_path):
        raise HTTPException(status_code=404, detail="Main video not found")
    if not os.path.exists(overlay_path):
        raise HTTPException(status_code=404, detail="Overlay video not found")

    output_name = req.output_name or f"pip_{uuid.uuid4().hex[:8]}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_name)

    # Position mapping
    positions = {
        "top-left": "10:10",
        "top-right": "W-w-10:10",
        "bottom-left": "10:H-h-10",
        "bottom-right": "W-w-10:H-h-10",
    }
    position = positions.get(req.position, "W-w-10:H-h-10")

    # Enable expression for PiP timing
    enable_expr = ""
    if req.start_sec is not None and req.end_sec is not None:
        enable_expr = f":enable='between(t,{req.start_sec},{req.end_sec})'"

    # Scale overlay to requested size
    overlay_scale = f"iw*{req.overlay_size}:ih*{req.overlay_size}"

    cmd = [
        'ffmpeg', '-y',
        '-i', main_path,
        '-i', overlay_path,
        '-filter_complex',
        f"[1:v]scale={overlay_scale}[ovr];[0:v][ovr]overlay={position}{enable_expr}",
        '-c:a', 'copy',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        output_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        logger.error(f"PiP failed: {result.stderr}")
        raise HTTPException(status_code=500, detail=f"PiP failed: {result.stderr[:200]}")

    return {"path": f"/videos/{output_name}"}


@router.post("/split-screen")
async def split_screen(req: SplitScreenRequest):
    """Create a side-by-side or top-bottom split screen."""
    left_path = _resolve_path(req.left_video)
    right_path = _resolve_path(req.right_video)

    if not os.path.exists(left_path):
        raise HTTPException(status_code=404, detail="Left video not found")
    if not os.path.exists(right_path):
        raise HTTPException(status_code=404, detail="Right video not found")

    output_name = req.output_name or f"split_{uuid.uuid4().hex[:8]}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_name)

    if req.layout == "vertical":
        # Top-bottom split
        filter_complex = "[0:v]scale=iw:ih/2[top];[1:v]scale=iw:ih/2[bottom];[top][bottom]vstack"
    else:
        # Side-by-side (horizontal)
        filter_complex = "[0:v]scale=iw/2:ih[left];[1:v]scale=iw/2:ih[right];[left][right]hstack"

    cmd = [
        'ffmpeg', '-y',
        '-i', left_path,
        '-i', right_path,
        '-filter_complex', filter_complex,
        '-c:a', 'aac', '-strict', 'experimental',
        output_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        logger.error(f"Split screen failed: {result.stderr}")
        raise HTTPException(status_code=500, detail=f"Split screen failed: {result.stderr[:200]}")

    return {"path": f"/videos/{output_name}"}


def _resolve_path(video_path: str) -> str:
    """Resolve a video path from various formats back to filesystem."""
    if video_path.startswith("/videos/"):
        return os.path.join(OUTPUT_DIR, video_path[8:])
    if video_path.startswith("http"):
        return video_path  # Remote URL - handle in caller
    # Assume it's already a relative path within OUTPUT_DIR
    candidate = os.path.join(OUTPUT_DIR, video_path)
    if os.path.exists(candidate):
        return candidate
    return video_path
