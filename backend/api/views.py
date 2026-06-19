from __future__ import annotations

from django.db.models import Count
from django.http import HttpRequest
from django.views.decorators.csrf import csrf_exempt

from api import services
from api.auth import clear_session_cookie, get_participant_token, get_session_user, require_host, require_organization_admin, require_super_admin, set_participant_cookie, set_session_cookie
from api.models import AiQuestionDraft
from api.prisma_contract import validate_prisma_contract
from api.responses import fail, ok, validation_fail
from api.serializers import ai_generation_json, answer_json, draft_json, participant_json, question_json, quiz_json, room_json, user_json
from api.validation import (
    CORRECT_OPTIONS,
    ValidationError,
    as_int,
    as_str,
    as_uuid,
    parse_json,
    validate_question,
    validate_email,
    validate_otp,
    validate_password,
    validate_quiz_create,
    validate_room_create,
)


def handle(fn):
    try:
        validate_prisma_contract()
        return fn()
    except ValidationError as exc:
        return validation_fail(str(exc))
    except PermissionError as exc:
        return fail(str(exc), code="FORBIDDEN", status=403)
    except ValueError as exc:
        return fail(str(exc))
    except Exception as exc:
        return fail(str(exc), code="INTERNAL_ERROR", status=500)


@csrf_exempt
def auth_register(request: HttpRequest):
    def run():
        if request.method != "POST":
            return fail("Method not allowed.", status=405)
        data = parse_json(request)
        payload = {
            "name": as_str(data, "name", min_len=2, max_len=120),
            "email": validate_email(data.get("email")),
            "password": validate_password(data.get("password")),
        }
        user = services.create_user(payload)
        response = ok(user_json(user), status=201)
        return set_session_cookie(response, str(user.id))

    return handle(run)


@csrf_exempt
def auth_login(request: HttpRequest):
    def run():
        if request.method != "POST":
            return fail("Method not allowed.", status=405)
        data = parse_json(request)
        user = services.login_user(validate_email(data.get("email")), as_str(data, "password", min_len=1, max_len=128))
        response = ok(user_json(user))
        return set_session_cookie(response, str(user.id))

    return handle(run)


@csrf_exempt
def auth_logout(request: HttpRequest):
    response = ok({})
    return clear_session_cookie(response)


def auth_me(request: HttpRequest):
    user = get_session_user(request)
    return ok(user_json(user) if user else None)


@csrf_exempt
def auth_profile(request: HttpRequest):
    def run():
        user = require_host(request)
        if request.method == "GET":
            return ok(user_json(user))
        if request.method == "PATCH":
            data = parse_json(request)
            return ok(user_json(services.update_profile(user, {
                "name": as_str(data, "name", min_len=2, max_len=120),
                "email": validate_email(data.get("email")),
            })))
        return fail("Method not allowed.", status=405)

    return handle(run)


@csrf_exempt
def auth_change_password(request: HttpRequest):
    def run():
        user = require_host(request)
        if request.method != "POST":
            return fail("Method not allowed.", status=405)
        data = parse_json(request)
        services.change_password(
            user,
            as_str(data, "currentPassword", min_len=1, max_len=128),
            validate_password(data.get("newPassword")),
        )
        return ok({"changed": True})

    return handle(run)


@csrf_exempt
def auth_forgot_password(request: HttpRequest):
    def run():
        if request.method != "POST":
            return fail("Method not allowed.", status=405)
        data = parse_json(request)
        return ok(services.request_password_reset(validate_email(data.get("email"))))

    return handle(run)


@csrf_exempt
def auth_reset_password(request: HttpRequest):
    def run():
        if request.method != "POST":
            return fail("Method not allowed.", status=405)
        data = parse_json(request)
        services.reset_password_with_otp(
            validate_email(data.get("email")),
            validate_otp(data.get("code")),
            validate_password(data.get("password")),
        )
        return ok({"reset": True})

    return handle(run)


@csrf_exempt
def quizzes(request: HttpRequest):
    def run():
        user = require_host(request)
        if request.method == "GET":
            if request.GET.get("scope") == "explore":
                return ok(services.explore_quizzes(user))
            return ok(services.list_quizzes(user))
        if request.method == "POST":
            quiz = services.create_quiz(user, validate_quiz_create(parse_json(request)))
            return ok(quiz_json(quiz), status=201)
        return fail("Method not allowed.", status=405)

    return handle(run)


@csrf_exempt
def quiz_detail(request: HttpRequest, quiz_id: str):
    def run():
        user = require_host(request)
        if request.method == "GET":
            quiz = services.get_quiz(user, as_uuid(quiz_id, "quizId"))
            return ok(quiz_json(quiz, include_questions=True))
        if request.method == "PATCH":
            quiz = services.update_quiz(user, as_uuid(quiz_id, "quizId"), validate_quiz_create({**quiz_json(services.get_quiz(user, quiz_id)), **parse_json(request)}))
            return ok(quiz_json(quiz))
        if request.method == "DELETE":
            return ok(quiz_json(services.archive_quiz(user, as_uuid(quiz_id, "quizId"))))
        return fail("Method not allowed.", status=405)

    return handle(run)


