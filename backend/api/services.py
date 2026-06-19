from __future__ import annotations

import csv
import io
import random
import string
import uuid
from collections import Counter
from datetime import timedelta
from typing import Any
from urllib.parse import urlencode

from django.conf import settings
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.db.models import Avg, Count, F, Max, Q
from django.http import HttpResponse
from django.utils import timezone

from api.auth import create_random_token, hash_password, hash_token, verify_password
from api.models import (
    AiGeneration,
    AiQuestionDraft,
    AiUsageLog,
    Answer,
    AuditLog,
    HostPass,
    Organization,
    OrganizationDailyStat,
    OrganizationInvite,
    PasswordResetOtp,
    Participant,
    ParticipantRoomSummary,
    Question,
    Quiz,
    Room,
    RoomQuestionStat,
    User,
)
from api.serializers import ai_generation_json, participant_json, question_json, quiz_json, room_json, user_json
from api.validation import validate_generated_quiz_json
from api import super_admin_services


def create_user(data: dict[str, Any]) -> User:
    email = str(data["email"]).strip().lower()
    if User.objects.filter(email=email).exists():
        raise ValueError("An account already exists for this email.")
    now = timezone.now()
    return User.objects.create(
        id=uuid.uuid4(),
        name=str(data["name"]).strip(),
        email=email,
        password_hash=hash_password(str(data["password"])),
        role="host",
        is_active=True,
        created_at=now,
        updated_at=now,
    )


def update_profile(user: User, data: dict[str, Any]) -> User:
    email = str(data.get("email", user.email)).strip().lower()
    name = str(data.get("name", user.name)).strip()
    if not name:
        raise ValueError("Name is required.")
    existing = User.objects.filter(email=email).exclude(id=user.id).first()
    if existing:
        raise ValueError("An account already exists for this email.")
    user.name = name
    user.email = email
    user.updated_at = timezone.now()
    user.save(update_fields=["name", "email", "updated_at"])
    return user


def change_password(user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.password_hash):
        raise ValueError("Current password is incorrect.")
    user.password_hash = hash_password(new_password)
    user.updated_at = timezone.now()
    user.save(update_fields=["password_hash", "updated_at"])


def login_user(email: str, password: str) -> User:
    try:
        user = User.objects.get(email=email.strip().lower(), is_active=True)
    except User.DoesNotExist as exc:
        raise ValueError("Invalid email or password.") from exc
    if not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password.")
    user.last_login_at = timezone.now()
    user.updated_at = timezone.now()
    user.save(update_fields=["last_login_at", "updated_at"])
    return user


