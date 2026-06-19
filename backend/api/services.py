from __future__ import annotations

import csv
import io
import random
import string
import uuid
from datetime import timedelta
from typing import Any

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
    OrganizationDailyStat,
    OrganizationInvite,
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


def leaderboard(room_code: str) -> list[dict[str, Any]]:
    room = get_room_by_code(room_code)
    rows = []
    participants = Participant.objects.filter(room=room).order_by("-score", "total_response_time_ms", "joined_at")[:500]
    for index, participant in enumerate(participants, 1):
        rows.append({
            "rank": index,
            "participantId": str(participant.id),
            "displayName": participant.display_name,
            "score": participant.score,
            "correctCount": participant.correct_count,
            "wrongCount": participant.wrong_count,
            "attemptedCount": participant.attempted_count,
            "accuracyPercent": 0 if participant.attempted_count == 0 else round(participant.correct_count / participant.attempted_count * 100),
            "totalResponseTimeMs": participant.total_response_time_ms,
        })
    return rows


def results_csv(room_code: str) -> HttpResponse:
    rows = leaderboard(room_code)
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
