CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'pending', 'suspended');
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'pending', 'expired', 'cancelled');
CREATE TYPE "UpgradeRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'contacted', 'cancelled');
CREATE TYPE "ManualPaymentStatus" AS ENUM ('pending', 'verified', 'rejected', 'more_info_required');
CREATE TYPE "DomainVerificationStatus" AS ENUM ('pending', 'verified', 'failed');
CREATE TYPE "WebsiteStatus" AS ENUM ('active', 'disabled', 'provisioning', 'failed');
CREATE TYPE "SupportTicketStatus" AS ENUM ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed');
CREATE TYPE "SupportTicketPriority" AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE "AiAccessMode" AS ENUM ('disabled', 'byok', 'managed');

ALTER TABLE "organizations"
  ADD COLUMN "is_sample" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "primary_contact_email" TEXT,
  ADD COLUMN "primary_contact_name" TEXT,
  ADD COLUMN "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN "suspended_at" TIMESTAMPTZ,
  ADD COLUMN "suspension_reason" TEXT;

CREATE TABLE "plans" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price_cents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "host_limit" INTEGER NOT NULL,
  "student_limit" INTEGER NOT NULL,
  "quiz_limit" INTEGER NOT NULL,
  "room_limit" INTEGER NOT NULL,
  "storage_limit_mb" INTEGER NOT NULL DEFAULT 1024,
  "ai_access_mode" "AiAccessMode" NOT NULL DEFAULT 'byok',
  "ai_monthly_question_limit" INTEGER NOT NULL DEFAULT 0,
  "features_json" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_subscriptions" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
  "starts_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ends_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "upgrade_requests" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "requested_plan_id" UUID NOT NULL,
  "requested_by_user_id" UUID,
  "status" "UpgradeRequestStatus" NOT NULL DEFAULT 'pending',
  "request_note" TEXT,
  "admin_note" TEXT,
  "reviewed_by_user_id" UUID,
  "reviewed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "upgrade_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "manual_payments" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "upgrade_request_id" UUID,
  "payer_name" TEXT NOT NULL,
  "transaction_id" TEXT NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "note" TEXT,
  "proof_image_path" TEXT,
  "status" "ManualPaymentStatus" NOT NULL DEFAULT 'pending',
  "admin_note" TEXT,
  "reviewed_by_user_id" UUID,
  "reviewed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "manual_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_domains" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "domain" TEXT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "is_system_domain" BOOLEAN NOT NULL DEFAULT false,
  "dns_status" "DomainVerificationStatus" NOT NULL DEFAULT 'pending',
  "ssl_status" "DomainVerificationStatus" NOT NULL DEFAULT 'pending',
  "website_status" "WebsiteStatus" NOT NULL DEFAULT 'provisioning',
  "last_checked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_tickets" (
  "id" UUID NOT NULL,
  "organization_id" UUID,
  "opened_by_user_id" UUID,
  "assigned_to_user_id" UUID,
  "ticket_number" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priority" "SupportTicketPriority" NOT NULL DEFAULT 'medium',
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMPTZ,
  CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_ticket_messages" (
  "id" UUID NOT NULL,
  "ticket_id" UUID NOT NULL,
  "author_user_id" UUID,
  "message" TEXT NOT NULL,
  "is_internal" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_settings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "branding" TEXT NOT NULL DEFAULT 'biiQuiz',
  "default_plan_code" TEXT NOT NULL DEFAULT 'free',
  "default_participant_limit" INTEGER NOT NULL DEFAULT 50,
  "payment_qr_image_path" TEXT NOT NULL DEFAULT '/payment.png',
  "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
  "registration_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_platform_settings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "primary_model" TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  "fallback_model" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_platform_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");
CREATE INDEX "plans_is_active_idx" ON "plans"("is_active");
CREATE UNIQUE INDEX "organization_subscriptions_organization_id_key" ON "organization_subscriptions"("organization_id");
CREATE INDEX "organization_subscriptions_plan_id_status_idx" ON "organization_subscriptions"("plan_id", "status");
CREATE INDEX "upgrade_requests_organization_id_status_created_at_idx" ON "upgrade_requests"("organization_id", "status", "created_at");
CREATE UNIQUE INDEX "manual_payments_transaction_id_key" ON "manual_payments"("transaction_id");
CREATE INDEX "manual_payments_organization_id_status_created_at_idx" ON "manual_payments"("organization_id", "status", "created_at");
CREATE UNIQUE INDEX "tenant_domains_domain_key" ON "tenant_domains"("domain");
CREATE INDEX "tenant_domains_organization_id_is_primary_idx" ON "tenant_domains"("organization_id", "is_primary");
CREATE INDEX "tenant_domains_dns_status_ssl_status_idx" ON "tenant_domains"("dns_status", "ssl_status");
CREATE UNIQUE INDEX "support_tickets_ticket_number_key" ON "support_tickets"("ticket_number");
CREATE INDEX "support_tickets_organization_id_status_priority_idx" ON "support_tickets"("organization_id", "status", "priority");
CREATE INDEX "support_tickets_status_updated_at_idx" ON "support_tickets"("status", "updated_at");
CREATE INDEX "support_ticket_messages_ticket_id_created_at_idx" ON "support_ticket_messages"("ticket_id", "created_at");
CREATE INDEX "organizations_status_is_sample_idx" ON "organizations"("status", "is_sample");

ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "upgrade_requests" ADD CONSTRAINT "upgrade_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "upgrade_requests" ADD CONSTRAINT "upgrade_requests_requested_plan_id_fkey" FOREIGN KEY ("requested_plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "upgrade_requests" ADD CONSTRAINT "upgrade_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "upgrade_requests" ADD CONSTRAINT "upgrade_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "manual_payments" ADD CONSTRAINT "manual_payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manual_payments" ADD CONSTRAINT "manual_payments_upgrade_request_id_fkey" FOREIGN KEY ("upgrade_request_id") REFERENCES "upgrade_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "manual_payments" ADD CONSTRAINT "manual_payments_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tenant_domains" ADD CONSTRAINT "tenant_domains_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_opened_by_user_id_fkey" FOREIGN KEY ("opened_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "plans" ("id", "code", "name", "description", "price_cents", "host_limit", "student_limit", "quiz_limit", "room_limit", "storage_limit_mb", "ai_access_mode", "ai_monthly_question_limit", "features_json") VALUES
  ('00000000-0000-4000-8000-000000000001', 'free', 'Free', 'Starter plan with browser-owned AI keys.', 0, 1, 50, 20, 10, 512, 'byok', 0, '["Live rooms","BYOK AI","CSV export"]'),
  ('00000000-0000-4000-8000-000000000002', 'basic', 'Basic', 'Small team plan.', 2900, 5, 150, 100, 50, 2048, 'byok', 0, '["Team quizzes","Analytics","CSV export"]'),
  ('00000000-0000-4000-8000-000000000003', 'pro', 'Pro', 'Training and professional teams.', 5900, 15, 300, 500, 150, 5120, 'managed', 500, '["Team management","Branding","Advanced analytics"]'),
  ('00000000-0000-4000-8000-000000000004', 'school', 'School', 'Schools and institutes.', 9900, 25, 500, 1000, 250, 10240, 'managed', 1000, '["Organization admins","Branding","Analytics"]'),
  ('00000000-0000-4000-8000-000000000005', 'enterprise', 'Enterprise', 'Large organizations with custom infrastructure.', 0, 250, 5000, 10000, 2000, 102400, 'managed', 10000, '["Custom domains","Priority support","Audit logs"]');