def request_password_reset(email: str) -> dict[str, Any]:
    user = User.objects.filter(email=email.strip().lower(), is_active=True).first()
    if not user:
        return {"sent": True}
    now = timezone.now()
    code = "".join(random.choice(string.digits) for _ in range(6))
    PasswordResetOtp.objects.filter(user=user, used_at__isnull=True, expires_at__gt=now).update(used_at=now)
    PasswordResetOtp.objects.create(
        id=uuid.uuid4(),
        user=user,
        code_hash=hash_token(code),
        expires_at=now + timedelta(minutes=settings.PASSWORD_RESET_OTP_MINUTES),
        created_at=now,
    )
    reset_url = f"{settings.APP_BASE_URL.rstrip('/')}/reset-password?{urlencode({'email': user.email, 'code': code})}"
    send_mail(
        subject="Reset your biiQuiz password",
        message=(
            f"Use this 6-digit code to reset your biiQuiz password: {code}\n\n"
            f"The code expires in {settings.PASSWORD_RESET_OTP_MINUTES} minutes.\n\n"
            f"Reset link: {reset_url}\n\n"
            "If you did not request this, you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
    return {"sent": True, "expiresInMinutes": settings.PASSWORD_RESET_OTP_MINUTES}


def reset_password_with_otp(email: str, code: str, new_password: str) -> None:
    now = timezone.now()
    user = User.objects.filter(email=email.strip().lower(), is_active=True).first()
    if not user:
        raise ValueError("Invalid or expired reset code.")
    otp = PasswordResetOtp.objects.filter(
        user=user,
        code_hash=hash_token(code),
        used_at__isnull=True,
        expires_at__gt=now,
    ).order_by("-created_at").first()
    if not otp:
        raise ValueError("Invalid or expired reset code.")
    user.password_hash = hash_password(new_password)
    user.updated_at = now
    user.save(update_fields=["password_hash", "updated_at"])
    otp.used_at = now
    otp.save(update_fields=["used_at"])
    PasswordResetOtp.objects.filter(user=user, used_at__isnull=True).update(used_at=now)


def list_quizzes(user: User) -> list[dict[str, Any]]:
    qs = Quiz.objects.annotate(questions_count=Count("questions"), rooms_count=Count("rooms")).order_by("-created_at")
    if user.role != "admin":
        qs = qs.filter(host_id=user.id)
    return [quiz_json(quiz, include_counts=True) for quiz in qs]


def get_quiz(user: User, quiz_id: str) -> Quiz:
    try:
        quiz = Quiz.objects.get(id=quiz_id)
    except Quiz.DoesNotExist as exc:
        raise ValueError("Quiz not found.") from exc
    if user.role != "admin" and quiz.host_id != user.id:
        raise PermissionError("You cannot access this quiz.")
    return quiz


def create_quiz(user: User, data: dict[str, Any]) -> Quiz:
    now = timezone.now()
    return Quiz.objects.create(
        id=uuid.uuid4(),
        host=user,
        organization_id=user.organization_id,
        created_at=now,
        updated_at=now,
        **data,
    )


def update_quiz(user: User, quiz_id: str, data: dict[str, Any]) -> Quiz:
    quiz = get_quiz(user, quiz_id)
    for key, value in data.items():
        setattr(quiz, key, value)
    quiz.updated_at = timezone.now()
    quiz.save()
    return quiz


def archive_quiz(user: User, quiz_id: str) -> Quiz:
    quiz = get_quiz(user, quiz_id)
    quiz.status = "archived"
    quiz.updated_at = timezone.now()
    quiz.save(update_fields=["status", "updated_at"])
    return quiz


def add_question(user: User, quiz_id: str, data: dict[str, Any]) -> Question:
    quiz = get_quiz(user, quiz_id)
    now = timezone.now()
    return Question.objects.create(id=uuid.uuid4(), quiz=quiz, created_at=now, updated_at=now, **data)


def update_question(user: User, question_id: str, data: dict[str, Any]) -> Question:
    try:
        question = Question.objects.select_related("quiz").get(id=question_id)
    except Question.DoesNotExist as exc:
        raise ValueError("Question not found.") from exc
    if user.role != "admin" and question.quiz.host_id != user.id:
        raise PermissionError("You cannot edit this question.")
    for key, value in data.items():
        setattr(question, key, value)
    question.updated_at = timezone.now()
    question.save()
    return question


def delete_question(user: User, question_id: str) -> None:
    question = update_question(user, question_id, {})
    question.delete()


def _room_code() -> str:
    return "".join(random.choice(string.ascii_uppercase + string.digits) for _ in range(6))


def create_unique_room_code() -> str:
    for _ in range(20):
        code = _room_code()
        if not Room.objects.filter(room_code=code).exists():
            return code
    raise ValueError("Could not generate a unique room code.")


def validate_host_pass(pass_code: str | None, user: User, required: int) -> HostPass | None:
    if required <= 50:
        return None
    if not pass_code:
        raise ValueError("A valid biiQuiz Host Pass is required for more than 50 participants.")
    pass_hash = hash_token(pass_code)
    now = timezone.now()
    try:
        host_pass = HostPass.objects.get(pass_code_hash=pass_hash, is_active=True, valid_until__gte=now, participant_limit__gte=required)
    except HostPass.DoesNotExist as exc:
        raise ValueError("A valid biiQuiz Host Pass is required for more than 50 participants.") from exc
    if host_pass.assigned_host_id and host_pass.assigned_host_id != user.id:
        raise ValueError("This Host Pass is assigned to another host.")
    if host_pass.assigned_organization_id and host_pass.assigned_organization_id != user.organization_id:
        raise ValueError("This Host Pass is assigned to another organization.")
    return host_pass


def create_room(user: User, data: dict[str, Any]) -> Room:
    quiz = get_quiz(user, data["quiz_id"])
    if not Question.objects.filter(quiz=quiz).exists():
        raise ValueError("Add at least one question before creating a room.")
    host_pass = validate_host_pass(data.pop("host_pass_code", None), user, data["participant_limit"])
    now = timezone.now()
    return Room.objects.create(
        id=uuid.uuid4(),
        quiz=quiz,
        host=user,
        organization_id=user.organization_id,
        room_code=create_unique_room_code(),
        host_pass=host_pass,
        free_limit=50,
        created_at=now,
        updated_at=now,
        **data,
    )


def get_room_by_code(room_code: str) -> Room:
    try:
        return Room.objects.select_related("current_question", "quiz").annotate(participants_count=Count("participants")).get(room_code=room_code)
    except Room.DoesNotExist as exc:
        raise ValueError("Room not found.") from exc


def get_owned_room(user: User, room_code: str) -> Room:
    room = get_room_by_code(room_code)
    if user.role != "admin" and room.host_id != user.id:
        raise PermissionError("You cannot control this room.")
    return room


def join_room(room_code: str, display_name: str) -> tuple[Participant, str]:
    token = create_random_token()
    token_hash = hash_token(token)
    with transaction.atomic():
        room = Room.objects.select_for_update().get(room_code=room_code)
        if room.status == "ended":
            raise ValueError("This room has ended.")
        count = Participant.objects.filter(room=room).count()
        next_count = count + 1
        if next_count > room.participant_limit:
            raise ValueError("This room is full.")
        if next_count > room.free_limit:
            pass_valid = room.host_pass and room.host_pass.is_active and room.host_pass.valid_until >= timezone.now() and room.host_pass.participant_limit >= next_count
            if not pass_valid:
                raise ValueError("This quiz room has reached the free limit of 50 participants. Please ask the host to upgrade with a biiQuiz Host Pass.")
        now = timezone.now()
        participant = Participant.objects.create(
            id=uuid.uuid4(),
            room=room,
            display_name=display_name,
            join_token_hash=token_hash,
            last_seen_at=now,
            joined_at=now,
            created_at=now,
            updated_at=now,
        )
    return participant, token


def start_room(user: User, room_code: str) -> Room:
    room = get_owned_room(user, room_code)
    question = Question.objects.filter(quiz_id=room.quiz_id).order_by("order_number").first()
    if not question:
        raise ValueError("This quiz has no questions.")
    now = timezone.now()
    room.status = "active"
    room.current_question = question
    room.current_question_order = question.order_number
    room.current_question_started_at = now
    room.current_question_ends_at = now + timedelta(seconds=question.time_limit)
    room.started_at = room.started_at or now
    room.updated_at = now
    room.save()
    return room


def pause_room(user: User, room_code: str) -> Room:
    room = get_owned_room(user, room_code)
    room.status = "paused"
    room.updated_at = timezone.now()
    room.save(update_fields=["status", "updated_at"])
    return room


def next_question(user: User, room_code: str) -> Room:
    room = get_owned_room(user, room_code)
    question = Question.objects.filter(quiz_id=room.quiz_id, order_number__gt=room.current_question_order or 0).order_by("order_number").first()
    if not question:
        return end_room(user, room_code)
    now = timezone.now()
    room.status = "active"
    room.current_question = question
    room.current_question_order = question.order_number
    room.current_question_started_at = now
    room.current_question_ends_at = now + timedelta(seconds=question.time_limit)
    room.updated_at = now
    room.save()
    return room


def end_room(user: User, room_code: str) -> Room:
    room = get_owned_room(user, room_code)
    now = timezone.now()
    room.status = "ended"
    room.ended_at = now
    room.updated_at = now
    room.save(update_fields=["status", "ended_at", "updated_at"])
    return room


def calculate_score(question: Question, selected: str, room: Room, answered_at) -> dict[str, Any]:
    is_correct = selected == question.correct_option
    started = room.current_question_started_at
    ends = room.current_question_ends_at
    total_ms = max(1, int((ends - started).total_seconds() * 1000)) if started and ends else 1
    response_ms = max(0, int((answered_at - started).total_seconds() * 1000)) if started else 0
    if not is_correct:
        return {"isCorrect": False, "scoreAwarded": 0, "responseTimeMs": response_ms}
    score = question.marks
    if room.scoring_mode == "speed_bonus" and ends:
        remaining = max(0, int((ends - answered_at).total_seconds() * 1000))
        score += round(question.marks * 0.5 * remaining / total_ms)
    return {"isCorrect": True, "scoreAwarded": score, "responseTimeMs": response_ms}


def submit_answer(room_code: str, participant_token: str | None, data: dict[str, Any]) -> tuple[Answer, dict[str, Any]]:
    if not participant_token:
        raise ValueError("Participant session not found.")
    now = timezone.now()
    token_hash = hash_token(participant_token)
    with transaction.atomic():
        room = Room.objects.select_for_update().select_related("current_question").get(room_code=room_code)
        participant = Participant.objects.select_for_update().filter(room=room, join_token_hash=token_hash).first()
        if not participant:
            raise ValueError("Participant session not found.")
        if room.status != "active":
            raise ValueError("Room is not accepting answers.")
        if not room.current_question:
            raise ValueError("No active question.")
        if str(room.current_question_id) != str(data["question_id"]):
            raise ValueError("This question is not currently active.")
        if room.current_question_ends_at and now > room.current_question_ends_at:
            raise ValueError("Time is up for this question.")
        score = calculate_score(room.current_question, data["selected_option"], room, now)
        try:
            answer = Answer.objects.create(
                id=uuid.uuid4(),
                room=room,
                participant=participant,
                question=room.current_question,
                selected_option=data["selected_option"],
                is_correct=score["isCorrect"],
                score_awarded=score["scoreAwarded"],
                answered_at=now,
                response_time_ms=score["responseTimeMs"],
                created_at=now,
            )
        except IntegrityError as exc:
            raise ValueError("Answer already submitted.") from exc
        participant.score += score["scoreAwarded"]
        participant.attempted_count += 1
        participant.correct_count += 1 if score["isCorrect"] else 0
        participant.wrong_count += 0 if score["isCorrect"] else 1
        participant.total_response_time_ms += score["responseTimeMs"]
        participant.last_seen_at = now
        participant.updated_at = now
        participant.save()
    return answer, score


def build_room_leaderboard(room_code: str, participant_token: str | None = None) -> dict[str, Any]:
    room = get_room_by_code(room_code)
    total_questions = Question.objects.filter(quiz_id=room.quiz_id).count()
    participant_token_hash = hash_token(participant_token) if participant_token else None
    rows = []
    participants = Participant.objects.filter(room=room).order_by("-score", "-correct_count", "total_response_time_ms", "joined_at")[:500]
    for index, participant in enumerate(participants, 1):
        rows.append({
            "rank": index,
            "userId": str(participant.id),
            "participantId": str(participant.id),
            "name": participant.display_name,
            "displayName": participant.display_name,
            "score": participant.score,
            "correct": participant.correct_count,
            "correctCount": participant.correct_count,
            "wrongCount": participant.wrong_count,
            "attempted": participant.attempted_count,
            "attemptedCount": participant.attempted_count,
            "totalQuestions": total_questions,
            "timeTakenSeconds": int((participant.total_response_time_ms + 999) / 1000),
            "isCurrentUser": participant_token_hash == participant.join_token_hash if participant_token_hash else False,
            "accuracyPercent": 0 if participant.attempted_count == 0 else round(participant.correct_count / participant.attempted_count * 100),
            "totalResponseTimeMs": participant.total_response_time_ms,
        })
    return {
        "roomId": str(room.id),
        "quizId": str(room.quiz_id),
        "quizStatus": "live" if room.status == "active" else room.status,
        "leaderboard": rows,
    }


def leaderboard(room_code: str) -> list[dict[str, Any]]:
    return build_room_leaderboard(room_code)["leaderboard"]


def results_csv(room_code: str) -> HttpResponse:
    rows = build_room_leaderboard(room_code)["leaderboard"]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["rank", "participant", "score", "correct", "wrong", "attempted", "accuracy_percent", "total_response_time_ms"])
    writer.writeheader()
    for row in rows:
        writer.writerow({
            "rank": row["rank"],
            "participant": row["displayName"],
            "score": row["score"],
            "correct": row["correctCount"],
            "wrong": row["wrongCount"],
            "attempted": row["attemptedCount"],
            "accuracy_percent": row["accuracyPercent"],
            "total_response_time_ms": row["totalResponseTimeMs"],
        })
    response = HttpResponse(output.getvalue(), content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{room_code}-results.csv"'
    return response


def save_ai_generation(user: User, payload: dict[str, Any]) -> dict[str, Any]:
    input_data = payload.get("input") or {}
    generated_json = payload.get("generatedJson")
    quiz = get_quiz(user, input_data.get("quizId"))
    valid, cleaned, errors = validate_generated_quiz_json(generated_json)
    now = timezone.now()
    generation = AiGeneration.objects.create(
        id=uuid.uuid4(),
        host=user,
        quiz=quiz,
        input_prompt=json_prompt(input_data),
        input_subject=str(input_data.get("subject", "")),
        input_level=str(input_data.get("level", "")),
        input_topic=str(input_data.get("topic", "")),
        input_difficulty=str(input_data.get("difficulty", "mixed")),
        input_language=str(input_data.get("language", "English")),
        question_count=int(input_data.get("questionCount", 0)),
        marks_per_question=int(input_data.get("marksPerQuestion", 1)),
        time_per_question=int(input_data.get("timePerQuestion", 30)),
        raw_json=generated_json,
        fixed_json=cleaned,
        validation_errors=None if valid else errors,
        status="ready_for_preview" if valid else "validation_failed",
        model=input_data.get("model"),
        created_at=now,
        updated_at=now,
    )
    AiUsageLog.objects.create(
        id=uuid.uuid4(),
        host=user,
        organization_id=user.organization_id,
        action="generate",
        question_count=generation.question_count,
        model=generation.model,
        status="success" if valid else "failed",
        error_message=None if valid else "Generated JSON failed validation.",
        created_at=now,
    )
    drafts = []
    if valid and cleaned:
        for index, question in enumerate(cleaned["questions"], 1):
            drafts.append(AiQuestionDraft.objects.create(
                id=uuid.uuid4(),
                generation=generation,
                quiz=quiz,
                status="draft",
                order_number=index,
                created_at=now,
                updated_at=now,
                **question,
            ))
    return {"generation": ai_generation_json(generation), "drafts": [question_json_like_draft(d) for d in drafts], "validationErrors": None if valid else errors}


def json_prompt(input_data: dict[str, Any]) -> str:
    return "\n".join(f"{key}: {value}" for key, value in input_data.items())


def get_ai_generation(user: User, generation_id: str) -> AiGeneration:
    generation = AiGeneration.objects.get(id=generation_id)
    if user.role != "admin" and generation.host_id != user.id:
        raise PermissionError("You cannot view this AI generation.")
    return generation


def save_repaired_generation(user: User, generation_id: str, repaired_json: Any) -> dict[str, Any]:
    generation = get_ai_generation(user, generation_id)
    valid, cleaned, errors = validate_generated_quiz_json(repaired_json)
    now = timezone.now()
    with transaction.atomic():
        generation.fixed_json = cleaned if valid else repaired_json
        generation.validation_errors = None if valid else errors
        generation.status = "repaired" if valid else "validation_failed"
        generation.attempt_count += 1
        generation.updated_at = now
        generation.save(update_fields=["fixed_json", "validation_errors", "status", "attempt_count", "updated_at"])
        AiUsageLog.objects.create(
            id=uuid.uuid4(),
            host=generation.host,
            organization_id=generation.host.organization_id,
            action="repair",
            question_count=generation.question_count,
            model=generation.model,
            status="success" if valid else "failed",
            error_message=None if valid else "Repaired JSON failed validation.",
            created_at=now,
        )
        AiQuestionDraft.objects.filter(generation=generation).delete()
        drafts = []
        if valid and cleaned:
            for index, question in enumerate(cleaned["questions"], 1):
                drafts.append(AiQuestionDraft.objects.create(
                    id=uuid.uuid4(),
                    generation=generation,
                    quiz_id=generation.quiz_id,
                    status="draft",
                    order_number=index,
                    created_at=now,
                    updated_at=now,
                    **question,
                ))
    return {"generation": ai_generation_json(generation), "drafts": [question_json_like_draft(d) for d in drafts], "validationErrors": None if valid else errors}


def publish_ai_questions(user: User, generation_id: str) -> list[dict[str, Any]]:
    generation = get_ai_generation(user, generation_id)
    if generation.status not in {"ready_for_preview", "repaired"}:
        raise ValueError("AI questions must pass backend validation before publishing.")
    drafts = list(generation.drafts.exclude(status="deleted").order_by("order_number"))
    if not drafts:
        raise ValueError("There are no draft questions to publish.")
    last = Question.objects.filter(quiz_id=generation.quiz_id).order_by("-order_number").first()
    start = last.order_number if last else 0
    now = timezone.now()
    questions = []
    with transaction.atomic():
        for index, draft in enumerate(drafts, 1):
            questions.append(Question.objects.create(
                id=uuid.uuid4(),
                quiz_id=generation.quiz_id,
                question_text=draft.question_text,
                option_a=draft.option_a,
                option_b=draft.option_b,
                option_c=draft.option_c,
                option_d=draft.option_d,
                correct_option=draft.correct_option,
                marks=draft.marks,
                time_limit=draft.time_limit,
                explanation=draft.explanation,
                order_number=start + index,
                created_at=now,
                updated_at=now,
            ))
        generation.status = "published"
        generation.updated_at = now
        generation.save(update_fields=["status", "updated_at"])
        AiUsageLog.objects.create(
            id=uuid.uuid4(),
            host=user,
            organization_id=user.organization_id,
            action="publish",
            question_count=len(drafts),
            model=generation.model,
            status="success",
            created_at=now,
        )
    return [question_json(question) for question in questions]


def question_json_like_draft(draft: AiQuestionDraft) -> dict[str, Any]:
    return {
        "id": str(draft.id),
        "generationId": str(draft.generation_id),
        "quizId": str(draft.quiz_id),
        "questionText": draft.question_text,
        "optionA": draft.option_a,
        "optionB": draft.option_b,
        "optionC": draft.option_c,
        "optionD": draft.option_d,
        "correctOption": draft.correct_option,
        "marks": draft.marks,
        "timeLimit": draft.time_limit,
        "explanation": draft.explanation,
        "status": draft.status,
        "orderNumber": draft.order_number,
    }


def _pct(numerator: int | float | None, denominator: int | float | None) -> int:
    if not numerator or not denominator:
        return 0
    return round(float(numerator) / float(denominator) * 100)


def _org_filter(user: User) -> Q:
    return Q(organization_id=user.organization_id) if user.organization_id else Q(organization_id__isnull=True)


def _room_accuracy(room_ids: list[str]) -> int:
    if not room_ids:
        return 0
    totals = Answer.objects.filter(room_id__in=room_ids).aggregate(total=Count("id"), correct=Count("id", filter=Q(is_correct=True)))
    return _pct(totals["correct"], totals["total"])


def _host_pass_json(item: HostPass) -> dict[str, Any]:
    return {
        "id": str(item.id),
        "planName": item.plan_name,
        "participantLimit": item.participant_limit,
        "validUntil": item.valid_until.isoformat(),
        "isActive": item.is_active,
        "assignedHostId": str(item.assigned_host_id) if item.assigned_host_id else None,
        "assignedOrganizationId": str(item.assigned_organization_id) if item.assigned_organization_id else None,
        "createdByAdminId": str(item.created_by_admin_id) if item.created_by_admin_id else None,
        "usedAt": item.used_at.isoformat() if item.used_at else None,
        "createdAt": item.created_at.isoformat(),
    }


def host_dashboard(user: User) -> dict[str, Any]:
    quizzes = Quiz.objects.filter(host=user)
    rooms = Room.objects.filter(host=user)
    room_ids = list(rooms.values_list("id", flat=True))
    active_rooms = rooms.filter(status__in=["waiting", "active", "paused"]).select_related("quiz").annotate(participants_count=Count("participants")).order_by("-created_at")[:5]
    return {
        "stats": [
            {"label": "Active participants", "value": Participant.objects.filter(room__host=user, room__status__in=["waiting", "active", "paused"]).count(), "detail": "In current live rooms"},
            {"label": "Total quizzes", "value": quizzes.count(), "detail": f"{quizzes.filter(status='draft').count()} drafts"},
            {"label": "Average score", "value": f"{_room_accuracy(room_ids)}%", "detail": "Across hosted rooms"},
            {"label": "AI generations", "value": AiGeneration.objects.filter(host=user).count(), "detail": "BYOK JSON saves"},
        ],
        "activeRooms": [
            {
                "roomCode": room.room_code,
                "roomName": room.room_name,
                "quizTitle": room.quiz.title,
                "status": room.status,
                "participants": getattr(room, "participants_count", 0),
            }
            for room in active_rooms
        ],
        "draftsReady": [
            {
                "id": str(quiz.id),
                "title": quiz.title,
                "subject": quiz.subject,
                "questions": getattr(quiz, "questions_count", 0),
            }
            for quiz in quizzes.filter(status="draft").annotate(questions_count=Count("questions")).order_by("-updated_at")[:5]
        ],
    }


def explore_quizzes(user: User) -> list[dict[str, Any]]:
    qs = Quiz.objects.filter(Q(visibility="public") | Q(visibility="organization", organization_id=user.organization_id)).exclude(host=user).annotate(questions_count=Count("questions"), rooms_count=Count("rooms")).order_by("-created_at")[:60]
    return [quiz_json(quiz, include_counts=True) for quiz in qs]


def host_analytics(user: User) -> dict[str, Any]:
    rooms = Room.objects.filter(host=user)
    room_ids = list(rooms.values_list("id", flat=True))
    participants = Participant.objects.filter(room_id__in=room_ids)
    answers = Answer.objects.filter(room_id__in=room_ids)
    subjects = []
    for row in answers.values("question__quiz__subject").annotate(total=Count("id"), correct=Count("id", filter=Q(is_correct=True))).order_by("-total")[:6]:
        subjects.append({"label": row["question__quiz__subject"] or "General", "value": _pct(row["correct"], row["total"])})
    recent_rooms = rooms.annotate(participants_count=Count("participants")).select_related("quiz").order_by("-created_at")[:10]
    return {
        "stats": [
            {"label": "Hosted rooms", "value": rooms.count(), "detail": "All time"},
            {"label": "Participants", "value": participants.count(), "detail": "Across all rooms"},
            {"label": "Average accuracy", "value": f"{_room_accuracy(room_ids)}%", "detail": "Correct answers"},
            {"label": "Question bank", "value": Question.objects.filter(quiz__host=user).count(), "detail": "Reusable questions"},
        ],
        "subjects": subjects,
        "recentRooms": [
            [room.room_name, getattr(room, "participants_count", 0), f"{_room_accuracy([str(room.id)])}%", room.status.title()]
            for room in recent_rooms
        ],
        "recentRoomDetails": [
            {
                "id": str(room.id),
                "roomCode": room.room_code,
                "roomName": room.room_name,
                "quizTitle": room.quiz.title,
                "participants": getattr(room, "participants_count", 0),
                "accuracy": f"{_room_accuracy([str(room.id)])}%",
                "status": room.status.title(),
                "createdAt": room.created_at.isoformat(),
            }
            for room in recent_rooms
        ],
    }


def host_room_analytics(user: User, room_id: str) -> dict[str, Any]:
    try:
        room = Room.objects.select_related("quiz", "host").get(id=room_id)
    except Room.DoesNotExist as exc:
        raise ValueError("Room not found.") from exc
    if user.role != "admin" and room.host_id != user.id:
        raise PermissionError("You cannot view analytics for this room.")

    questions = list(Question.objects.filter(quiz=room.quiz).order_by("order_number"))
    total_questions = len(questions)
    participants = list(Participant.objects.filter(room=room).order_by("joined_at"))
    answers = list(Answer.objects.filter(room=room).select_related("participant", "question").order_by("answered_at"))
    answers_by_participant: dict[str, list[Answer]] = {}
    answers_by_question: dict[str, list[Answer]] = {}
    for answer in answers:
        answers_by_participant.setdefault(str(answer.participant_id), []).append(answer)
        answers_by_question.setdefault(str(answer.question_id), []).append(answer)

    leaderboard_rows = build_room_leaderboard(room.room_code)["leaderboard"]
    latest_answer_by_participant = {
        participant_id: max(items, key=lambda item: item.answered_at)
        for participant_id, items in answers_by_participant.items()
    }
    for row in leaderboard_rows:
        latest = latest_answer_by_participant.get(row["participantId"])
        row["submittedAt"] = latest.answered_at.isoformat() if latest else None

    attempted_scores = [participant.score for participant in participants if participant.attempted_count > 0]
    completed_count = sum(1 for participant in participants if total_questions > 0 and participant.attempted_count >= total_questions)
    total_attempted = sum(participant.attempted_count for participant in participants)
    total_correct = sum(participant.correct_count for participant in participants)
    average_score = round(sum(participant.score for participant in participants) / len(participants), 1) if participants else 0
    average_accuracy = _pct(total_correct, total_attempted)
    completion_rate = _pct(completed_count, len(participants))

    participant_rows = []
    for participant in participants:
        latest = latest_answer_by_participant.get(str(participant.id))
        if total_questions > 0 and participant.attempted_count >= total_questions:
            status = "completed"
        elif participant.attempted_count > 0:
            status = "submitted"
        else:
            status = "joined"
        participant_rows.append({
            "participantId": str(participant.id),
            "name": participant.display_name,
            "joinedAt": participant.joined_at.isoformat(),
            "status": status,
            "score": participant.score,
            "lastActivity": (latest.answered_at if latest else participant.last_seen_at or participant.joined_at).isoformat(),
        })

    question_rows = []
    for question in questions:
        question_answers = answers_by_question.get(str(question.id), [])
        option_counts = Counter(answer.selected_option for answer in question_answers)
        attempted = len(question_answers)
        correct = sum(1 for answer in question_answers if answer.is_correct)
        wrong = attempted - correct
        wrong_options = {key: value for key, value in option_counts.items() if key != question.correct_option}
        most_wrong = max(wrong_options.items(), key=lambda item: item[1])[0] if wrong_options else None
        avg_ms = sum(answer.response_time_ms for answer in question_answers) / attempted if attempted else 0
        question_rows.append({
            "questionId": str(question.id),
            "questionText": question.question_text,
            "correctAnswer": question.correct_option,
            "correctPercentage": _pct(correct, attempted),
            "wrongPercentage": _pct(wrong, attempted),
            "optionCounts": {option: option_counts.get(option, 0) for option in ["A", "B", "C", "D"]},
            "mostSelectedWrongOption": most_wrong,
            "averageTimeSeconds": round(avg_ms / 1000, 1),
            "attempted": attempted,
        })

    answered_questions = [item for item in question_rows if item["attempted"] > 0]
    hardest = min(answered_questions, key=lambda item: item["correctPercentage"], default=None)
    easiest = max(answered_questions, key=lambda item: item["correctPercentage"], default=None)
    top = leaderboard_rows[0] if leaderboard_rows else None
    incomplete = [participant for participant in participants if total_questions > 0 and participant.attempted_count < total_questions]
    insights = []
    if hardest:
        insights.append({"title": "Hardest question", "detail": f"{hardest['correctPercentage']}% correct: {hardest['questionText'][:120]}"})
    if easiest:
        insights.append({"title": "Easiest question", "detail": f"{easiest['correctPercentage']}% correct: {easiest['questionText'][:120]}"})
    if top:
        insights.append({"title": "Top performer", "detail": f"{top['displayName']} scored {top['score']} with {top['correct']} correct."})
    if incomplete:
        insights.append({"title": "Incomplete attempts", "detail": f"{len(incomplete)} participant(s) did not complete all questions."})
    if average_accuracy < 50 and total_attempted > 0:
        insights.append({"title": "Low accuracy warning", "detail": f"Average accuracy is {average_accuracy}%. Consider reviewing this topic."})
    if not insights:
        insights.append({"title": "No results yet", "detail": "Insights will appear after students submit answers."})

    return {
        "room": {
            "id": str(room.id),
            "roomCode": room.room_code,
            "name": room.room_name,
            "quizTitle": room.quiz.title,
            "status": "live" if room.status == "active" else room.status,
            "createdAt": room.created_at.isoformat(),
            "hostName": room.host.name,
            "totalQuestions": total_questions,
            "totalParticipants": len(participants),
        },
        "summary": {
            "participants": len(participants),
            "completed": completed_count,
            "averageScore": average_score,
            "averageAccuracy": average_accuracy,
            "highestScore": max(attempted_scores) if attempted_scores else 0,
            "lowestScore": min(attempted_scores) if attempted_scores else 0,
            "completionRate": completion_rate,
        },
        "winner": leaderboard_rows[0] if leaderboard_rows else None,
        "leaderboard": leaderboard_rows,
        "participants": participant_rows,
        "questions": question_rows,
        "insights": insights,
    }


def host_host_passes(user: User) -> dict[str, Any]:
    qs = HostPass.objects.filter(Q(assigned_host=user) | Q(assigned_organization_id=user.organization_id) | Q(assigned_host__isnull=True, assigned_organization__isnull=True)).order_by("-valid_until")
    active = qs.filter(is_active=True, valid_until__gte=timezone.now())
    return {
        "passes": [_host_pass_json(item) for item in qs[:20]],
        "stats": [
            {"label": "Free room limit", "value": 50, "detail": "Included for every host"},
            {"label": "Available passes", "value": active.count(), "detail": "Assigned or global"},
            {"label": "Max participant limit", "value": active.aggregate(max_limit=Avg("participant_limit"))["max_limit"] or 50, "detail": "Average available unlock"},
        ],
    }


def admin_overview() -> dict[str, Any]:
    activity = [
        [
            item.actor.name if item.actor else "System",
            item.action,
            item.entity_type,
            item.created_at.isoformat(),
        ]
        for item in AuditLog.objects.select_related("actor").order_by("-created_at")[:8]
    ]
    return {
        "metrics": [
            {"label": "Active hosts", "value": User.objects.filter(role="host", is_active=True).count()},
            {"label": "Live rooms", "value": Room.objects.filter(status="active").count()},
            {"label": "Host passes", "value": HostPass.objects.filter(is_active=True).count()},
            {"label": "AI questions", "value": AiQuestionDraft.objects.exclude(status="deleted").count()},
        ],
        "overview": {
            "hosts": User.objects.filter(role="host").count(),
            "admins": User.objects.filter(role="admin").count(),
            "rooms": Room.objects.count(),
            "activeRooms": Room.objects.filter(status="active").count(),
            "quizzes": Quiz.objects.count(),
            "aiGenerations": AiGeneration.objects.count(),
        },
        "aiUsageTrend": [
            {"label": "Generate", "value": AiUsageLog.objects.filter(action="generate").count()},
            {"label": "Repair", "value": AiUsageLog.objects.filter(action="repair").count()},
            {"label": "Publish", "value": AiUsageLog.objects.filter(action="publish").count()},
            {"label": "Failures", "value": AiUsageLog.objects.filter(status="failed").count()},
        ],
        "activity": activity,
    }


def admin_users() -> list[dict[str, Any]]:
    return [
        {
            **user_json(user),
            "organization": {"id": str(user.organization_id), "name": user.organization.name, "plan": user.organization.plan} if user.organization else None,
            "rooms": Room.objects.filter(host=user).count(),
            "plan": user.organization.plan.title() if user.organization else "Personal",
        }
        for user in User.objects.select_related("organization").order_by("-created_at")[:200]
    ]


def admin_host_passes() -> list[dict[str, Any]]:
    return [_host_pass_json(item) for item in HostPass.objects.order_by("-created_at")[:200]]


def create_host_pass(admin: User, data: dict[str, Any]) -> dict[str, Any]:
    if not admin.organization_id:
        raise ValueError("Admin must belong to an organization to create a Host Pass.")
    pass_code = str(data.get("passCode", "")).strip()
    if len(pass_code) < 4:
        raise ValueError("passCode is required.")
    now = timezone.now()
    item = HostPass.objects.create(
        id=uuid.uuid4(),
        pass_code_hash=hash_token(pass_code),
        plan_name=str(data.get("planName", "Organization")),
        participant_limit=int(data.get("participantLimit", 100)),
        valid_until=now + timedelta(days=int(data.get("validDays", 180))),
        is_active=bool(data.get("isActive", True)),
        assigned_organization_id=data.get("assignedOrganizationId") or admin.organization_id,
        assigned_host_id=data.get("assignedHostId") or None,
        created_by_admin=admin,
        created_at=now,
        updated_at=now,
    )
    return _host_pass_json(item)


def admin_ai_usage() -> list[dict[str, Any]]:
    return [
        {
            "id": str(item.id),
            "hostId": str(item.host_id),
            "hostName": item.host.name,
            "hostEmail": item.host.email,
            "organizationName": item.organization.name if item.organization else None,
            "action": item.action,
            "questionCount": item.question_count,
            "model": item.model,
            "status": item.status,
            "errorMessage": item.error_message,
            "createdAt": item.created_at.isoformat(),
        }
        for item in AiUsageLog.objects.select_related("host", "organization").order_by("-created_at")[:200]
    ]


def admin_analytics() -> dict[str, Any]:
    room_ids = list(Room.objects.values_list("id", flat=True))
    reports = []
    for room in Room.objects.select_related("quiz").annotate(participants_count=Count("participants")).order_by("-created_at")[:12]:
        reports.append([room.quiz.title, f"{getattr(room, 'participants_count', 0)} learners", f"{_room_accuracy([str(room.id)])}%", "Download CSV"])
    topics = []
    for row in Answer.objects.values("question__quiz__subject").annotate(total=Count("id"), correct=Count("id", filter=Q(is_correct=True))).order_by("-total")[:6]:
        topics.append({"label": row["question__quiz__subject"] or "General", "value": _pct(row["correct"], row["total"])})
    return {
        "kpis": [
            {"label": "Completion rate", "value": f"{_pct(Participant.objects.filter(room_id__in=room_ids, attempted_count__gt=0).count(), Participant.objects.filter(room_id__in=room_ids).count())}%"},
            {"label": "Avg accuracy", "value": f"{_room_accuracy(room_ids)}%"},
            {"label": "Knowledge gaps", "value": RoomQuestionStat.objects.filter(correct_count__lt=F("wrong_count")).count()},
            {"label": "Reports exported", "value": ParticipantRoomSummary.objects.count()},
        ],
        "topics": topics,
        "reports": reports,
        "overview": admin_overview()["overview"],
    }


def admin_reports() -> dict[str, Any]:
    return admin_analytics()


def admin_host_analytics(user_id: str) -> dict[str, Any]:
    try:
        host = User.objects.get(id=user_id)
    except (User.DoesNotExist, ValueError):
        host = User.objects.filter(email=user_id).first()
    if not host:
        raise ValueError("Host not found.")
    data = host_analytics(host)
    return {"host": user_json(host), **data}


def admin_settings(admin: User, data: dict[str, Any] | None = None) -> dict[str, Any]:
    if not admin.organization_id:
        return {"organization": None}
    org = admin.organization
    if data is not None:
        org.name = str(data.get("name", org.name)).strip() or org.name
        org.slug = str(data.get("slug", org.slug)).strip() or org.slug
        org.branding_json = data.get("brandingJson", org.branding_json)
        org.settings_json = data.get("settingsJson", org.settings_json)
        org.updated_at = timezone.now()
        org.save(update_fields=["name", "slug", "branding_json", "settings_json", "updated_at"])
    return {
        "organization": {"id": str(org.id), "name": org.name, "slug": org.slug, "plan": org.plan, "brandingJson": org.branding_json, "settingsJson": org.settings_json},
        "seatUsage": [
            {"label": "Host seats", "value": User.objects.filter(organization=org, role="host").count()},
            {"label": "Admin seats", "value": User.objects.filter(organization=org, role="admin").count()},
        ],
    }


def invite_user(admin: User, data: dict[str, Any]) -> dict[str, Any]:
    if not admin.organization_id:
        raise ValueError("Admin must belong to an organization to invite users.")
    email = str(data.get("email", "")).strip().lower()
    role = str(data.get("role", "host"))
    if role not in {"host", "admin"}:
        raise ValueError("role must be host or admin.")
    if not email:
        raise ValueError("email is required.")
    token = create_random_token()
    invite = OrganizationInvite.objects.create(
        id=uuid.uuid4(),
        organization_id=admin.organization_id,
        email=email,
        role=role,
        token_hash=hash_token(token),
        invited_by=admin,
        expires_at=timezone.now() + timedelta(days=14),
        created_at=timezone.now(),
    )
    return {"id": str(invite.id), "email": invite.email, "role": invite.role, "expiresAt": invite.expires_at.isoformat()}


def admin_workspace() -> dict[str, Any]:
    rows = []
    for row in Quiz.objects.filter(visibility__in=["organization", "public"]).values("organization__name", "title").annotate(size=Count("questions"), updated=Max("updated_at")).order_by("-updated")[:20]:
        rows.append([row["organization__name"] or "Public Library", row["title"], f"{row['size']} questions", row["updated"].isoformat() if row["updated"] else ""])
    return {"templates": rows}


def admin_proctoring(room_code: str) -> dict[str, Any]:
    room = get_room_by_code(room_code)
    participants = Participant.objects.filter(room=room)
    total = participants.count()
    attempted = participants.filter(attempted_count__gt=0).count()
    alerts = [
        {"student": item.display_name, "issue": "No response submitted yet", "action": "Send prompt"}
        for item in participants.filter(attempted_count=0).order_by("joined_at")[:10]
    ]
    return {
        "room": room_json(room),
        "stats": [
            {"label": "Completion", "value": f"{_pct(attempted, total)}%"},
            {"label": "Accuracy", "value": f"{_room_accuracy([str(room.id)])}%"},
            {"label": "Needs attention", "value": len(alerts)},
            {"label": "Sentiment", "value": "Stable"},
        ],
        "distribution": [
            {"label": "Answered", "value": _pct(attempted, total)},
            {"label": "Skipped", "value": _pct(max(total - attempted, 0), total)},
            {"label": "Idle", "value": _pct(participants.filter(last_seen_at__lt=timezone.now() - timedelta(minutes=2)).count(), total)},
        ],
        "alerts": alerts,
    }


def admin_knowledge_gaps() -> dict[str, Any]:
    gaps = []
    for row in Answer.objects.values("question__quiz__subject").annotate(total=Count("id"), correct=Count("id", filter=Q(is_correct=True))).order_by("correct")[:8]:
        mastery = _pct(row["correct"], row["total"])
        gaps.append({"topic": row["question__quiz__subject"] or "General", "mastery": mastery, "severity": "High" if mastery < 50 else "Medium" if mastery < 70 else "Low"})
    return {
        "stats": [
            {"label": "At-risk topics", "value": len([gap for gap in gaps if gap["mastery"] < 70])},
            {"label": "Avg mastery", "value": f"{round(sum(g['mastery'] for g in gaps) / len(gaps)) if gaps else 0}%"},
            {"label": "Suggested quizzes", "value": len(gaps)},
            {"label": "Trend", "value": "+0%"},
        ],
        "gaps": gaps,
    }


SUPER_ADMIN_SECTIONS = {
    "dashboard",
    "enterprises",
    "hosts",
    "students",
    "quizzes",
    "rooms",
    "analytics",
    "plans",
    "upgrade-requests",
    "payments",
    "domains",
    "ai-settings",
    "support",
    "audit-logs",
    "settings",
}


def super_admin_payload(section: str, query: dict[str, Any] | None = None) -> dict[str, Any]:
    return super_admin_services.payload(section, query)


def super_admin_enterprise_detail(enterprise_id: str, query: dict[str, Any] | None = None) -> dict[str, Any]:
    return super_admin_services.enterprise_detail(enterprise_id, query)


def super_admin_action(admin: User, section: str, item_id: str, action: str, data: dict[str, Any] | None = None) -> dict[str, Any]:
    return super_admin_services.action(admin, section, item_id, action, data)


def super_admin_update_section(admin: User, section: str, data: dict[str, Any]) -> dict[str, Any]:
    return super_admin_services.update_section(admin, section, data)


def super_admin_export(section: str, query: dict[str, Any] | None = None) -> HttpResponse:
    return super_admin_services.export_csv(section, query)


def _super_admin_dashboard() -> dict[str, Any]:
    orgs = Organization.objects.exclude(slug="platform")
    active_rooms = Room.objects.filter(status="active")
    recent_audit = AuditLog.objects.select_related("actor", "organization").order_by("-created_at")[:8]
    pending_payments = _super_admin_payments()["rows"]
    return {
        "stats": [
            {"label": "Enterprises", "value": orgs.count(), "detail": "Tenants on platform", "tone": "blue"},
            {"label": "Live rooms", "value": active_rooms.count(), "detail": "Running now", "tone": "green"},
            {"label": "Pending payments", "value": len([row for row in pending_payments if row["status"] == "Pending"]), "detail": "Manual review queue", "tone": "orange"},
            {"label": "Usage alerts", "value": len(_usage_alerts()), "detail": "Limits above 80%", "tone": "red"},
        ],
        "pendingApprovals": _super_admin_upgrade_requests()["rows"][:6],
        "pendingPayments": pending_payments[:6],
        "usageAlerts": _usage_alerts()[:6],
        "recentActivity": _audit_rows(recent_audit),
        "topEnterprises": [_enterprise_row(org) for org in orgs.order_by("-created_at")[:6]],
    }


def _super_admin_enterprises(search: str = "") -> dict[str, Any]:
    qs = Organization.objects.exclude(slug="platform").order_by("-created_at")
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(slug__icontains=search))
    rows = [_enterprise_row(org) for org in qs[:100]]
    return {"rows": rows, "stats": [{"label": "Total enterprises", "value": qs.count()}, {"label": "Active", "value": len([row for row in rows if row["status"] == "Active"])}, {"label": "Suspended", "value": len([row for row in rows if row["status"] == "Suspended"])}]}


def _super_admin_users(role: str, search: str = "") -> dict[str, Any]:
    qs = User.objects.filter(role=role).select_related("organization").order_by("-created_at")
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(email__icontains=search) | Q(organization__name__icontains=search))
    return {"rows": [_user_row(user) for user in qs[:120]], "stats": [{"label": f"Total {role}s", "value": qs.count()}, {"label": "Active", "value": qs.filter(is_active=True).count()}, {"label": "Inactive", "value": qs.filter(is_active=False).count()}]}


