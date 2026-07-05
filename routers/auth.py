"""JWT authentication router for ShortLab API."""
import os
import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel

from routers.state import limiter

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# JWT configuration
JWT_SECRET = os.environ.get("JWT_SECRET", hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest())
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Simple in-memory user store (for self-hosted, single-user mode)
_default_password = os.environ.get("ADMIN_PASSWORD")
if not _default_password:
    import secrets
    _default_password = secrets.token_urlsafe(12)
    print(f"⚠️  No ADMIN_PASSWORD set. Generated temporary password: {_default_password}")
    print(f"   Set ADMIN_PASSWORD env var to use a persistent password.")

USERS = {
    "admin": {
        "password": _default_password,
        "role": "admin",
    }
}


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


def create_token(username: str) -> str:
    """Create a simple JWT-like token."""
    import jwt
    payload = {
        "sub": username,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "jti": str(uuid.uuid4()),
        "role": USERS.get(username, {}).get("role", "user"),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(req: LoginRequest):
    if req.username not in USERS:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if USERS[req.username]["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(req.username)
    return TokenResponse(access_token=token, expires_in=JWT_EXPIRATION_HOURS * 3600)


@router.get("/verify")
async def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    try:
        import jwt
        payload = jwt.decode(authorization[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"valid": True, "user": payload["sub"], "role": payload.get("role")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
