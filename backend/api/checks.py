from django.conf import settings
from django.core.checks import Warning, register


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
