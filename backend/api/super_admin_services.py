from __future__ import annotations

import csv
import io
import json
import uuid
from typing import Any

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.http import HttpResponse

from api.models import (
    AiPlatformSetting,
    AiUsageLog,
    Answer,
    AuditLog,
    ManualPayment,
    Organization,
    OrganizationSubscription,
    Participant,
    Plan,
    PlatformSetting,
    Quiz,
    Room,
    SupportTicket,
    SupportTicketMessage,
    TenantDomain,
    UpgradeRequest,
    User,
)
from api.validation import ValidationError, as_bool, as_int, as_str, validate_email


SECTIONS = {
    "dashboard", "enterprises", "hosts", "students", "quizzes", "rooms",
    "analytics", "plans", "upgrade-requests", "payments", "domains",
    "ai-settings", "support", "audit-logs", "settings",
}


def payload(section: str, query: Any | None = None) -> dict[str, Any]:
    if section not in SECTIONS:
        raise ValidationError("Unknown Super Admin section.")
    params = QueryParams(query)
    handlers = {
        "dashboard": dashboard,
        "enterprises": enterprises,
        "hosts": hosts,
        "students": students,
        "quizzes": quizzes,
        "rooms": rooms,
        "analytics": analytics,
        "plans": plans,
        "upgrade-requests": upgrade_requests,
        "payments": payments,
        "domains": domains,
        "ai-settings": ai_settings,
        "support": support,
        "audit-logs": audit_logs,
        "settings": platform_settings,
    }
    return handlers[section](params)


def export_csv(section: str, query: Any | None = None) -> HttpResponse:
    data = payload(section, query)
    rows = data.get("rows") or data.get("enterpriseComparison") or data.get("topEnterprises") or []
    output = io.StringIO()
    if rows:
        columns = list(rows[0].keys())
        writer = csv.DictWriter(output, fieldnames=columns)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: json.dumps(value, default=str) if isinstance(value, (dict, list)) else value for key, value in row.items()})
    response = HttpResponse(output.getvalue(), content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="biiquiz-{section}.csv"'
    return response


class QueryParams:
    def __init__(self, query: Any | None):
        self.query = query or {}
        self.search = str(self.query.get("search", "")).strip()
        self.status = str(self.query.get("status", "")).strip().lower().replace(" ", "_")
        self.plan = str(self.query.get("plan", "")).strip().lower()
        self.include_samples = str(self.query.get("includeSamples", "false")).lower() in {"1", "true", "yes", "on"}
        self.page = _bounded_int(self.query.get("page"), 1, 100000, 1)
        self.page_size = _bounded_int(self.query.get("pageSize"), 1, 100, 20)


def _bounded_int(value: Any, minimum: int, maximum: int, default: int) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, number))


def _orgs(params: QueryParams):
    qs = Organization.objects.exclude(slug="platform")
    if not params.include_samples:
        qs = qs.filter(is_sample=False)
    if params.search:
        qs = qs.filter(Q(name__icontains=params.search) | Q(slug__icontains=params.search) | Q(primary_contact_email__icontains=params.search))
    if params.status and params.status != "all_statuses":
        qs = qs.filter(status=params.status)
    if params.plan and params.plan != "all_plans":
        qs = qs.filter(subscription__plan__code=params.plan)
    return qs