def _super_admin_students(search: str = "") -> dict[str, Any]:
    qs = Participant.objects.select_related("room", "room__organization").order_by("-joined_at")
    if search:
        qs = qs.filter(Q(display_name__icontains=search) | Q(room__room_code__icontains=search) | Q(room__organization__name__icontains=search))
    return {"rows": _student_rows(qs[:120]), "stats": [{"label": "Joined students", "value": qs.count()}, {"label": "Submitted", "value": qs.filter(attempted_count__gt=0).count()}, {"label": "Avg score", "value": round(qs.aggregate(avg=Avg("score"))["avg"] or 0)}]}


def _super_admin_quizzes(search: str = "") -> dict[str, Any]:
    qs = Quiz.objects.select_related("host", "organization").annotate(questions_count=Count("questions"), rooms_count=Count("rooms")).order_by("-updated_at")
    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(host__name__icontains=search) | Q(organization__name__icontains=search))
    return {"rows": [_quiz_row(quiz) for quiz in qs[:120]], "stats": [{"label": "Quizzes", "value": qs.count()}, {"label": "Published", "value": qs.filter(status="published").count()}, {"label": "Draft", "value": qs.filter(status="draft").count()}]}


def _super_admin_rooms(search: str = "") -> dict[str, Any]:
    qs = Room.objects.select_related("quiz", "host", "organization").annotate(participants_count=Count("participants")).order_by("-created_at")
    if search:
        qs = qs.filter(Q(room_name__icontains=search) | Q(room_code__icontains=search) | Q(quiz__title__icontains=search) | Q(organization__name__icontains=search))
    return {"rows": [_room_row(room) for room in qs[:120]], "stats": [{"label": "Rooms", "value": qs.count()}, {"label": "Live", "value": qs.filter(status="active").count()}, {"label": "Ended", "value": qs.filter(status="ended").count()}]}


