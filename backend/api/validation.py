from __future__ import annotations

import json
from typing import Any
from uuid import UUID

CORRECT_OPTIONS = {"A", "B", "C", "D"}
VISIBILITIES = {"private", "organization", "public"}
SCORING_MODES = {"simple", "speed_bonus"}


class ValidationError(ValueError):
    pass


def parse_json(request) -> dict[str, Any]:
    if not request.body:
        return {}
    try:
        value = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise ValidationError("Invalid JSON body.") from exc
    if not isinstance(value, dict):
        raise ValidationError("JSON body must be an object.")
    return value


def as_str(data: dict[str, Any], key: str, *, min_len: int = 0, max_len: int = 5000, required: bool = True) -> str | None:
    value = data.get(key)
    if value is None or value == "":
        if required:
            raise ValidationError(f"{key} is required.")
        return None
    value = str(value).strip()
    if len(value) < min_len:
        raise ValidationError(f"{key} is too short.")
    if len(value) > max_len:
        raise ValidationError(f"{key} is too long.")
    return value


def as_int(data: dict[str, Any], key: str, *, minimum: int, maximum: int, default: int | None = None) -> int:
    value = data.get(key, default)
    if value is None:
        raise ValidationError(f"{key} is required.")
    try:
        integer = int(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError(f"{key} must be an integer.") from exc
    if integer < minimum or integer > maximum:
        raise ValidationError(f"{key} must be between {minimum} and {maximum}.")
    return integer


def as_bool(data: dict[str, Any], key: str, default: bool = False) -> bool:
    value = data.get(key, default)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in {"1", "true", "yes", "on"}
    return bool(value)


def as_uuid(value: Any, key: str = "id") -> str:
    try:
        return str(UUID(str(value)))
    except (TypeError, ValueError) as exc:
        raise ValidationError(f"{key} must be a valid UUID.") from exc


def validate_quiz_create(data: dict[str, Any]) -> dict[str, Any]:
    visibility = str(data.get("visibility", "private"))
    if visibility not in VISIBILITIES:
        raise ValidationError("visibility must be private, organization, or public.")
    return {
        "title": as_str(data, "title", min_len=3, max_len=160),
        "subject": as_str(data, "subject", max_len=120, required=False),
        "description": as_str(data, "description", max_len=2000, required=False),
        "default_time_limit": as_int(data, "defaultTimeLimit", minimum=5, maximum=300, default=30),
        "default_marks": as_int(data, "defaultMarks", minimum=1, maximum=100, default=1),
        "visibility": visibility,
    }


def validate_question(data: dict[str, Any], partial: bool = False) -> dict[str, Any]:
    out: dict[str, Any] = {}
    fields = [
        ("questionText", "question_text", 5, 5000),
        ("optionA", "option_a", 1, 1000),
        ("optionB", "option_b", 1, 1000),
        ("optionC", "option_c", 1, 1000),
        ("optionD", "option_d", 1, 1000),
    ]
    for source, target, min_len, max_len in fields:
        if not partial or source in data:
            out[target] = as_str(data, source, min_len=min_len, max_len=max_len)
    if not partial or "correctOption" in data:
        correct = as_str(data, "correctOption", min_len=1, max_len=1)
        if correct not in CORRECT_OPTIONS:
            raise ValidationError("correctOption must be A, B, C, or D.")
        out["correct_option"] = correct
    if not partial or "marks" in data:
        out["marks"] = as_int(data, "marks", minimum=1, maximum=100)
    if not partial or "timeLimit" in data:
        out["time_limit"] = as_int(data, "timeLimit", minimum=5, maximum=300)
    if not partial or "orderNumber" in data:
        out["order_number"] = as_int(data, "orderNumber", minimum=1, maximum=10000)
    if not partial or "explanation" in data:
        out["explanation"] = as_str(data, "explanation", max_len=3000, required=False)
    return out


def validate_room_create(data: dict[str, Any]) -> dict[str, Any]:
    scoring = str(data.get("scoringMode", "simple"))
    if scoring not in SCORING_MODES:
        raise ValidationError("scoringMode must be simple or speed_bonus.")
    return {
        "quiz_id": as_uuid(data.get("quizId"), "quizId"),
        "room_name": as_str(data, "roomName", min_len=2, max_len=160),
        "participant_limit": as_int(data, "participantLimit", minimum=1, maximum=500, default=50),
        "host_pass_code": as_str(data, "hostPassCode", max_len=255, required=False),
        "show_leaderboard": as_bool(data, "showLeaderboard", True),
        "show_correct_answer": as_bool(data, "showCorrectAnswer", False),
        "scoring_mode": scoring,
    }


def validate_generated_quiz_json(value: Any) -> tuple[bool, dict[str, Any] | None, list[str]]:
    errors: list[str] = []
    if not isinstance(value, dict):
        return False, None, ["Generated JSON must be an object."]
    questions = value.get("questions")
    if not isinstance(questions, list) or not questions:
        return False, None, ["Generated JSON must include a non-empty questions array."]
    cleaned_questions = []
    for index, question in enumerate(questions):
        if not isinstance(question, dict):
            errors.append(f"Question {index + 1} must be an object.")
            continue
        try:
            cleaned_questions.append(validate_question(question))
        except ValidationError as exc:
            errors.append(f"Question {index + 1}: {exc}")
    if errors:
        return False, None, errors
    return True, {"questions": cleaned_questions}, []