def _page(qs, params: QueryParams, row_builder) -> dict[str, Any]:
    total = qs.count()
    pages = max(1, (total + params.page_size - 1) // params.page_size)
    page = min(params.page, pages)
    start = (page - 1) * params.page_size
    objects = list(qs[start:start + params.page_size])
    return {
        "rows": [row_builder(item) for item in objects],
        "pagination": {"page": page, "pageSize": params.page_size, "total": total, "totalPages": pages},
        "filters": {"search": params.search, "status": params.status, "plan": params.plan, "includeSamples": params.include_samples},
    }


def dashboard(params: QueryParams) -> dict[str, Any]:
    orgs = _orgs(params)
    pending_upgrades = UpgradeRequest.objects.filter(organization__in=orgs, status="pending").select_related("organization", "requested_plan").order_by("-created_at")
    pending_payments = ManualPayment.objects.filter(organization__in=orgs, status="pending").select_related("organization").order_by("-created_at")
    return {
        "stats": [
            {"label": "Total enterprises", "value": orgs.count()},
            {"label": "Active enterprises", "value": orgs.filter(status="active").count()},
            {"label": "Pending approvals", "value": pending_upgrades.count()},
            {"label": "Pending payments", "value": pending_payments.count()},
        ],
        "pendingApprovals": [_upgrade_row(item) for item in pending_upgrades[:6]],
        "pendingPayments": [_payment_row(item) for item in pending_payments[:6]],
        "usageAlerts": _usage_alerts(orgs),
        "recentActivity": _audit_rows(AuditLog.objects.select_related("actor", "organization").filter(Q(organization__in=orgs) | Q(organization__isnull=True)).order_by("-created_at")[:8]),
        "topEnterprises": [_enterprise_row(org) for org in orgs.select_related("subscription__plan").order_by("-created_at")[:6]],
    }


def enterprises(params: QueryParams) -> dict[str, Any]:
    qs = _orgs(params).select_related("subscription__plan").order_by("-created_at")
    result = _page(qs, params, _enterprise_row)
    base = _orgs(QueryParams({"includeSamples": params.include_samples}))
    result["stats"] = [
        {"label": "Total enterprises", "value": base.count()},
        {"label": "Active", "value": base.filter(status="active").count()},
        {"label": "Pending", "value": base.filter(status="pending").count()},
        {"label": "Suspended", "value": base.filter(status="suspended").count()},
    ]
    result["plans"] = list(Plan.objects.filter(is_active=True).order_by("price_cents").values_list("code", flat=True))
    return result


def hosts(params: QueryParams) -> dict[str, Any]:
    qs = User.objects.filter(role="host").select_related("organization").order_by("-created_at")
    if not params.include_samples:
        qs = qs.filter(Q(organization__isnull=True) | Q(organization__is_sample=False))
    if params.search:
        qs = qs.filter(Q(name__icontains=params.search) | Q(email__icontains=params.search) | Q(organization__name__icontains=params.search))
    if params.status in {"active", "suspended"}:
        qs = qs.filter(is_active=params.status == "active")
    result = _page(qs, params, _user_row)
    result["stats"] = [{"label": "Total hosts", "value": qs.count()}, {"label": "Active", "value": qs.filter(is_active=True).count()}, {"label": "Inactive", "value": qs.filter(is_active=False).count()}]
    return result


def students(params: QueryParams) -> dict[str, Any]:
    qs = Participant.objects.select_related("room__organization").order_by("-joined_at")
    if not params.include_samples:
        qs = qs.filter(Q(room__organization__isnull=True) | Q(room__organization__is_sample=False))
    if params.search:
        qs = qs.filter(Q(display_name__icontains=params.search) | Q(room__room_name__icontains=params.search) | Q(room__organization__name__icontains=params.search))
    result = _page(qs, params, _student_row)
    result["stats"] = [{"label": "Participants", "value": qs.count()}, {"label": "Submitted answers", "value": qs.filter(attempted_count__gt=0).count()}]
    return result


def quizzes(params: QueryParams) -> dict[str, Any]:
    qs = Quiz.objects.select_related("host", "organization").annotate(questions_count=Count("questions", distinct=True), rooms_count=Count("rooms", distinct=True)).order_by("-updated_at")
    if not params.include_samples:
        qs = qs.filter(Q(organization__isnull=True) | Q(organization__is_sample=False))
    if params.search:
        qs = qs.filter(Q(title__icontains=params.search) | Q(host__name__icontains=params.search) | Q(organization__name__icontains=params.search))
    if params.status and params.status != "all_statuses":
        qs = qs.filter(status=params.status)
    result = _page(qs, params, _quiz_row)
    result["stats"] = [{"label": "Quizzes", "value": qs.count()}, {"label": "Published", "value": qs.filter(status="published").count()}, {"label": "Draft", "value": qs.filter(status="draft").count()}]
    return result


def rooms(params: QueryParams) -> dict[str, Any]:
    qs = Room.objects.select_related("quiz", "host", "organization").annotate(participant_count=Count("participants", distinct=True)).order_by("-created_at")
    if not params.include_samples:
        qs = qs.filter(Q(organization__isnull=True) | Q(organization__is_sample=False))
    if params.search:
        qs = qs.filter(Q(room_name__icontains=params.search) | Q(room_code__icontains=params.search) | Q(quiz__title__icontains=params.search) | Q(organization__name__icontains=params.search))
    if params.status and params.status != "all_statuses":
        qs = qs.filter(status=params.status)
    result = _page(qs, params, _room_row)
    result["stats"] = [{"label": "Rooms", "value": qs.count()}, {"label": "Live", "value": qs.filter(status="active").count()}, {"label": "Ended", "value": qs.filter(status="ended").count()}]
    return result


def analytics(params: QueryParams) -> dict[str, Any]:
    orgs = _orgs(params)
    room_qs = Room.objects.filter(Q(organization__in=orgs) | Q(organization__isnull=True))
    participant_qs = Participant.objects.filter(room__in=room_qs)
    revenue = ManualPayment.objects.filter(organization__in=orgs, status="verified").aggregate(total=Sum("amount_cents"))["total"] or 0
    return {
        "stats": [
            {"label": "Platform growth", "value": orgs.count(), "detail": "Enterprises"},
            {"label": "Engagement", "value": participant_qs.count(), "detail": "Participants joined"},
            {"label": "Answers", "value": Answer.objects.filter(room__in=room_qs).count(), "detail": "Submitted answers"},
            {"label": "Verified revenue", "value": _money(revenue, "USD"), "detail": "Manual payments"},
        ],
        "enterpriseComparison": [_enterprise_row(org) for org in orgs.select_related("subscription__plan").order_by("-created_at")[:10]],
        "hostActivity": [_user_row(user) for user in User.objects.filter(role="host").filter(Q(organization__in=orgs) | Q(organization__isnull=True)).select_related("organization").order_by("-last_login_at")[:10]],
        "planUsage": list(orgs.values(label=Q()).values()),
    } | {"planUsage": [{"label": row["subscription__plan__code"] or "unassigned", "value": row["total"]} for row in orgs.values("subscription__plan__code").annotate(total=Count("id")).order_by("subscription__plan__code")]}


def plans(params: QueryParams) -> dict[str, Any]:
    qs = Plan.objects.order_by("price_cents", "name")
    if params.status == "active":
        qs = qs.filter(is_active=True)
    if params.search:
        qs = qs.filter(Q(name__icontains=params.search) | Q(code__icontains=params.search))
    result = _page(qs, params, _plan_row)
    result["stats"] = [{"label": "Plans", "value": qs.count()}, {"label": "Active", "value": qs.filter(is_active=True).count()}, {"label": "Subscriptions", "value": OrganizationSubscription.objects.filter(status="active").count()}]
    return result


def upgrade_requests(params: QueryParams) -> dict[str, Any]:
    qs = UpgradeRequest.objects.select_related("organization", "requested_plan", "requested_by", "reviewed_by").order_by("-created_at")
    qs = _sample_linked(qs, params, "organization")
    if params.search:
        qs = qs.filter(Q(organization__name__icontains=params.search) | Q(requested_plan__name__icontains=params.search))
    if params.status and params.status != "all_statuses":
        qs = qs.filter(status=params.status)
    result = _page(qs, params, _upgrade_row)
    result["stats"] = [{"label": "Pending", "value": qs.filter(status="pending").count()}, {"label": "Approved", "value": qs.filter(status="approved").count()}, {"label": "Total requests", "value": qs.count()}]
    return result


def payments(params: QueryParams, organization: Organization | None = None) -> dict[str, Any]:
    qs = ManualPayment.objects.select_related("organization", "upgrade_request", "reviewed_by").order_by("-created_at")
    if organization:
        qs = qs.filter(organization=organization)
    else:
        qs = _sample_linked(qs, params, "organization")
    if params.search:
        qs = qs.filter(Q(organization__name__icontains=params.search) | Q(payer_name__icontains=params.search) | Q(transaction_id__icontains=params.search))
    if params.status and params.status != "all_statuses":
        qs = qs.filter(status=params.status)
    result = _page(qs, params, _payment_row)
    result["stats"] = [{"label": "Pending payments", "value": qs.filter(status="pending").count()}, {"label": "Verified", "value": qs.filter(status="verified").count()}, {"label": "Verified value", "value": _money(qs.filter(status="verified").aggregate(total=Sum("amount_cents"))["total"] or 0, "USD")}]
    return result


def domains(params: QueryParams, organization: Organization | None = None) -> dict[str, Any]:
    qs = TenantDomain.objects.select_related("organization").order_by("domain")
    if organization:
        qs = qs.filter(organization=organization)
    else:
        qs = _sample_linked(qs, params, "organization")
    if params.search:
        qs = qs.filter(Q(domain__icontains=params.search) | Q(organization__name__icontains=params.search))
    result = _page(qs, params, _domain_row)
    result["stats"] = [{"label": "Domains", "value": qs.count()}, {"label": "DNS verified", "value": qs.filter(dns_status="verified").count()}, {"label": "SSL verified", "value": qs.filter(ssl_status="verified").count()}]
    if organization is None:
        result["organizations"] = [{"id": str(org.id), "name": org.name} for org in _orgs(params).order_by("name")]
    return result


def ai_settings(params: QueryParams) -> dict[str, Any]:
    config = AiPlatformSetting.objects.get(id="global")
    return {
        "model": config.primary_model,
        "fallbackModel": config.fallback_model,
        "enabled": config.enabled,
        "quota": [{"plan": plan.code, "aiAccess": plan.ai_access_mode, "monthlyQuestions": plan.ai_monthly_question_limit} for plan in Plan.objects.filter(is_active=True).order_by("price_cents")],
        "usage": [{"label": row["model"] or "Unknown", "value": row["total"]} for row in AiUsageLog.objects.values("model").annotate(total=Count("id")).order_by("-total")[:8]],
    }


def support(params: QueryParams, organization: Organization | None = None) -> dict[str, Any]:
    qs = SupportTicket.objects.select_related("organization", "opened_by", "assigned_to").order_by("-updated_at")
    if organization:
        qs = qs.filter(organization=organization)
    else:
        qs = _sample_linked(qs, params, "organization")
    if params.search:
        qs = qs.filter(Q(ticket_number__icontains=params.search) | Q(subject__icontains=params.search) | Q(organization__name__icontains=params.search))
    if params.status and params.status != "all_statuses":
        qs = qs.filter(status=params.status)
    result = _page(qs, params, _ticket_row)
    result["stats"] = [{"label": "Open tickets", "value": qs.exclude(status__in=["resolved", "closed"]).count()}, {"label": "Urgent", "value": qs.filter(priority="urgent").count()}, {"label": "Total", "value": qs.count()}]
    if organization is None:
        result["organizations"] = [{"id": str(org.id), "name": org.name} for org in _orgs(params).order_by("name")]
    return result


def audit_logs(params: QueryParams) -> dict[str, Any]:
    qs = AuditLog.objects.select_related("actor", "organization").order_by("-created_at")
    if not params.include_samples:
        qs = qs.filter(Q(organization__isnull=True) | Q(organization__is_sample=False))
    if params.search:
        qs = qs.filter(Q(action__icontains=params.search) | Q(entity_type__icontains=params.search) | Q(actor__name__icontains=params.search) | Q(organization__name__icontains=params.search))
    result = _page(qs, params, lambda item: _audit_rows([item])[0])
    result["stats"] = [{"label": "Audit events", "value": qs.count()}]
    return result


def platform_settings(params: QueryParams) -> dict[str, Any]:
    config = PlatformSetting.objects.get(id="global")
    return {
        "settings": {"branding": config.branding, "defaultPlan": config.default_plan_code, "defaultLimit": config.default_participant_limit, "paymentQrImage": config.payment_qr_image_path, "maintenanceMode": config.maintenance_mode, "registrationEnabled": config.registration_enabled},
        "stats": [{"label": "Maintenance", "value": "On" if config.maintenance_mode else "Off"}, {"label": "Registration", "value": "Enabled" if config.registration_enabled else "Disabled"}],
    }


def enterprise_detail(enterprise_id: str, query: Any | None = None) -> dict[str, Any]:
    org = Organization.objects.select_related("subscription__plan").get(id=enterprise_id)
    params = QueryParams(query)
    active_tab = str((query or {}).get("tab", "overview")).lower()
    allowed_tabs = {"overview", "people", "students", "quizzes", "rooms", "analytics", "plan", "payments", "domains", "support", "audit", "settings"}
    if active_tab not in allowed_tabs:
        active_tab = "overview"
    result = {
        "enterprise": _enterprise_row(org),
        "tabs": ["Overview", "Admins & Hosts", "Students", "Quizzes", "Live Rooms", "Analytics", "Plan & Limits", "Payments", "Domains & Website", "Support", "Audit Logs", "Settings"],
        "activeTab": active_tab,
    }
    if active_tab == "overview":
        result["overview"] = {"stats": [{"label": "Hosts", "value": User.objects.filter(organization=org, role="host").count()}, {"label": "Participants", "value": Participant.objects.filter(room__organization=org).count()}, {"label": "Quizzes", "value": Quiz.objects.filter(organization=org).count()}, {"label": "Rooms", "value": Room.objects.filter(organization=org).count()}]}
    elif active_tab == "people":
        result["adminsHosts"] = [_user_row(user) for user in User.objects.filter(organization=org).select_related("organization").order_by("role", "name")]
    elif active_tab == "students":
        result["students"] = [_student_row(item) for item in Participant.objects.filter(room__organization=org).select_related("room__organization").order_by("-joined_at")[:100]]
    elif active_tab == "quizzes":
        result["quizzes"] = [_quiz_row(item) for item in Quiz.objects.filter(organization=org).select_related("host", "organization").annotate(questions_count=Count("questions", distinct=True), rooms_count=Count("rooms", distinct=True)).order_by("-updated_at")[:100]]
    elif active_tab == "rooms":
        result["rooms"] = [_room_row(item) for item in Room.objects.filter(organization=org).select_related("quiz", "host", "organization").annotate(participant_count=Count("participants", distinct=True)).order_by("-created_at")[:100]]
    elif active_tab == "analytics":
        result["analytics"] = {"answers": Answer.objects.filter(room__organization=org).count(), "aiUsage": AiUsageLog.objects.filter(organization=org).aggregate(total=Sum("question_count"))["total"] or 0}
    elif active_tab == "plan":
        result["subscription"] = _subscription_row(getattr(org, "subscription", None))
    elif active_tab == "payments":
        result["payments"] = payments(params, org)
    elif active_tab == "domains":
        result["domains"] = domains(params, org)
    elif active_tab == "support":
        result["support"] = support(params, org)
    elif active_tab == "audit":
        result["auditLogs"] = _audit_rows(AuditLog.objects.filter(organization=org).select_related("actor", "organization").order_by("-created_at")[:100])
    elif active_tab == "settings":
        result["settings"] = {"primaryContactName": org.primary_contact_name, "primaryContactEmail": org.primary_contact_email}
    return result


@transaction.atomic
def update_section(admin: User, section: str, data: dict[str, Any]) -> dict[str, Any]:
    now = timezone.now()
    if section == "settings":
        config = PlatformSetting.objects.select_for_update().get(id="global")
        before = _setting_row(config)
        config.branding = as_str(data, "branding", min_len=2, max_len=255)
        config.default_plan_code = as_str(data, "defaultPlan", min_len=2, max_len=64)
        if not Plan.objects.filter(code=config.default_plan_code, is_active=True).exists():
            raise ValidationError("defaultPlan must reference an active plan.")
        config.default_participant_limit = as_int(data, "defaultLimit", minimum=1, maximum=100000)
        config.payment_qr_image_path = as_str(data, "paymentQrImage", min_len=1, max_len=2000)
        config.maintenance_mode = as_bool(data, "maintenanceMode")
        config.registration_enabled = as_bool(data, "registrationEnabled", True)
        config.updated_at = now
        config.save()
        _audit(admin, "update", "platform_settings", None, {"oldValue": before, "newValue": _setting_row(config)})
        return platform_settings(QueryParams({}))
    if section == "ai-settings":
        config = AiPlatformSetting.objects.select_for_update().get(id="global")
        before = {"model": config.primary_model, "fallbackModel": config.fallback_model, "enabled": config.enabled}
        config.primary_model = as_str(data, "model", min_len=2, max_len=255)
        config.fallback_model = as_str(data, "fallbackModel", min_len=2, max_len=255)
        config.enabled = as_bool(data, "enabled", True)
        config.updated_at = now
        config.save()
        for plan in Plan.objects.all():
            access_key = f"{plan.code}AiAccess"
            quota_key = f"{plan.code}MonthlyQuestions"
            if access_key in data:
                mode = str(data[access_key]).lower()
                if mode not in {"disabled", "byok", "managed"}:
                    raise ValidationError(f"{access_key} is invalid.")
                plan.ai_access_mode = mode
            if quota_key in data:
                plan.ai_monthly_question_limit = as_int(data, quota_key, minimum=0, maximum=10000000)
            plan.updated_at = now
            plan.save(update_fields=["ai_access_mode", "ai_monthly_question_limit", "updated_at"])
        _audit(admin, "update", "ai_settings", None, {"oldValue": before, "newValue": data})
        return ai_settings(QueryParams({}))
    if section == "enterprises":
        return {"enterprise": create_enterprise(admin, data)}
    if section == "plans":
        return {"plan": create_or_update_plan(admin, data)}
    if section == "domains":
        return {"domain": create_domain(admin, data)}
    if section == "support":
        return {"ticket": create_ticket(admin, data)}
    raise ValidationError("This section does not support direct updates.")


@transaction.atomic
def action(admin: User, section: str, item_id: str, action_name: str, data: dict[str, Any] | None = None) -> dict[str, Any]:
    data = data or {}
    now = timezone.now()
    if section == "enterprises" and action_name in {"suspend", "reactivate"}:
        org = Organization.objects.select_for_update().get(id=item_id)
        old = org.status
        org.status = "suspended" if action_name == "suspend" else "active"
        org.suspension_reason = str(data.get("reason", "")).strip() or None if action_name == "suspend" else None
        org.suspended_at = now if action_name == "suspend" else None
        org.updated_at = now
        org.save(update_fields=["status", "suspension_reason", "suspended_at", "updated_at"])
        _audit(admin, action_name, "organization", org.id, {"oldValue": old, "newValue": org.status, "reason": org.suspension_reason}, org)
        return {"enterprise": _enterprise_row(org)}
    if section == "upgrade-requests" and action_name in {"approve", "reject", "contact"}:
        request = UpgradeRequest.objects.select_for_update().select_related("organization", "requested_plan").get(id=item_id)
        request.status = {"approve": "approved", "reject": "rejected", "contact": "contacted"}[action_name]
        request.admin_note = str(data.get("note", "")).strip() or request.admin_note
        request.reviewed_by = admin
        request.reviewed_at = now
        request.updated_at = now
        request.save()
        if action_name == "approve" and not request.payments.exists():
            _activate_subscription(request.organization, request.requested_plan, now)
        _audit(admin, action_name, "upgrade_request", request.id, {"status": request.status}, request.organization)
        return {"request": _upgrade_row(request)}
    if section == "payments" and action_name in {"verify", "reject", "contact"}:
        payment = ManualPayment.objects.select_for_update().select_related("organization", "upgrade_request__requested_plan").get(id=item_id)
        if action_name == "verify" and payment.status == "verified":
            return {"payment": _payment_row(payment)}
        payment.status = {"verify": "verified", "reject": "rejected", "contact": "more_info_required"}[action_name]
        payment.admin_note = str(data.get("note", "")).strip() or payment.admin_note
        payment.reviewed_by = admin
        payment.reviewed_at = now
        payment.updated_at = now
        payment.save()
        if action_name == "verify" and payment.upgrade_request:
            request = payment.upgrade_request
            request.status = "approved"
            request.reviewed_by = admin
            request.reviewed_at = now
            request.updated_at = now
            request.save()
            _activate_subscription(payment.organization, request.requested_plan, now)
        _audit(admin, action_name, "manual_payment", payment.id, {"status": payment.status}, payment.organization)
        return {"payment": _payment_row(payment)}
    if section == "domains" and action_name in {"verify", "fail", "disable"}:
        domain = TenantDomain.objects.select_for_update().select_related("organization").get(id=item_id)
        if action_name == "verify":
            domain.dns_status = domain.ssl_status = "verified"
            domain.website_status = "active"
        elif action_name == "fail":
            domain.dns_status = domain.ssl_status = "failed"
            domain.website_status = "failed"
        else:
            domain.website_status = "disabled"
        domain.last_checked_at = now
        domain.updated_at = now
        domain.save()
        _audit(admin, action_name, "tenant_domain", domain.id, {"domain": domain.domain}, domain.organization)
        return {"domain": _domain_row(domain)}
    if section == "support" and action_name in {"open", "in-progress", "waiting-customer", "resolve", "close", "reply"}:
        ticket = SupportTicket.objects.select_for_update().select_related("organization").get(id=item_id)
        if action_name == "reply":
            message = as_str(data, "message", min_len=1, max_len=10000)
            SupportTicketMessage.objects.create(id=uuid.uuid4(), ticket=ticket, author=admin, message=message, is_internal=as_bool(data, "isInternal"), created_at=now)
        else:
            ticket.status = {"open": "open", "in-progress": "in_progress", "waiting-customer": "waiting_customer", "resolve": "resolved", "close": "closed"}[action_name]
            ticket.resolved_at = now if ticket.status in {"resolved", "closed"} else None
        if "priority" in data:
            priority = str(data["priority"]).lower()
            if priority not in {"low", "medium", "high", "urgent"}:
                raise ValidationError("Invalid support priority.")
            ticket.priority = priority
        ticket.updated_at = now
        ticket.save()
        _audit(admin, action_name, "support_ticket", ticket.id, {"status": ticket.status}, ticket.organization)
        return {"ticket": _ticket_row(ticket)}
    if section == "plans" and action_name in {"archive", "activate"}:
        plan = Plan.objects.select_for_update().get(id=item_id)
        plan.is_active = action_name == "activate"
        plan.updated_at = now
        plan.save(update_fields=["is_active", "updated_at"])
        _audit(admin, action_name, "plan", plan.id, {"active": plan.is_active})
        return {"plan": _plan_row(plan)}
    raise ValidationError("Unsupported Super Admin action.")


@transaction.atomic
def create_enterprise(admin: User, data: dict[str, Any]) -> dict[str, Any]:
    now = timezone.now()
    slug = as_str(data, "slug", min_len=2, max_len=120).lower()
    if Organization.objects.filter(slug=slug).exists():
        raise ValidationError("An enterprise with this slug already exists.")
    plan = Plan.objects.get(code=as_str(data, "plan", min_len=2, max_len=64), is_active=True)
    email = validate_email(data.get("primaryContactEmail"), "primaryContactEmail") if data.get("primaryContactEmail") else None
    org = Organization.objects.create(id=uuid.uuid4(), name=as_str(data, "name", min_len=2, max_len=255), slug=slug, plan=plan.code, status="active", is_sample=as_bool(data, "isSample"), primary_contact_name=as_str(data, "primaryContactName", max_len=255, required=False), primary_contact_email=email, created_at=now, updated_at=now)
    _activate_subscription(org, plan, now)
    domain = f"{slug}.biiquiz.com"
    TenantDomain.objects.create(id=uuid.uuid4(), organization=org, domain=domain, is_primary=True, is_system_domain=True, dns_status="pending", ssl_status="pending", website_status="provisioning", created_at=now, updated_at=now)
    _audit(admin, "create", "organization", org.id, {"name": org.name, "plan": plan.code}, org)
    return _enterprise_row(Organization.objects.select_related("subscription__plan").get(id=org.id))


def create_or_update_plan(admin: User, data: dict[str, Any]) -> dict[str, Any]:
    now = timezone.now()
    plan_id = data.get("id")
    plan = Plan.objects.get(id=plan_id) if plan_id else Plan(id=uuid.uuid4(), created_at=now)
    plan.code = as_str(data, "code", min_len=2, max_len=64).lower()
    plan.name = as_str(data, "name", min_len=2, max_len=255)
    plan.description = as_str(data, "description", max_len=2000, required=False)
    plan.price_cents = as_int(data, "priceCents", minimum=0, maximum=100000000)
    plan.currency = as_str(data, "currency", min_len=3, max_len=8).upper()
    plan.host_limit = as_int(data, "hostLimit", minimum=1, maximum=1000000)
    plan.student_limit = as_int(data, "studentLimit", minimum=1, maximum=10000000)
    plan.quiz_limit = as_int(data, "quizLimit", minimum=1, maximum=10000000)
    plan.room_limit = as_int(data, "roomLimit", minimum=1, maximum=10000000)
    plan.storage_limit_mb = as_int(data, "storageLimitMb", minimum=1, maximum=100000000)
    plan.ai_access_mode = str(data.get("aiAccessMode", "byok")).lower()
    if plan.ai_access_mode not in {"disabled", "byok", "managed"}:
        raise ValidationError("Invalid AI access mode.")
    plan.ai_monthly_question_limit = as_int(data, "aiMonthlyQuestionLimit", minimum=0, maximum=10000000)
    plan.features_json = data.get("features", []) if isinstance(data.get("features", []), list) else []
    plan.is_active = as_bool(data, "isActive", True)
    plan.updated_at = now
    plan.save()
    _audit(admin, "update" if plan_id else "create", "plan", plan.id, {"code": plan.code})
    return _plan_row(plan)


def create_domain(admin: User, data: dict[str, Any]) -> dict[str, Any]:
    now = timezone.now()
    org = Organization.objects.get(id=data.get("organizationId"))
    value = as_str(data, "domain", min_len=3, max_len=255).lower()
    if TenantDomain.objects.filter(domain=value).exists():
        raise ValidationError("Domain is already registered.")
    domain = TenantDomain.objects.create(id=uuid.uuid4(), organization=org, domain=value, is_primary=as_bool(data, "isPrimary"), is_system_domain=False, dns_status="pending", ssl_status="pending", website_status="provisioning", created_at=now, updated_at=now)
    _audit(admin, "create", "tenant_domain", domain.id, {"domain": value}, org)
    return _domain_row(domain)


def create_ticket(admin: User, data: dict[str, Any]) -> dict[str, Any]:
    now = timezone.now()
    org = Organization.objects.get(id=data.get("organizationId")) if data.get("organizationId") else None
    ticket = SupportTicket.objects.create(id=uuid.uuid4(), organization=org, opened_by=admin, ticket_number=_next_ticket_number(), subject=as_str(data, "subject", min_len=3, max_len=255), description=as_str(data, "description", min_len=3, max_len=10000), priority=str(data.get("priority", "medium")).lower(), status="open", created_at=now, updated_at=now)
    _audit(admin, "create", "support_ticket", ticket.id, {"subject": ticket.subject}, org)
    return _ticket_row(ticket)


def _activate_subscription(org: Organization, plan: Plan, now) -> OrganizationSubscription:
    subscription = OrganizationSubscription.objects.select_for_update().filter(organization_id=org.id).first()
    if subscription is None:
        subscription = OrganizationSubscription(id=uuid.uuid4(), organization=org, created_at=now)
    subscription.plan = plan
    subscription.status = "active"
    subscription.starts_at = now
    subscription.ends_at = None
    subscription.updated_at = now
    subscription.save()
    org.plan = plan.code
    org.updated_at = now
    org.save(update_fields=["plan", "updated_at"])
    return subscription


def _sample_linked(qs, params: QueryParams, field: str):
    return qs if params.include_samples else qs.filter(**{f"{field}__is_sample": False})


def _enterprise_row(org: Organization) -> dict[str, Any]:
    subscription = getattr(org, "subscription", None)
    plan = subscription.plan if subscription else None
    return {"id": str(org.id), "name": org.name, "slug": org.slug, "plan": plan.code if plan else None, "planName": plan.name if plan else None, "status": org.status.replace("_", " ").title(), "isSample": org.is_sample, "primaryContactName": org.primary_contact_name, "primaryContactEmail": org.primary_contact_email, "createdAt": org.created_at.isoformat(), "usage": _enterprise_usage(org, plan)}


def _enterprise_usage(org: Organization, plan: Plan | None = None) -> list[dict[str, Any]]:
    if plan is None:
        subscription = OrganizationSubscription.objects.filter(organization=org).select_related("plan").first()
        plan = subscription.plan if subscription else None
    limits = {"hosts": plan.host_limit if plan else 0, "students": plan.student_limit if plan else 0, "quizzes": plan.quiz_limit if plan else 0, "rooms": plan.room_limit if plan else 0, "AI usage": plan.ai_monthly_question_limit if plan else 0}
    used = {"hosts": User.objects.filter(organization=org, role="host").count(), "students": Participant.objects.filter(room__organization=org).count(), "quizzes": Quiz.objects.filter(organization=org).count(), "rooms": Room.objects.filter(organization=org).count(), "AI usage": AiUsageLog.objects.filter(organization=org).aggregate(total=Sum("question_count"))["total"] or 0}
    return [{"label": label, "used": used[label], "limit": limit, "percent": round((used[label] / limit) * 100) if limit else 0} for label, limit in limits.items()]


def _usage_alerts(orgs) -> list[dict[str, Any]]:
    alerts = []
    for org in orgs.select_related("subscription__plan"):
        for item in _enterprise_usage(org, getattr(getattr(org, "subscription", None), "plan", None)):
            if item["percent"] >= 80:
                alerts.append({"enterprise": org.name, "metric": item["label"], "percent": item["percent"], "status": "Critical" if item["percent"] >= 95 else "Warning"})
    return sorted(alerts, key=lambda item: item["percent"], reverse=True)[:12]


def _user_row(user: User) -> dict[str, Any]:
    return {"id": str(user.id), "name": user.name, "email": user.email, "role": user.role, "enterprise": user.organization.name if user.organization else "Platform", "status": "Active" if user.is_active else "Suspended", "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None, "createdAt": user.created_at.isoformat()}


def _student_row(item: Participant) -> dict[str, Any]:
    return {"id": str(item.id), "name": item.display_name, "enterprise": item.room.organization.name if item.room.organization else "Personal room", "room": item.room.room_name, "score": item.score, "correct": item.correct_count, "attempted": item.attempted_count, "status": "Submitted" if item.attempted_count else "Joined", "joinedAt": item.joined_at.isoformat()}


def _quiz_row(quiz: Quiz) -> dict[str, Any]:
    return {"id": str(quiz.id), "title": quiz.title, "status": quiz.status.title(), "host": quiz.host.name, "enterprise": quiz.organization.name if quiz.organization else "Personal", "questions": getattr(quiz, "questions_count", 0), "rooms": getattr(quiz, "rooms_count", 0), "updatedAt": quiz.updated_at.isoformat()}


def _room_row(room: Room) -> dict[str, Any]:
    winner = Participant.objects.filter(room=room).order_by("-score", "-correct_count", "total_response_time_ms").first()
    return {"id": str(room.id), "name": room.room_name, "roomCode": room.room_code, "quiz": room.quiz.title, "enterprise": room.organization.name if room.organization else "Personal", "participants": getattr(room, "participant_count", Participant.objects.filter(room=room).count()), "winner": winner.display_name if winner and winner.attempted_count else "-", "status": room.status.title(), "createdAt": room.created_at.isoformat()}


def _plan_row(plan: Plan) -> dict[str, Any]:
    return {"id": str(plan.id), "code": plan.code, "name": plan.name, "description": plan.description, "price": _money(plan.price_cents, plan.currency), "priceCents": plan.price_cents, "currency": plan.currency, "hosts": plan.host_limit, "students": plan.student_limit, "quizzes": plan.quiz_limit, "rooms": plan.room_limit, "storageLimitMb": plan.storage_limit_mb, "ai": plan.ai_access_mode, "aiMonthlyQuestionLimit": plan.ai_monthly_question_limit, "features": plan.features_json or [], "status": "Active" if plan.is_active else "Archived"}


def _subscription_row(subscription: OrganizationSubscription | None) -> dict[str, Any] | None:
    if not subscription:
        return None
    return {"id": str(subscription.id), "plan": _plan_row(subscription.plan), "status": subscription.status.title(), "startsAt": subscription.starts_at.isoformat(), "endsAt": subscription.ends_at.isoformat() if subscription.ends_at else None}


def _upgrade_row(item: UpgradeRequest) -> dict[str, Any]:
    return {"id": str(item.id), "enterprise": item.organization.name, "enterpriseId": str(item.organization_id), "requestedPlan": item.requested_plan.name, "requestedPlanCode": item.requested_plan.code, "status": item.status.replace("_", " ").title(), "createdAt": item.created_at.isoformat(), "adminNote": item.admin_note or ""}


def _payment_row(item: ManualPayment) -> dict[str, Any]:
    return {"id": str(item.id), "enterprise": item.organization.name, "enterpriseId": str(item.organization_id), "payerName": item.payer_name, "transactionId": item.transaction_id, "amount": _money(item.amount_cents, item.currency), "amountCents": item.amount_cents, "currency": item.currency, "status": item.status.replace("_", " ").title(), "adminNote": item.admin_note or "", "createdAt": item.created_at.isoformat()}


def _domain_row(item: TenantDomain) -> dict[str, Any]:
    return {"id": str(item.id), "enterprise": item.organization.name, "enterpriseId": str(item.organization_id), "domain": item.domain, "dnsStatus": item.dns_status.title(), "sslStatus": item.ssl_status.title(), "websiteStatus": item.website_status.title(), "isPrimary": item.is_primary, "lastCheckedAt": item.last_checked_at.isoformat() if item.last_checked_at else None}


def _ticket_row(item: SupportTicket) -> dict[str, Any]:
    return {"id": str(item.id), "ticketNumber": item.ticket_number, "subject": item.subject, "description": item.description, "enterprise": item.organization.name if item.organization else "Platform", "enterpriseId": str(item.organization_id) if item.organization_id else None, "priority": item.priority.title(), "status": item.status.replace("_", " ").title(), "assignedTo": item.assigned_to.name if item.assigned_to else None, "createdAt": item.created_at.isoformat(), "updatedAt": item.updated_at.isoformat()}


def _audit_rows(items) -> list[dict[str, Any]]:
    rows = []
    for item in items:
        metadata = item.metadata_json or {}
        rows.append({"id": str(item.id), "actor": item.actor.name if item.actor else "System", "enterprise": item.organization.name if item.organization else "Platform", "action": item.action, "target": item.entity_type, "oldValue": metadata.get("oldValue", "-"), "newValue": metadata.get("newValue", metadata), "timestamp": item.created_at.isoformat()})
    return rows


def _setting_row(config: PlatformSetting) -> dict[str, Any]:
    return {"branding": config.branding, "defaultPlan": config.default_plan_code, "defaultLimit": config.default_participant_limit, "paymentQrImage": config.payment_qr_image_path, "maintenanceMode": config.maintenance_mode, "registrationEnabled": config.registration_enabled}


def _audit(admin: User, action_name: str, entity_type: str, entity_id: Any, metadata: dict[str, Any], organization: Organization | None = None) -> None:
    AuditLog.objects.create(id=uuid.uuid4(), actor=admin, organization=organization, action=action_name, entity_type=entity_type, entity_id=entity_id, metadata_json=metadata, created_at=timezone.now())


def _money(cents: int, currency: str) -> str:
    return f"{currency} {cents / 100:,.2f}"


def _next_ticket_number() -> str:
    return f"TK-{timezone.now():%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"