def _super_admin_analytics() -> dict[str, Any]:
    orgs = Organization.objects.exclude(slug="platform").count()
    rooms = Room.objects.count()
    answers = Answer.objects.count()
    participants = Participant.objects.count()
    return {
        "stats": [
            {"label": "Platform growth", "value": orgs, "detail": "Enterprises"},
            {"label": "Engagement", "value": participants, "detail": "Participants joined"},
            {"label": "Answers", "value": answers, "detail": "Submitted answers"},
            {"label": "Manual revenue", "value": f"${HostPass.objects.count() * 29}", "detail": "Estimated from passes"},
        ],
        "enterpriseComparison": [_enterprise_row(org) for org in Organization.objects.exclude(slug="platform").order_by("-created_at")[:10]],
        "hostActivity": [_user_row(user) for user in User.objects.filter(role="host").order_by("-last_login_at")[:10]],
        "planUsage": [{"label": plan, "value": Organization.objects.exclude(slug="platform").filter(plan=plan).count()} for plan in ["free", "school", "enterprise"]],
    }


def _super_admin_plans() -> dict[str, Any]:
    plans = [
        {"id": "free", "name": "Free", "price": "$0", "hosts": 1, "students": 50, "quizzes": 20, "rooms": 10, "ai": "BYOK only", "features": ["Live rooms", "BYOK AI", "CSV export"]},
        {"id": "school", "name": "School", "price": "$99", "hosts": 25, "students": 500, "quizzes": 1000, "rooms": 250, "ai": "Limited", "features": ["Org admins", "Branding", "Analytics"]},
        {"id": "enterprise", "name": "Enterprise", "price": "Custom", "hosts": 250, "students": 5000, "quizzes": 10000, "rooms": 2000, "ai": "Package quota", "features": ["Domains", "Priority support", "Audit"]},
    ]
    return {"rows": plans, "stats": [{"label": "Plans", "value": len(plans)}, {"label": "Enterprise tenants", "value": Organization.objects.exclude(slug="platform").filter(plan="enterprise").count()}]}


