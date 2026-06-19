from __future__ import annotations

import os
import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.auth import hash_password, hash_token
from api.models import (
    AiGeneration,
    AiQuestionDraft,
    AiUsageLog,
    Answer,
    AuditLog,
    HostPass,
    ManualPayment,
    Organization,
    OrganizationDailyStat,
    OrganizationSubscription,
    Participant,
    Plan,
    Question,
    Quiz,
    Room,
    SupportTicket,
    TenantDomain,
    UpgradeRequest,
    User,
)


ORGANIZATIONS = [
    ("biiquiz-school-demo", "biiQuiz School Demo", "school"),
    ("biiquiz-enterprise-demo", "biiQuiz Enterprise Demo", "enterprise"),
    ("biiquiz-training-demo", "biiQuiz Training Demo", "pro"),
]

USERS = [
    ("Personal Host One", "personal.host1@example.com", "host", None),
    ("Personal Host Two", "personal.host2@example.com", "host", None),
    ("School Admin", "school.admin@example.com", "admin", "biiquiz-school-demo"),
    ("School Host One", "school.host1@example.com", "host", "biiquiz-school-demo"),
    ("School Host Two", "school.host2@example.com", "host", "biiquiz-school-demo"),
    ("Enterprise Admin", "enterprise.admin@example.com", "admin", "biiquiz-enterprise-demo"),
    ("Enterprise Host One", "enterprise.host1@example.com", "host", "biiquiz-enterprise-demo"),
    ("Enterprise Host Two", "enterprise.host2@example.com", "host", "biiquiz-enterprise-demo"),
    ("Training Admin", "training.admin@example.com", "admin", "biiquiz-training-demo"),
    ("Training Host One", "training.host1@example.com", "host", "biiquiz-training-demo"),
]


