from __future__ import annotations

from decimal import Decimal
from typing import Any


def iso(value) -> str | None:
    return value.isoformat() if value else None


def clean(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    return value


def user_json(user) -> dict[str, Any]:
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "organizationId": str(user.organization_id) if user.organization_id else None,
        "isActive": user.is_active,
    }


def quiz_json(quiz, include_counts: bool = False, include_questions: bool = False) -> dict[str, Any]:
    data = {
        "id": str(quiz.id),
        "hostId": str(quiz.host_id),
        "organizationId": str(quiz.organization_id) if quiz.organization_id else None,
        "title": quiz.title,
        "subject": quiz.subject,
        "description": quiz.description,
        "defaultTimeLimit": quiz.default_time_limit,
        "defaultMarks": quiz.default_marks,
        "visibility": quiz.visibility,
        "status": quiz.status,
        "createdAt": iso(quiz.created_at),
        "updatedAt": iso(quiz.updated_at),
    }
    if include_counts:
        data["_count"] = {
            "questions": getattr(quiz, "questions_count", 0),
            "rooms": getattr(quiz, "rooms_count", 0),
        }
    if include_questions:
        data["questions"] = [question_json(question) for question in quiz.questions.all().order_by("order_number")]
    return data


def question_json(question) -> dict[str, Any]:
    return {
        "id": str(question.id),
        "quizId": str(question.quiz_id),
        "questionText": question.question_text,
        "optionA": question.option_a,
        "optionB": question.option_b,
        "optionC": question.option_c,
        "optionD": question.option_d,
        "correctOption": question.correct_option,
        "marks": question.marks,
        "timeLimit": question.time_limit,
        "explanation": question.explanation,
        "orderNumber": question.order_number,
        "createdAt": iso(question.created_at),
        "updatedAt": iso(question.updated_at),
    }


def room_json(room) -> dict[str, Any]:
    current = room.current_question
    return {
        "id": str(room.id),
        "quizId": str(room.quiz_id),
        "hostId": str(room.host_id),
        "organizationId": str(room.organization_id) if room.organization_id else None,
        "roomCode": room.room_code,
        "roomName": room.room_name,
        "status": room.status,
        "participantLimit": room.participant_limit,
        "freeLimit": room.free_limit,
        "currentQuestionId": str(room.current_question_id) if room.current_question_id else None,
        "currentQuestionOrder": room.current_question_order,
        "currentQuestionStartedAt": iso(room.current_question_started_at),
        "currentQuestionEndsAt": iso(room.current_question_ends_at),
        "showLeaderboard": room.show_leaderboard,
        "showCorrectAnswer": room.show_correct_answer,
        "scoringMode": room.scoring_mode,
        "createdAt": iso(room.created_at),
        "startedAt": iso(room.started_at),
        "endedAt": iso(room.ended_at),
        "_count": {"participants": getattr(room, "participants_count", 0)},
        "currentQuestion": question_json(current) if current else None,
    }


def participant_json(participant) -> dict[str, Any]:
    return {
        "id": str(participant.id),
        "roomId": str(participant.room_id),
        "displayName": participant.display_name,
        "score": participant.score,
        "correctCount": participant.correct_count,
        "wrongCount": participant.wrong_count,
        "attemptedCount": participant.attempted_count,
        "totalResponseTimeMs": participant.total_response_time_ms,
        "joinedAt": iso(participant.joined_at),
    }


def answer_json(answer, score: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "answer": {
            "id": str(answer.id),
            "roomId": str(answer.room_id),
            "participantId": str(answer.participant_id),
            "questionId": str(answer.question_id),
            "selectedOption": answer.selected_option,
            "isCorrect": answer.is_correct,
            "scoreAwarded": answer.score_awarded,
            "answeredAt": iso(answer.answered_at),
            "responseTimeMs": answer.response_time_ms,
        },
        "score": score,
    }


def ai_generation_json(generation, include_drafts: bool = False) -> dict[str, Any]:
    data = {
        "id": str(generation.id),
        "hostId": str(generation.host_id),
        "quizId": str(generation.quiz_id),
        "status": generation.status,
        "model": generation.model,
        "rawJson": generation.raw_json,
        "fixedJson": generation.fixed_json,
        "validationErrors": generation.validation_errors,
        "attemptCount": generation.attempt_count,
        "createdAt": iso(generation.created_at),
        "updatedAt": iso(generation.updated_at),
    }
    if include_drafts:
        data["drafts"] = [draft_json(draft) for draft in generation.drafts.all().order_by("order_number")]
    return data


def draft_json(draft) -> dict[str, Any]:
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