def _super_admin_upgrade_requests() -> dict[str, Any]:
    rows = []
    for org in Organization.objects.exclude(slug="platform").order_by("-updated_at")[:40]:
        settings_json = org.settings_json or {}
        if not settings_json.get("requestedPlan") and not settings_json.get("upgradeStatus"):
            continue
        rows.append({"id": str(org.id), "enterprise": org.name, "requestedPlan": settings_json.get("requestedPlan", "School"), "status": settings_json.get("upgradeStatus", "Pending"), "createdAt": org.updated_at.isoformat(), "adminNote": settings_json.get("upgradeAdminNote", "")})
    return {"rows": rows, "stats": [{"label": "Pending", "value": len([row for row in rows if row["status"] == "Pending"])}, {"label": "Total requests", "value": len(rows)}]}


def _super_admin_payments(org: Organization | None = None) -> dict[str, Any]:
    orgs = [org] if org else list(Organization.objects.exclude(slug="platform").order_by("-updated_at")[:60])
    rows = []
    for item in orgs:
        settings_json = item.settings_json or {}
        payment = settings_json.get("payment", {})
        if not payment:
            continue
        rows.append({"id": str(item.id), "enterprise": item.name, "payerName": payment.get("payerName", item.name), "transactionId": payment.get("transactionId", "-"), "amount": payment.get("amount", 0), "status": payment.get("status", "Pending"), "adminNote": payment.get("adminNote", "")})
    return {"rows": rows, "stats": [{"label": "Pending payments", "value": len([row for row in rows if row["status"] == "Pending"])}, {"label": "Verified", "value": len([row for row in rows if row["status"] == "Verified"])}]}


