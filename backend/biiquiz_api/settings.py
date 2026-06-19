from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

load_dotenv(ROOT_DIR / ".env")

SECRET_KEY = os.getenv("AUTH_SECRET", "replace-with-a-long-random-secret")
DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = [host.strip() for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if host.strip()]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
]

ROOT_URLCONF = "biiquiz_api.urls"
WSGI_APPLICATION = "biiquiz_api.wsgi.application"
ASGI_APPLICATION = "biiquiz_api.asgi.application"

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/biiquiz")


def database_from_url(url: str) -> dict[str, str | int]:
    parsed = urlparse(url)
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": parsed.path.lstrip("/") or "biiquiz",
        "USER": parsed.username or "postgres",
        "PASSWORD": parsed.password or "",
        "HOST": parsed.hostname or "localhost",
        "PORT": parsed.port or 5432,
    }


DATABASES = {"default": database_from_url(DATABASE_URL)}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SESSION_COOKIE_NAME = "biiquiz_session"
PARTICIPANT_COOKIE_PREFIX = "biiquiz_participant"
SESSION_DAYS = 14
PARTICIPANT_HOURS = 12
PRISMA_SCHEMA_PATH = ROOT_DIR / "prisma" / "schema.prisma"
