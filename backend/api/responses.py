from __future__ import annotations

from typing import Any

from django.http import JsonResponse


def ok(data: Any = None, status: int = 200) -> JsonResponse:
    return JsonResponse({"ok": True, "data": data}, status=status, safe=False)


def fail(message: str, code: str = "BAD_REQUEST", status: int = 400) -> JsonResponse:
    return JsonResponse({"ok": False, "error": {"code": code, "message": message}}, status=status)


def validation_fail(message: str) -> JsonResponse:
    return fail(message, code="VALIDATION_ERROR", status=422)
