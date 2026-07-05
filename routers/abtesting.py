"""A/B testing router for comparing thumbnail and title performance."""
import os
import json
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app_logger import logger
from routers.state import limiter

router = APIRouter(prefix="/api/abtest", tags=["Thumbnails"])

ABTEST_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "abtest_data")
os.makedirs(ABTEST_DIR, exist_ok=True)

class ABTestCreate(BaseModel):
    title: str
    variants: list[dict]  # [{"thumbnail_url": "...", "title": "..."}, ...]
    metric: str = "ctr"  # ctr, views, engagement

class ABTestVote(BaseModel):
    test_id: str
    variant_index: int

@router.post("/create")
async def create_abtest(test: ABTestCreate):
    test_id = uuid.uuid4().hex[:12]
    data = {
        "id": test_id,
        "title": test.title,
        "metric": test.metric,
        "variants": [{"index": i, **v, "votes": 0} for i, v in enumerate(test.variants)],
        "created_at": __import__("time").time(),
    }
    with open(os.path.join(ABTEST_DIR, f"{test_id}.json"), "w") as f:
        json.dump(data, f, indent=2)
    return {"test_id": test_id, "variants": len(test.variants)}

@router.post("/vote")
@limiter.limit("30/minute")
async def vote_abtest(vote: ABTestVote):
    path = os.path.join(ABTEST_DIR, f"{vote.test_id}.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Test not found")
    with open(path) as f:
        data = json.load(f)
    if vote.variant_index < len(data["variants"]):
        data["variants"][vote.variant_index]["votes"] += 1
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    return {"status": "voted"}

@router.get("/results/{test_id}")
async def abtest_results(test_id: str):
    path = os.path.join(ABTEST_DIR, f"{test_id}.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Test not found")
    with open(path) as f:
        data = json.load(f)
    total_votes = sum(v["votes"] for v in data["variants"])
    for v in data["variants"]:
        v["percentage"] = round(v["votes"] / total_votes * 100, 1) if total_votes else 0
    data["total_votes"] = total_votes
    return data
