from __future__ import annotations

from django.conf import settings

REQUIRED_MODELS = {
    "Organization": "organizations",
    "User": "users",
    "PasswordResetOtp": "password_reset_otps",
    "Quiz": "quizzes",
    "Question": "questions",
    "Room": "rooms",
    "Participant": "participants",
    "Answer": "answers",
    "HostPass": "host_passes",
    "AiGeneration": "ai_generations",
    "AiQuestionDraft": "ai_question_drafts",
    "AiUsageLog": "ai_usage_logs",
    "OrganizationInvite": "organization_invites",
    "AuditLog": "audit_logs",
    "RoomQuestionStat": "room_question_stats",
    "ParticipantRoomSummary": "participant_room_summaries",
    "OrganizationDailyStat": "organization_daily_stats",
    "Plan": "plans",
    "OrganizationSubscription": "organization_subscriptions",
    "UpgradeRequest": "upgrade_requests",
    "ManualPayment": "manual_payments",
    "TenantDomain": "tenant_domains",
    "SupportTicket": "support_tickets",
    "SupportTicketMessage": "support_ticket_messages",
    "PlatformSetting": "platform_settings",
    "AiPlatformSetting": "ai_platform_settings",
}

REQUIRED_ENUMS = {
    "UserRole",
    "OrganizationPlan",
    "QuizVisibility",
    "QuizStatus",
    "RoomStatus",
    "CorrectOption",
    "ScoringMode",
    "AiGenerationStatus",
    "AiDraftStatus",
    "AiUsageAction",
    "UsageStatus",
    "OrganizationStatus",
    "SubscriptionStatus",
    "UpgradeRequestStatus",
    "ManualPaymentStatus",
    "DomainVerificationStatus",
    "WebsiteStatus",
    "SupportTicketStatus",
    "SupportTicketPriority",
    "AiAccessMode",
}


def validate_prisma_contract() -> None:
    schema_path = settings.PRISMA_SCHEMA_PATH
    text = schema_path.read_text()
    missing = []
    for model, table in REQUIRED_MODELS.items():
        if f"model {model} " not in text or f'@@map("{table}")' not in text:
            missing.append(f"{model}->{table}")
    for enum in REQUIRED_ENUMS:
        if f"enum {enum} " not in text:
            missing.append(f"enum {enum}")
    if missing:
        raise RuntimeError(f"Prisma schema contract mismatch: {', '.join(sorted(missing))}")