def _super_admin_domains(org: Organization | None = None) -> dict[str, Any]:
    orgs = [org] if org else list(Organization.objects.exclude(slug="platform").order_by("-created_at")[:80])
    rows = []
    for item in orgs:
        settings_json = item.settings_json or {}
        domain = settings_json.get("domain") or f"{item.slug}.biiquiz.com"
        rows.append({"id": str(item.id), "enterprise": item.name, "domain": domain, "dnsStatus": settings_json.get("dnsStatus", "Pending"), "sslStatus": settings_json.get("sslStatus", "Pending"), "websiteStatus": settings_json.get("websiteStatus", "Active" if item.plan != "free" else "Disabled")})
    return {"rows": rows, "stats": [{"label": "Domains", "value": len(rows)}, {"label": "SSL verified", "value": len([row for row in rows if row["sslStatus"] == "Verified"])}]}


def _super_admin_ai_settings() -> dict[str, Any]:
    settings_json = (_platform_settings_org().settings_json or {}).get("aiSettings", {})
    return {
        "model": settings_json.get("model", "gemini-2.5-flash"),
        "fallbackModel": settings_json.get("fallbackModel", "gemini-2.0-flash"),
        "quota": [
            {"plan": "free", "aiAccess": "BYOK", "monthlyQuestions": settings_json.get("freeMonthlyQuestions", 0)},
            {"plan": "school", "aiAccess": "Enabled", "monthlyQuestions": settings_json.get("schoolMonthlyQuestions", 1000)},
            {"plan": "enterprise", "aiAccess": "Enabled", "monthlyQuestions": settings_json.get("enterpriseMonthlyQuestions", 10000)},
        ],
        "usage": [{"label": row["model"] or "Unknown", "value": row["total"]} for row in AiUsageLog.objects.values("model").annotate(total=Count("id")).order_by("-total")[:8]],
    }