INSERT INTO "platform_settings" ("id", "branding", "default_plan_code", "default_participant_limit", "payment_qr_image_path", "maintenance_mode", "registration_enabled")
SELECT 'global', COALESCE("settings_json"->>'branding', 'biiQuiz'), COALESCE("settings_json"->>'defaultPlan', 'free'), COALESCE(("settings_json"->>'defaultLimit')::INTEGER, 50), COALESCE("settings_json"->>'paymentQrImage', '/payment.png'), COALESCE(("settings_json"->>'maintenanceMode')::BOOLEAN, false), COALESCE(("settings_json"->>'registrationEnabled')::BOOLEAN, true)
FROM "organizations" WHERE "slug" = 'platform'
UNION ALL SELECT 'global', 'biiQuiz', 'free', 50, '/payment.png', false, true
WHERE NOT EXISTS (SELECT 1 FROM "organizations" WHERE "slug" = 'platform')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ai_platform_settings" ("id", "primary_model", "fallback_model", "enabled")
SELECT 'global', COALESCE("settings_json"->'aiSettings'->>'model', 'gemini-2.5-flash'), COALESCE("settings_json"->'aiSettings'->>'fallbackModel', 'gemini-2.0-flash'), true
FROM "organizations" WHERE "slug" = 'platform'
UNION ALL SELECT 'global', 'gemini-2.5-flash', 'gemini-2.0-flash', true
WHERE NOT EXISTS (SELECT 1 FROM "organizations" WHERE "slug" = 'platform')
ON CONFLICT ("id") DO NOTHING;

UPDATE "organizations" SET "is_sample" = true
WHERE "slug" IN ('biiquiz-school-demo', 'biiquiz-enterprise-demo', 'biiquiz-training-demo');

INSERT INTO "organization_subscriptions" ("id", "organization_id", "plan_id", "status", "starts_at", "created_at", "updated_at")
SELECT (substr(md5('subscription:' || o."id"::text),1,8)||'-'||substr(md5('subscription:' || o."id"::text),9,4)||'-4'||substr(md5('subscription:' || o."id"::text),14,3)||'-8'||substr(md5('subscription:' || o."id"::text),18,3)||'-'||substr(md5('subscription:' || o."id"::text),21,12))::uuid,
       o."id", p."id", 'active', o."created_at", o."created_at", CURRENT_TIMESTAMP
FROM "organizations" o JOIN "plans" p ON p."code" = o."plan"::text
WHERE o."slug" <> 'platform'
ON CONFLICT ("organization_id") DO NOTHING;

INSERT INTO "tenant_domains" ("id", "organization_id", "domain", "is_primary", "is_system_domain", "dns_status", "ssl_status", "website_status", "created_at", "updated_at")
SELECT (substr(md5('domain:' || o."id"::text),1,8)||'-'||substr(md5('domain:' || o."id"::text),9,4)||'-4'||substr(md5('domain:' || o."id"::text),14,3)||'-8'||substr(md5('domain:' || o."id"::text),18,3)||'-'||substr(md5('domain:' || o."id"::text),21,12))::uuid,
       o."id", COALESCE(NULLIF(o."settings_json"->>'domain',''), o."slug" || '.biiquiz.com'), true, true,
       CASE WHEN o."settings_json"->>'dnsStatus' = 'Verified' THEN 'verified'::"DomainVerificationStatus" ELSE 'pending'::"DomainVerificationStatus" END,
       CASE WHEN o."settings_json"->>'sslStatus' = 'Verified' THEN 'verified'::"DomainVerificationStatus" ELSE 'pending'::"DomainVerificationStatus" END,
       CASE WHEN o."plan"::text = 'free' THEN 'disabled'::"WebsiteStatus" ELSE 'active'::"WebsiteStatus" END,
       o."created_at", CURRENT_TIMESTAMP
FROM "organizations" o WHERE o."slug" <> 'platform'
ON CONFLICT ("domain") DO NOTHING;
