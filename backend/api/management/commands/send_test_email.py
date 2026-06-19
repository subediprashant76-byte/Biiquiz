from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Send a smoke-test email using the configured Django email backend."

    def add_arguments(self, parser):
        parser.add_argument("--to", required=True, help="Recipient email address.")

    def handle(self, *args, **options):
        recipient = options["to"].strip()
        if not recipient:
            raise CommandError("--to is required.")
        sent = send_mail(
            subject="biiQuiz SMTP test",
            message=(
                "This is a test email from biiQuiz.\n\n"
                f"Backend: {settings.EMAIL_BACKEND}\n"
                f"From: {settings.DEFAULT_FROM_EMAIL}\n"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
        if sent != 1:
            raise CommandError("Email backend did not report a sent message.")
        self.stdout.write(self.style.SUCCESS(f"Sent test email to {recipient}."))