def _super_admin_support(org: Organization | None = None) -> dict[str, Any]:
    qs = AuditLog.objects.filter(action__icontains="support").select_related("actor", "organization").order_by("-created_at")
    if org:
        qs = qs.filter(organization=org)
    rows = [{"id": str(item.id), "subject": item.metadata_json.get("subject", "Support request") if item.metadata_json else "Support request", "enterprise": item.organization.name if item.organization else "Platform", "priority": (item.metadata_json or {}).get("priority", "Medium"), "status": (item.metadata_json or {}).get("status", "Open"), "createdAt": item.created_at.isoformat()} for item in qs[:80]]
    return {"rows": rows, "stats": [{"label": "Open tickets", "value": len([row for row in rows if row["status"] != "Closed"])}, {"label": "Total", "value": len(rows)}]}


def _super_admin_audit_logs() -> dict[str, Any]:
    return {"rows": _audit_rows(AuditLog.objects.select_related("actor", "organization").order_by("-created_at")[:150]), "stats": [{"label": "Audit events", "value": AuditLog.objects.count()}]}


def _super_admin_settings() -> dict[str, Any]:
    root = _platform_settings_org()
    settings_json = root.settings_json or {}
    return {"settings": settings_json or {"branding": "biiQuiz", "defaultPlan": "free", "defaultLimit": 50, "paymentQrImage": "/payment.png", "maintenanceMode": False, "registrationEnabled": True}, "stats": [{"label": "Maintenance", "value": "On" if (settings_json or {}).get("maintenanceMode") else "Off"}, {"label": "Registration", "value": "Enabled" if (settings_json or {}).get("registrationEnabled", True) else "Disabled"}]}


