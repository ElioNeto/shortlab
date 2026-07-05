"""Video preview router - allows previewing viral moments before full processing."""
import os
import subprocess
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from routers.state import UPLOAD_DIR, OUTPUT_DIR
import tempfile

router = APIRouter(prefix="/api/preview", tags=["Processing"])


class PreviewRequest(BaseModel):
    job_id: str
    clip_index: int
    start_sec: float
    end_sec: float


@router.post("/clip")
async def preview_clip(req: PreviewRequest):
    """Generate a quick preview of a specific clip moment."""
    input_path = os.path.join(UPLOAD_DIR, f"{req.job_id}")
    # Find the actual input file
    for f in os.listdir(UPLOAD_DIR):
        if f.startswith(req.job_id):
            input_path = os.path.join(UPLOAD_DIR, f)
            break

    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="Source video not found")

    duration = req.end_sec - req.start_sec
    output_path = os.path.join(OUTPUT_DIR, f"preview_{req.job_id}_{req.clip_index}.mp4")

    cmd = [
        'ffmpeg', '-y',
        '-ss', str(req.start_sec),
        '-i', input_path,
        '-t', str(min(duration, 30)),  # Max 30 second preview
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
        '-c:a', 'aac',
        output_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {result.stderr}")

    return {"preview_url": f"/videos/preview_{req.job_id}_{req.clip_index}.mp4", "duration": duration}
