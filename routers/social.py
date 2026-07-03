"""
Social posting routes: Upload-Post integration.
"""

import os
from typing import Optional, List
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app_logger import logger

from routers.state import jobs, OUTPUT_DIR

router = APIRouter()


class SocialPostRequest(BaseModel):
    job_id: str
    clip_index: int
    api_key: str
    user_id: str
    platforms: List[str]
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[str] = None
    timezone: Optional[str] = "UTC"


@router.post("/api/social/post", tags=["Social"])
async def post_to_socials(req: SocialPostRequest):
    import httpx

    if req.job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[req.job_id]
    if 'result' not in job or 'clips' not in job['result']:
        raise HTTPException(status_code=400, detail="Job result not available")

    try:
        clip = job['result']['clips'][req.clip_index]
        filename = clip['video_url'].split('/')[-1]
        file_path = os.path.join(OUTPUT_DIR, req.job_id, filename)

        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Video file not found: {file_path}")

        final_title = req.title or clip.get('title', 'Viral Short')
        final_description = req.description or clip.get('video_description_for_instagram') or clip.get('video_description_for_tiktok') or "Check this out!"

        url = "https://api.upload-post.com/api/upload"
        headers = {
            "Authorization": f"Apikey {req.api_key}"
        }

        data_payload = {
            "user": req.user_id,
            "title": final_title,
            "platform[]": req.platforms,
            "async_upload": "true"
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
            yt_title = req.title or clip.get('video_title_for_youtube_short', final_title)
            data_payload["youtube_title"] = yt_title
            data_payload["youtube_description"] = final_description
            data_payload["privacyStatus"] = "public"

        with open(file_path, "rb") as f:
            file_content = f.read()

        files = {
            "video": (filename, file_content, "video/mp4")
        }

        with httpx.Client(timeout=120.0) as client:
            logger.info(f"Sending to Upload-Post for platforms: {req.platforms}")
            response = client.post(url, headers=headers, data=data_payload, files=files)

        if response.status_code not in [200, 201, 202]:
            logger.error(f"Upload-Post Error: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Vendor API Error: {response.text}")

        return response.json()

    except Exception as e:
        logger.error(f"Social Post Exception: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/social/user", tags=["Social"])
async def get_social_user(api_key: str = Header(..., alias="X-Upload-Post-Key")):
    """Proxy to fetch user ID from Upload-Post"""
    import httpx

    if not api_key:
        raise HTTPException(status_code=400, detail="Missing X-Upload-Post-Key header")

    url = "https://api.upload-post.com/api/uploadposts/users"
    logger.info(f"Fetching User ID from: {url}")
    headers = {"Authorization": f"Apikey {api_key}"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                logger.error(f"Upload-Post User Fetch Error: {resp.text}")
                raise HTTPException(status_code=resp.status_code, detail=f"Failed to fetch user: {resp.text}")

            data = resp.json()
            logger.info(f"Upload-Post User Response: {data}")

            user_id = None
            profiles_list = []
            if isinstance(data, dict):
                raw_profiles = data.get('profiles', [])
                if isinstance(raw_profiles, list):
                    for p in raw_profiles:
                        username = p.get('username')
                        if username:
                            socials = p.get('social_accounts', {})
                            connected = []
                            for platform in ['tiktok', 'instagram', 'youtube']:
                                account_info = socials.get(platform)
                                if isinstance(account_info, dict):
                                    connected.append(platform)
                            profiles_list.append({
                                "username": username,
                                "connected": connected
                            })

            if not profiles_list:
                return {"profiles": [], "error": "No profiles found"}

            return {"profiles": profiles_list}

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