def _enterprise_row(org: Organization) -> dict[str, Any]:
    settings_json = org.settings_json or {}
    return {"id": str(org.id), "name": org.name, "slug": org.slug, "plan": org.plan, "status": str(settings_json.get("status", "Active")).title(), "createdAt": org.created_at.isoformat(), "usage": _enterprise_usage(org)}


def _enterprise_usage(org: Organization) -> list[dict[str, Any]]:
    hosts = User.objects.filter(organization=org, role="host").count()
    students = Participant.objects.filter(room__organization=org).count()
    quizzes = Quiz.objects.filter(organization=org).count()
    rooms = Room.objects.filter(organization=org).count()
    ai = AiUsageLog.objects.filter(organization=org).aggregate(total=Count("id"))["total"] or 0
    limits = {"free": (1, 50, 20, 10, 100), "school": (25, 500, 1000, 250, 1000), "enterprise": (250, 5000, 10000, 2000, 10000)}
    h, s, q, r, a = limits.get(org.plan, limits["free"])
    return [{"label": "hosts", "used": hosts, "limit": h, "percent": _pct(hosts, h)}, {"label": "students", "used": students, "limit": s, "percent": _pct(students, s)}, {"label": "quizzes", "used": quizzes, "limit": q, "percent": _pct(quizzes, q)}, {"label": "rooms", "used": rooms, "limit": r, "percent": _pct(rooms, r)}, {"label": "AI usage", "used": ai, "limit": a, "percent": _pct(ai, a)}]


def _usage_alerts() -> list[dict[str, Any]]:
    alerts = []
    for org in Organization.objects.exclude(slug="platform"):
        for usage in _enterprise_usage(org):
            if usage["percent"] >= 80:
                alerts.append({"enterprise": org.name, "metric": usage["label"], "percent": usage["percent"], "status": "Warning" if usage["percent"] < 95 else "Critical"})
    return alerts


def _user_row(user: User) -> dict[str, Any]:
    return {"id": str(user.id), "name": user.name, "email": user.email, "role": user.role, "enterprise": user.organization.name if user.organization else "Platform", "status": "Active" if user.is_active else "Suspended", "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None, "createdAt": user.created_at.isoformat()}


def _student_rows(qs) -> list[dict[str, Any]]:
    return [{"id": str(item.id), "name": item.display_name, "enterprise": item.room.organization.name if item.room.organization else "Personal room", "room": item.room.room_name, "score": item.score, "correct": item.correct_count, "attempted": item.attempted_count, "status": "Active" if item.attempted_count else "Joined", "joinedAt": item.joined_at.isoformat()} for item in qs]


def _quiz_row(quiz: Quiz) -> dict[str, Any]:
    return {"id": str(quiz.id), "title": quiz.title, "status": quiz.status.title(), "host": quiz.host.name, "enterprise": quiz.organization.name if quiz.organization else "Personal", "questions": getattr(quiz, "questions_count", 0), "rooms": getattr(quiz, "rooms_count", 0), "updatedAt": quiz.updated_at.isoformat()}


def _room_row(room: Room) -> dict[str, Any]:
    winner = Participant.objects.filter(room=room).order_by("-score", "-correct_count", "total_response_time_ms").first()
    return {"id": str(room.id), "roomCode": room.room_code, "name": room.room_name, "quiz": room.quiz.title, "enterprise": room.organization.name if room.organization else "Personal", "participants": getattr(room, "participants_count", 0), "winner": winner.display_name if winner else "-", "status": room.status.title(), "createdAt": room.created_at.isoformat()}


def _audit_rows(qs) -> list[dict[str, Any]]:
    return [{"id": str(item.id), "actor": item.actor.name if item.actor else "System", "action": item.action, "target": item.entity_type, "oldValue": (item.metadata_json or {}).get("oldValue", "-"), "newValue": (item.metadata_json or {}).get("newValue", "-"), "enterprise": item.organization.name if item.organization else "Platform", "timestamp": item.created_at.isoformat()} for item in qs]


def _super_admin_audit(admin: User, action: str, entity_type: str, entity_id: Any, metadata: dict[str, Any] | None = None) -> None:
    AuditLog.objects.create(id=uuid.uuid4(), actor=admin, organization_id=admin.organization_id, action=f"super_admin.{action}", entity_type=entity_type, entity_id=entity_id if entity_id else None, metadata_json=metadata or {}, created_at=timezone.now())


def _platform_settings_org() -> Organization:
    now = timezone.now()
    platform, _ = Organization.objects.get_or_create(
        slug="platform",
        defaults={
            "id": uuid.uuid4(),
            "name": "Platform Settings",
            "plan": "enterprise",
            "branding_json": {},
            "settings_json": {},
            "created_at": now,
            "updated_at": now,
        },
    )
    return platform
