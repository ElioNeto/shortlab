"""Webhook router for job completion notifications."""
import os
import json
import time
import hashlib
import hmac
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import httpx

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

# In-memory webhook registrations
registered_webhooks = []


class WebhookRegistration(BaseModel):
    url: str
    events: list[str] = ["job.completed"]
    secret: Optional[str] = None


class WebhookEvent(BaseModel):
    event: str
    job_id: str
    timestamp: float
    data: dict


@router.post("/register")
async def register_webhook(webhook: WebhookRegistration):
    if not webhook.url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Webhook URL must use HTTPS")
    registered_webhooks.append(webhook)
    return {"status": "registered", "url": webhook.url}


@router.get("/list")
async def list_webhooks():
    return {"webhooks": [w.url for w in registered_webhooks]}


async def dispatch_webhooks(event: str, job_id: str, data: dict):
    """Dispatch webhook events to all registered URLs."""
    for wh in registered_webhooks:
        if event in wh.events:
            try:
                payload = WebhookEvent(event=event, job_id=job_id, timestamp=time.time(), data=data)
                headers = {"Content-Type": "application/json"}
                if wh.secret:
                    signature = hmac.new(
                        wh.secret.encode(),
                        json.dumps(payload.dict()).encode(),
                        hashlib.sha256
                    ).hexdigest()
                    headers["X-Webhook-Signature"] = signature
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.post(wh.url, json=payload.dict(), headers=headers)
            except Exception as e:
                print(f"[Webhook] Failed to dispatch to {wh.url}: {e}")
