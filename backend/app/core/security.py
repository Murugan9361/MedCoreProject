import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(
    user_id: int,
    role: str,
    token_version: int,
    token_type: Literal["access", "refresh"],
    expires_at: datetime,
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "ver": token_version,
        "typ": token_type,
        "jti": secrets.token_urlsafe(32),
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": now,
        "nbf": now,
        "exp": expires_at,
    }
    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def create_access_token(user_id: int, role: str, token_version: int) -> str:
    return _create_token(
        user_id,
        role,
        token_version,
        "access",
        datetime.now(timezone.utc)
        + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: int, role: str, token_version: int) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    return (
        _create_token(user_id, role, token_version, "refresh", expires_at),
        expires_at,
    )


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