@csrf_exempt
def quiz_questions(request: HttpRequest, quiz_id: str):
    def run():
        user = require_host(request)
        if request.method != "POST":
            return fail("Method not allowed.", status=405)
        question = services.add_question(user, as_uuid(quiz_id, "quizId"), validate_question(parse_json(request)))
        return ok(question_json(question), status=201)

    return handle(run)


@csrf_exempt
def question_detail(request: HttpRequest, question_id: str):
    def run():
        user = require_host(request)
        if request.method == "PATCH":
            question = services.update_question(user, as_uuid(question_id, "questionId"), validate_question(parse_json(request), partial=True))
            return ok(question_json(question))
        if request.method == "DELETE":
            services.delete_question(user, as_uuid(question_id, "questionId"))
            return ok({})
        return fail("Method not allowed.", status=405)

    return handle(run)


@csrf_exempt
def rooms(request: HttpRequest):
    def run():
        user = require_host(request)
        if request.method != "POST":
            return fail("Method not allowed.", status=405)
        room = services.create_room(user, validate_room_create(parse_json(request)))
        return ok(room_json(services.get_room_by_code(room.room_code)), status=201)

    return handle(run)


def room_detail(request: HttpRequest, room_code: str):
    return handle(lambda: ok(room_json(services.get_room_by_code(room_code))))


@csrf_exempt
def room_join(request: HttpRequest, room_code: str):
    def run():
        if request.method != "POST":
            return fail("Method not allowed.", status=405)
        data = parse_json(request)
        participant, token = services.join_room(room_code, as_str(data, "displayName", min_len=2, max_len=80))
        response = ok(participant_json(participant), status=201)
        return set_participant_cookie(response, room_code, token)

    return handle(run)


@csrf_exempt
def room_action(request: HttpRequest, room_code: str, action: str):
    def run():
        user = require_host(request)
        if request.method != "POST":
            return fail("Method not allowed.", status=405)
        actions = {
            "start": services.start_room,
            "pause": services.pause_room,
            "next-question": services.next_question,
            "end": services.end_room,
        }
        if action not in actions:
            return fail("Unknown room action.", status=404)
        room = actions[action](user, room_code)
        if action == "end":
            return ok({
                "room": room_json(services.get_room_by_code(room.room_code)),
                "leaderboard": services.build_room_leaderboard(room.room_code),
            })
        return ok(room_json(services.get_room_by_code(room.room_code)))

    return handle(run)


@csrf_exempt
def room_answer(request: HttpRequest, room_code: str):
    def run():
        if request.method != "POST":
            return fail("Method not allowed.", status=405)
        data = parse_json(request)
        selected = as_str(data, "selectedOption", min_len=1, max_len=1)
        if selected not in CORRECT_OPTIONS:
            raise ValidationError("selectedOption must be A, B, C, or D.")
        answer, score = services.submit_answer(room_code, get_participant_token(request, room_code), {
            "question_id": as_uuid(data.get("questionId"), "questionId"),
            "selected_option": selected,
        })
        return ok(answer_json(answer, score), status=201)

    return handle(run)


def leaderboard(request: HttpRequest, room_code: str):
    return handle(lambda: ok(services.build_room_leaderboard(room_code, get_participant_token(request, room_code))))


def room_results_csv(request: HttpRequest, room_code: str):
    def run():
        require_host(request)
        return services.results_csv(room_code)

    return handle(run)


@csrf_exempt
def ai_generate(request: HttpRequest):
    return handle(lambda: ok(services.save_ai_generation(require_host(request), parse_json(request)), status=201) if request.method == "POST" else fail("Method not allowed.", status=405))


def ai_generation_detail(request: HttpRequest, generation_id: str):
    def run():
        generation = services.get_ai_generation(require_host(request), as_uuid(generation_id, "generationId"))
        return ok(ai_generation_json(generation, include_drafts=True))

    return handle(run)


@csrf_exempt
def ai_publish(request: HttpRequest):
    def run():
        if request.method != "POST":
            return fail("Method not allowed.", status=405)
        data = parse_json(request)
        return ok(services.publish_ai_questions(require_host(request), as_uuid(data.get("generationId"), "generationId")))

    return handle(run)


@csrf_exempt
def ai_repair(request: HttpRequest):
    def run():
        if request.method != "POST":
            return fail("Method not allowed.", status=405)
        data = parse_json(request)
        return ok(services.save_repaired_generation(require_host(request), as_uuid(data.get("generationId"), "generationId"), data.get("repairedJson")))

    return handle(run)


