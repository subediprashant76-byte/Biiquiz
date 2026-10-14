from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import parse_qsl, quote, unquote, urlparse

from django.core.exceptions import ImproperlyConfigured

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

local_env_path = Path(os.getenv("DJANGO_ENV_FILE", BASE_DIR / ".env.local"))
if local_env_path.exists():
    load_dotenv(local_env_path)
load_dotenv(ROOT_DIR / ".env")

SECRET_KEY = os.getenv("AUTH_SECRET", "replace-with-a-long-random-secret")
DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = [host.strip() for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if host.strip()]
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",") if origin.strip()]
if not DEBUG and SECRET_KEY == "replace-with-a-long-random-secret":
    raise ImproperlyConfigured("AUTH_SECRET must be configured when DJANGO_DEBUG=false.")

INSTALLED_APPS = ["django.contrib.staticfiles", "api"]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "biiquiz_api.urls"
WSGI_APPLICATION = "biiquiz_api.wsgi.application"
ASGI_APPLICATION = "biiquiz_api.asgi.application"

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL and os.getenv("POSTGRES_DB") and os.getenv("POSTGRES_USER") and os.getenv("POSTGRES_PASSWORD"):
    # Supports Dokploy/Compose environments that provide the PostgreSQL
    # service credentials separately instead of setting DATABASE_URL.
    db_user = quote(os.environ["POSTGRES_USER"], safe="")
    db_password = quote(os.environ["POSTGRES_PASSWORD"], safe="")
    db_host = os.getenv("POSTGRES_HOST", "db")
    db_port = os.getenv("POSTGRES_PORT", "5432")
    db_name = quote(os.environ["POSTGRES_DB"], safe="")
    DATABASE_URL = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

if not DATABASE_URL:
    if not DEBUG:
        raise ImproperlyConfigured(
            "Configure DATABASE_URL, or set POSTGRES_DB, POSTGRES_USER, "
            "POSTGRES_PASSWORD, and POSTGRES_HOST if the database is not named 'db'."
        )
    DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/biiquiz"


def database_from_url(url: str) -> dict[str, object]:
    parsed = urlparse(url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise ImproperlyConfigured("DATABASE_URL must use postgres:// or postgresql://.")
    options = dict(parse_qsl(parsed.query))
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": parsed.path.lstrip("/") or "biiquiz",
        "USER": unquote(parsed.username or "postgres"),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "127.0.0.1",
        "PORT": parsed.port or 5432,
        "OPTIONS": options,
    }


DATABASES = {"default": {**database_from_url(DATABASE_URL), "CONN_MAX_AGE": int(os.getenv("DATABASE_CONN_MAX_AGE", "60")), "CONN_HEALTH_CHECKS": True}}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SESSION_COOKIE_NAME = "biiquiz_session"
PARTICIPANT_COOKIE_PREFIX = "biiquiz_participant"
SESSION_DAYS = 14
PARTICIPANT_HOURS = 12
PRISMA_SCHEMA_PATH = BASE_DIR / "prisma" / "schema.prisma"

USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = os.getenv("DJANGO_SECURE_COOKIES", str(not DEBUG)).lower() == "true"
CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_SSL_REDIRECT = os.getenv("DJANGO_SECURE_SSL_REDIRECT", str(not DEBUG)).lower() == "true"
SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_SECURE_HSTS_SECONDS", "31536000" if not DEBUG else "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", "false").lower() == "true"
SECURE_HSTS_PRELOAD = os.getenv("DJANGO_SECURE_HSTS_PRELOAD", "false").lower() == "true"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() == "true"
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "").strip() or EMAIL_HOST_USER or "biiQuiz <no-reply@biiquiz.com>"
if DEFAULT_FROM_EMAIL == "biiQuiz <no-reply@biiquiz.com>" and EMAIL_HOST_USER:
    DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "15"))
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000")
PASSWORD_RESET_OTP_MINUTES = int(os.getenv("PASSWORD_RESET_OTP_MINUTES", "10"))
