from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from datetime import timedelta
from typing import Any

import bcrypt
from django.conf import settings
from django.utils import timezone

from api.models import User


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def hash_token(token: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), token.encode("utf-8"), hashlib.sha256).hexdigest()


def create_random_token(bytes_count: int = 32) -> str:
    return secrets.token_urlsafe(bytes_count)


def sign_session(user_id: str) -> str:
    payload = {"userId": user_id, "expiresAt": int((time.time() + settings.SESSION_DAYS * 24 * 60 * 60) * 1000)}
    body = _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = _b64url(hmac.new(settings.SECRET_KEY.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).digest())
    return f"{body}.{signature}"


def verify_session_token(token: str | None) -> dict[str, Any] | None:
    if not token or "." not in token:
        return None
    body, signature = token.split(".", 1)
    expected = _b64url(hmac.new(settings.SECRET_KEY.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).digest())
    if not hmac.compare_digest(signature, expected):
        return None
    payload = json.loads(_b64url_decode(body).decode("utf-8"))
    if int(payload.get("expiresAt", 0)) < int(time.time() * 1000):
        return None
    return payload


def set_session_cookie(response, user_id: str):
    response.set_cookie(
        settings.SESSION_COOKIE_NAME,
        sign_session(user_id),
        max_age=settings.SESSION_DAYS * 24 * 60 * 60,
        httponly=True,
        samesite="Lax",
        secure=not settings.DEBUG,
        path="/",
    )
    return response


def clear_session_cookie(response):
    response.delete_cookie(settings.SESSION_COOKIE_NAME, path="/")
    return response


def set_participant_cookie(response, room_code: str, token: str):
    response.set_cookie(
        f"{settings.PARTICIPANT_COOKIE_PREFIX}_{room_code}",
        token,
        max_age=settings.PARTICIPANT_HOURS * 60 * 60,
        httponly=True,
        samesite="Lax",
        secure=not settings.DEBUG,
        path="/",
    )
    return response


def get_participant_token(request, room_code: str) -> str | None:
    return request.COOKIES.get(f"{settings.PARTICIPANT_COOKIE_PREFIX}_{room_code}")


def get_session_user(request) -> User | None:
    payload = verify_session_token(request.COOKIES.get(settings.SESSION_COOKIE_NAME))
    if not payload:
        return None
    try:
        return User.objects.get(id=payload["userId"], is_active=True)
    except User.DoesNotExist:
        return None


def require_host(request) -> User:
    user = get_session_user(request)
    if not user or user.role not in {"host", "admin"}:
        raise PermissionError("Authentication required.")
    return user


def require_admin(request) -> User:
    user = get_session_user(request)
    if not user or user.role != "admin":
        raise PermissionError("Admin access required.")
    return user


def require_organization_admin(request) -> User:
    user = require_admin(request)
    if not user.organization_id:
        raise PermissionError("Organization Admin access required.")
    return user


def require_super_admin(request) -> User:
    user = require_admin(request)
    if user.organization_id:
        raise PermissionError("Super Admin access required.")
    return user


def now_plus_session() -> timezone.datetime:
    return timezone.now() + timedelta(days=settings.SESSION_DAYS)
