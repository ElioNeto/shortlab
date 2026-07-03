"""Template system for saving/reusing video configurations."""
import os
import json
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app_logger import logger

router = APIRouter(prefix="/api/templates", tags=["Templates"])

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
os.makedirs(TEMPLATES_DIR, exist_ok=True)

class Template(BaseModel):
    id: Optional[str] = None
    name: str
    subtitle_style: dict = {}
    hook_style: dict = {}
    effects_preset: str = "none"
    crop_mode: str = "TRACK"
    output_format: str = "mp4"

@router.post("/save")
async def save_template(template: Template):
    template.id = uuid.uuid4().hex[:12]
    path = os.path.join(TEMPLATES_DIR, f"{template.id}.json")
    with open(path, "w") as f:
        json.dump(template.dict(), f, indent=2)
    return {"id": template.id, "name": template.name}

@router.get("/list")
async def list_templates():
    templates = []
    for f in os.listdir(TEMPLATES_DIR):
        if f.endswith(".json"):
            with open(os.path.join(TEMPLATES_DIR, f)) as fp:
                templates.append(json.load(fp))
    return {"templates": templates}

@router.delete("/{template_id}")
async def delete_template(template_id: str):
    path = os.path.join(TEMPLATES_DIR, f"{template_id}.json")
    if os.path.exists(path):
        os.remove(path)
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Template not found")