@csrf_exempt
def ai_draft_question(request: HttpRequest, draft_question_id: str | None = None):
    def run():
        user = require_host(request)
        if draft_question_id and request.method == "PATCH":
            draft = AiQuestionDraft.objects.select_related("generation").get(id=as_uuid(draft_question_id, "draftQuestionId"))
            if user.role != "admin" and draft.generation.host_id != user.id:
                raise PermissionError("You cannot edit this draft.")
            data = validate_question(parse_json(request), partial=True)
            for key, value in data.items():
                setattr(draft, key, value)
            draft.save()
            return ok(draft_json(draft))
        if draft_question_id and request.method == "DELETE":
            draft = AiQuestionDraft.objects.select_related("generation").get(id=as_uuid(draft_question_id, "draftQuestionId"))
            if user.role != "admin" and draft.generation.host_id != user.id:
                raise PermissionError("You cannot delete this draft.")
            draft.status = "deleted"
            draft.save(update_fields=["status"])
            return ok(draft_json(draft))
        return fail("Method not allowed.", status=405)

    return handle(run)


def admin_overview(request: HttpRequest):
    return handle(lambda: ok(services.admin_overview()) if require_organization_admin(request) else ok({}))


def host_dashboard(request: HttpRequest):
    return handle(lambda: ok(services.host_dashboard(require_host(request))))


def host_analytics(request: HttpRequest):
    return handle(lambda: ok(services.host_analytics(require_host(request))))


def host_room_analytics(request: HttpRequest, room_id: str):
    return handle(lambda: ok(services.host_room_analytics(require_host(request), room_id)))


def host_host_passes(request: HttpRequest):
    return handle(lambda: ok(services.host_host_passes(require_host(request))))


def admin_users(request: HttpRequest):
    return handle(lambda: ok(services.admin_users()) if require_organization_admin(request) else ok([]))


def admin_host_passes(request: HttpRequest):
    def run():
        admin = require_organization_admin(request)
        if request.method == "GET":
            return ok(services.admin_host_passes())
        if request.method == "POST":
            return ok(services.create_host_pass(admin, parse_json(request)), status=201)
        return fail("Method not allowed.", status=405)

    return handle(run)


def admin_ai_usage(request: HttpRequest):
    return handle(lambda: ok(services.admin_ai_usage()) if require_organization_admin(request) else ok([]))


def admin_analytics(request: HttpRequest):
    return handle(lambda: ok(services.admin_analytics()) if require_organization_admin(request) else ok({}))


def admin_reports(request: HttpRequest):
    return handle(lambda: ok(services.admin_reports()) if require_organization_admin(request) else ok({}))


def admin_host_analytics(request: HttpRequest, user_id: str):
    return handle(lambda: ok(services.admin_host_analytics(user_id)) if require_organization_admin(request) else ok({}))


@csrf_exempt
def admin_organization_settings(request: HttpRequest):
    def run():
        admin = require_organization_admin(request)
        if request.method == "GET":
            return ok(services.admin_settings(admin))
        if request.method == "PATCH":
            return ok(services.admin_settings(admin, parse_json(request)))
        return fail("Method not allowed.", status=405)

    return handle(run)


@csrf_exempt
def admin_invite_user(request: HttpRequest):
    def run():
        admin = require_organization_admin(request)
        if request.method != "POST":
            return fail("Method not allowed.", status=405)
        return ok(services.invite_user(admin, parse_json(request)), status=201)

    return handle(run)


def admin_workspace(request: HttpRequest):
    return handle(lambda: ok(services.admin_workspace()) if require_organization_admin(request) else ok({}))


def admin_proctoring(request: HttpRequest, room_code: str):
    return handle(lambda: ok(services.admin_proctoring(room_code)) if require_organization_admin(request) else ok({}))


def admin_knowledge_gaps(request: HttpRequest):
    return handle(lambda: ok(services.admin_knowledge_gaps()) if require_organization_admin(request) else ok({}))


def super_admin_collection(request: HttpRequest, section: str):
    def run():
        admin = require_super_admin(request)
        if request.method == "GET":
            return ok(services.super_admin_payload(section, request.GET))
        if request.method in {"POST", "PATCH"}:
            return ok(services.super_admin_update_section(admin, section, parse_json(request)))
        return fail("Method not allowed.", status=405)

    return handle(run)


def super_admin_export(request: HttpRequest, section: str):
    def run():
        require_super_admin(request)
        if request.method != "GET":
            return fail("Method not allowed.", status=405)
        return services.super_admin_export(section, request.GET)

    return handle(run)


def super_admin_enterprise_detail(request: HttpRequest, enterprise_id: str):
    return handle(lambda: ok(services.super_admin_enterprise_detail(enterprise_id, request.GET)) if require_super_admin(request) else ok({}))


@csrf_exempt
def super_admin_action(request: HttpRequest, section: str, item_id: str, action: str):
    def run():
        admin = require_super_admin(request)
        if request.method != "POST":
            return fail("Method not allowed.", status=405)
        return ok(services.super_admin_action(admin, section, item_id, action, parse_json(request)))

    return handle(run)