class Command(BaseCommand):
    help = "Create idempotent demo users and app data for frontend/backend testing."

    def handle(self, *args, **options):
        password = os.getenv("TEST_USER_PASSWORD", "Test@12345")
        password_hash = hash_password(password)
        now = timezone.now()

        organizations = {}
        for slug, name, plan in ORGANIZATIONS:
            org, _ = Organization.objects.get_or_create(
                slug=slug,
                defaults={
                    "id": uuid.uuid4(),
                    "name": name,
                    "plan": plan,
                    "branding_json": {"primaryColor": "#1d4ed8"},
                    "settings_json": {"sso": False, "seatLimit": 50},
                    "status": "active",
                    "is_sample": True,
                    "created_at": now,
                    "updated_at": now,
                },
            )
            org.name = name
            org.plan = plan
            org.status = "active"
            org.is_sample = True
            org.updated_at = now
            org.save(update_fields=["name", "plan", "status", "is_sample", "updated_at"])
            organizations[slug] = org

        users = {}
        for name, email, role, slug in USERS:
            org = organizations.get(slug) if slug else None
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    "id": uuid.uuid4(),
                    "organization": org,
                    "name": name,
                    "password_hash": password_hash,
                    "role": role,
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now,
                },
            )
            user.organization = org
            user.name = name
            user.password_hash = password_hash
            user.role = role
            user.is_active = True
            user.updated_at = now
            user.save(update_fields=["organization", "name", "password_hash", "role", "is_active", "updated_at"])
            users[email] = user

        self._seed_supporting_data(users, organizations, now)

        self.stdout.write(self.style.SUCCESS("Created/updated 10 test users and demo app data."))
        self.stdout.write(f"Password: {password}")
        for _, email, role, slug in USERS:
            self.stdout.write(f"{email} | {role} | {slug or 'personal'}")

    def _seed_supporting_data(self, users, organizations, now):
        hosts = [users["personal.host1@example.com"], users["school.host1@example.com"], users["enterprise.host1@example.com"], users["training.host1@example.com"]]
        for index, host in enumerate(hosts, 1):
            quiz, _ = Quiz.objects.get_or_create(
                title=f"Demo {host.name} Quiz",
                host=host,
                defaults={
                    "id": uuid.uuid4(),
                    "organization_id": host.organization_id,
                    "subject": ["Physics", "Biology", "Security", "Math"][index - 1],
                    "description": "Seeded quiz for backend-driven UI testing.",
                    "default_time_limit": 30,
                    "default_marks": 1,
                    "visibility": "public" if index == 1 else "organization",
                    "status": "published",
                    "created_at": now - timedelta(days=index),
                    "updated_at": now,
                },
            )
            quiz.organization_id = host.organization_id
            quiz.status = "published"
            quiz.visibility = "public" if index == 1 else "organization"
            quiz.updated_at = now
            quiz.save(update_fields=["organization_id", "status", "visibility", "updated_at"])
            for order in range(1, 4):
                Question.objects.update_or_create(
                    quiz=quiz,
                    order_number=order,
                    defaults={
                        "question_text": f"Question {order} for {quiz.title}?",
                        "option_a": "Correct answer",
                        "option_b": "Distractor one",
                        "option_c": "Distractor two",
                        "option_d": "Distractor three",
                        "correct_option": "A",
                        "marks": 10,
                        "time_limit": 30,
                        "explanation": "Seeded explanation.",
                        "created_at": now,
                        "updated_at": now,
                    },
                )
            first_question = Question.objects.filter(quiz=quiz).order_by("order_number").first()
            room, _ = Room.objects.get_or_create(
                room_code=f"DEMO{index}A",
                defaults={
                    "id": uuid.uuid4(),
                    "quiz": quiz,
                    "host": host,
                    "organization_id": host.organization_id,
                    "room_name": f"{quiz.subject or 'Demo'} Live Room",
                    "status": "active" if index == 1 else "ended",
                    "participant_limit": 100 if host.organization_id else 50,
                    "free_limit": 50,
                    "current_question": first_question,
                    "current_question_order": first_question.order_number if first_question else None,
                    "current_question_started_at": now - timedelta(seconds=10),
                    "current_question_ends_at": now + timedelta(seconds=20),
                    "show_leaderboard": True,
                    "show_correct_answer": False,
                    "scoring_mode": "simple",
                    "created_at": now - timedelta(days=index),
                    "started_at": now - timedelta(minutes=5),
                    "ended_at": None if index == 1 else now - timedelta(minutes=1),
                    "updated_at": now,
                },
            )
            room.status = "active" if index == 1 else "ended"
            room.current_question = first_question
            room.updated_at = now
            room.save(update_fields=["status", "current_question", "updated_at"])
            for participant_index in range(1, 6):
                token = f"{room.room_code}-{participant_index}"
                participant, _ = Participant.objects.get_or_create(
                    room=room,
                    display_name=f"Student {participant_index}",
                    defaults={
                        "id": uuid.uuid4(),
                        "join_token_hash": hash_token(token),
                        "score": 0,
                        "correct_count": 0,
                        "wrong_count": 0,
                        "attempted_count": 0,
                        "total_response_time_ms": 0,
                        "joined_at": now - timedelta(minutes=participant_index),
                        "last_seen_at": now,
                        "created_at": now,
                        "updated_at": now,
                    },
                )
                for question in Question.objects.filter(quiz=quiz).order_by("order_number")[:2]:
                    answer, _ = Answer.objects.get_or_create(
                        room=room,
                        participant=participant,
                        question=question,
                        defaults={
                            "id": uuid.uuid4(),
                            "selected_option": "A" if participant_index % 2 else "B",
                            "is_correct": participant_index % 2 == 1,
                            "score_awarded": 10 if participant_index % 2 else 0,
                            "answered_at": now,
                            "response_time_ms": 1200 + participant_index * 100,
                            "created_at": now,
                        },
                    )
                answers = Answer.objects.filter(room=room, participant=participant)
                participant.attempted_count = answers.count()
                participant.correct_count = answers.filter(is_correct=True).count()
                participant.wrong_count = answers.filter(is_correct=False).count()
                participant.score = sum(item.score_awarded for item in answers)
                participant.updated_at = now
                participant.save(update_fields=["attempted_count", "correct_count", "wrong_count", "score", "updated_at"])
            generation, _ = AiGeneration.objects.get_or_create(
                host=host,
                quiz=quiz,
                input_topic="Seeded topic",
                defaults={
                    "id": uuid.uuid4(),
                    "input_prompt": "Seeded prompt",
                    "input_subject": quiz.subject or "General",
                    "input_level": "Demo",
                    "input_difficulty": "mixed",
                    "input_language": "English",
                    "question_count": 2,
                    "marks_per_question": 10,
                    "time_per_question": 30,
                    "raw_json": {"questions": []},
                    "fixed_json": {"questions": []},
                    "validation_errors": None,
                    "status": "published",
                    "attempt_count": 0,
                    "model": "gemini-2.5-flash",
                    "created_at": now,
                    "updated_at": now,
                },
            )
            AiUsageLog.objects.get_or_create(
                host=host,
                organization_id=host.organization_id,
                action="generate",
                created_at=now - timedelta(hours=index),
                defaults={"id": uuid.uuid4(), "question_count": 2, "model": generation.model, "status": "success"},
            )

        for slug, org in organizations.items():
            admin = User.objects.filter(organization=org, role="admin").first()
            plan = Plan.objects.get(code=org.plan)
            subscription = OrganizationSubscription.objects.filter(organization_id=org.id).first()
            if subscription is None:
                subscription = OrganizationSubscription(id=uuid.uuid4(), organization=org, created_at=now)
            subscription.plan = plan
            subscription.status = "active"
            subscription.starts_at = now - timedelta(days=30)
            subscription.ends_at = None
            subscription.updated_at = now
            subscription.save()
            domain_value = f"{slug}.biiquiz.com"
            domain = TenantDomain.objects.filter(domain=domain_value).first() or TenantDomain(id=uuid.uuid4(), domain=domain_value, created_at=now)
            domain.organization = org
            domain.is_primary = True
            domain.is_system_domain = True
            domain.dns_status = "verified"
            domain.ssl_status = "verified"
            domain.website_status = "active"
            domain.last_checked_at = now
            domain.updated_at = now
            domain.save()

            upgrade = UpgradeRequest.objects.filter(organization_id=org.id, request_note="Sample plan upgrade request").first() or UpgradeRequest(id=uuid.uuid4(), organization=org, request_note="Sample plan upgrade request", created_at=now)
            upgrade.requested_plan = Plan.objects.get(code="enterprise")
            upgrade.requested_by = admin
            upgrade.status = "pending"
            upgrade.admin_note = None
            upgrade.reviewed_by = None
            upgrade.reviewed_at = None
            upgrade.updated_at = now
            upgrade.save()

            transaction_id = f"SAMPLE-{slug.upper()}"
            payment = ManualPayment.objects.filter(transaction_id=transaction_id).first() or ManualPayment(id=uuid.uuid4(), transaction_id=transaction_id, created_at=now)
            payment.organization = org
            payment.upgrade_request = upgrade
            payment.payer_name = org.name
            payment.amount_cents = plan.price_cents
            payment.currency = plan.currency
            payment.note = "Sample payment for development testing."
            payment.status = "pending"
            payment.updated_at = now
            payment.save()

            ticket_number = f"SAMPLE-{slug.upper()}"
            ticket = SupportTicket.objects.filter(ticket_number=ticket_number).first() or SupportTicket(id=uuid.uuid4(), ticket_number=ticket_number, created_at=now)
            ticket.organization = org
            ticket.opened_by = admin
            ticket.subject = "Sample organization support request"
            ticket.description = "Development-only ticket for validating the Super Admin support workflow."
            ticket.priority = "medium"
            ticket.status = "open"
            ticket.updated_at = now
            ticket.save()
            HostPass.objects.update_or_create(
                pass_code_hash=hash_token(f"{slug}-PASS-2026"),
                defaults={
                    "plan_name": org.plan.title(),
                    "participant_limit": 500 if org.plan in {"school", "enterprise"} else 250,
                    "valid_until": now + timedelta(days=180),
                    "is_active": True,
                    "assigned_organization": org,
                    "created_by_admin": admin,
                    "created_at": now,
                    "updated_at": now,
                },
            )
            OrganizationDailyStat.objects.update_or_create(
                organization=org,
                stat_date=now.date(),
                defaults={
                    "rooms_count": Room.objects.filter(organization=org).count(),
                    "participants_count": Participant.objects.filter(room__organization=org).count(),
                    "answers_count": Answer.objects.filter(room__organization=org).count(),
                    "average_accuracy_percent": 75,
                    "ai_generations_count": AiGeneration.objects.filter(host__organization=org).count(),
                    "created_at": now,
                    "updated_at": now,
                },
            )
            AuditLog.objects.get_or_create(
                organization=org,
                action="seeded_demo_data",
                entity_type="organization",
                entity_id=org.id,
                defaults={"id": uuid.uuid4(), "actor": admin, "metadata_json": {"source": "seed_test_users"}, "created_at": now},
            )
