from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q

from api.models import ManualPayment, Organization, OrganizationSubscription, SupportTicket, TenantDomain, UpgradeRequest
from api.super_admin_services import SECTIONS, enterprise_detail, payload


class Command(BaseCommand):
    help = "Verify normalized Super Admin data and execute every API payload against PostgreSQL."

    def handle(self, *args, **options):
        failures: list[str] = []
        for section in sorted(SECTIONS):
            try:
                result = payload(section, {"includeSamples": "true", "pageSize": "5"})
                if not isinstance(result, dict):
                    failures.append(f"{section}: payload is not an object")
                else:
                    self.stdout.write(f"OK {section}: {len(result.get('rows', []))} rows")
            except Exception as exc:  # command reports all broken modules together
                failures.append(f"{section}: {exc}")

        organizations = Organization.objects.exclude(slug="platform")
        missing_subscriptions = organizations.filter(subscription__isnull=True).count()
        missing_domains = organizations.filter(domains__isnull=True).count()
        if missing_subscriptions:
            failures.append(f"{missing_subscriptions} organizations have no subscription")
        if missing_domains:
            failures.append(f"{missing_domains} organizations have no domain")
        if OrganizationSubscription.objects.filter(Q(organization__isnull=True) | Q(plan__isnull=True)).exists():
            failures.append("orphaned organization subscriptions found")
        if TenantDomain.objects.filter(organization__isnull=True).exists():
            failures.append("orphaned tenant domains found")
        if ManualPayment.objects.filter(organization__isnull=True).exists():
            failures.append("orphaned manual payments found")
        if UpgradeRequest.objects.filter(Q(organization__isnull=True) | Q(requested_plan__isnull=True)).exists():
            failures.append("orphaned upgrade requests found")
        if SupportTicket.objects.filter(organization__isnull=False, organization__slug="platform").exists():
            failures.append("support tickets are attached to the legacy platform pseudo-organization")

        first = organizations.first()
        if first:
            for tab in ["overview", "people", "students", "quizzes", "rooms", "analytics", "plan", "payments", "domains", "support", "audit", "settings"]:
                try:
                    enterprise_detail(str(first.id), {"tab": tab})
                except Exception as exc:
                    failures.append(f"enterprise detail {tab}: {exc}")

        if failures:
            raise CommandError("Super Admin verification failed:\n- " + "\n- ".join(failures))
        self.stdout.write(self.style.SUCCESS("All Super Admin modules and normalized relationships verified."))
