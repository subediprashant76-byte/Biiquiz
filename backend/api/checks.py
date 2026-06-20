import os

from django.conf import settings
from django.core.checks import Error, Warning, register


@register()
def database_host_check(app_configs, **kwargs):
    host = str(settings.DATABASES["default"].get("HOST", "")).lower()
    if host == "db" and os.getenv("DJANGO_RUNTIME", "host").lower() != "docker":
        return [
            Error(
                "DATABASE_URL uses the Docker-only hostname 'db' outside Docker.",
                hint=(
                    "Use 127.0.0.1 or a resolvable PostgreSQL hostname in root .env, "
                    "backend/.env.local, or DJANGO_ENV_FILE."
                ),
                id="api.E001",
            )
        ]
    return []


@register()
def email_backend_check(app_configs, **kwargs):
    if not settings.DEBUG and settings.EMAIL_BACKEND.endswith(".console.EmailBackend"):
        return [
            Warning(
                "EMAIL_BACKEND uses console email in non-debug mode.",
                hint="Set EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend and configure SMTP credentials.",
                id="api.W001",
            )
        ]
    return []
