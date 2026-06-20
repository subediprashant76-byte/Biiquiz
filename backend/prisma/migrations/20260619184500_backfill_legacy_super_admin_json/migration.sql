-- One-time compatibility backfill. Runtime Super Admin code no longer reads these JSON keys.
INSERT INTO "upgrade_requests" (
  "id", "organization_id", "requested_plan_id", "status", "admin_note", "created_at", "updated_at"
)
SELECT
  (substr(md5('upgrade:' || o."id"::text),1,8)||'-'||substr(md5('upgrade:' || o."id"::text),9,4)||'-4'||substr(md5('upgrade:' || o."id"::text),14,3)||'-8'||substr(md5('upgrade:' || o."id"::text),18,3)||'-'||substr(md5('upgrade:' || o."id"::text),21,12))::uuid,
  o."id",
  p."id",
  CASE lower(COALESCE(o."settings_json"->>'upgradeStatus', 'pending'))
    WHEN 'approved' THEN 'approved'::"UpgradeRequestStatus"
    WHEN 'rejected' THEN 'rejected'::"UpgradeRequestStatus"
    WHEN 'contacted' THEN 'contacted'::"UpgradeRequestStatus"
    ELSE 'pending'::"UpgradeRequestStatus"
  END,
  NULLIF(o."settings_json"->>'upgradeAdminNote', ''),
  o."updated_at",
  CURRENT_TIMESTAMP
FROM "organizations" o
JOIN "plans" p ON p."code" = lower(o."settings_json"->>'requestedPlan')
WHERE o."slug" <> 'platform'
  AND o."settings_json" ? 'requestedPlan'
  AND NOT EXISTS (SELECT 1 FROM "upgrade_requests" r WHERE r."organization_id" = o."id");

INSERT INTO "manual_payments" (
  "id", "organization_id", "upgrade_request_id", "payer_name", "transaction_id",
  "amount_cents", "currency", "note", "status", "admin_note", "created_at", "updated_at"
)
SELECT
  (substr(md5('payment:' || o."id"::text),1,8)||'-'||substr(md5('payment:' || o."id"::text),9,4)||'-4'||substr(md5('payment:' || o."id"::text),14,3)||'-8'||substr(md5('payment:' || o."id"::text),18,3)||'-'||substr(md5('payment:' || o."id"::text),21,12))::uuid,
  o."id",
  r."id",
  COALESCE(NULLIF(o."settings_json"->'payment'->>'payerName', ''), o."name"),
  o."settings_json"->'payment'->>'transactionId',
  CASE WHEN COALESCE(o."settings_json"->'payment'->>'amount', '') ~ '^\d+(\.\d+)?$'
    THEN round((o."settings_json"->'payment'->>'amount')::numeric * 100)::integer ELSE 0 END,
  COALESCE(NULLIF(o."settings_json"->'payment'->>'currency', ''), 'USD'),
  NULLIF(o."settings_json"->'payment'->>'note', ''),
  CASE lower(COALESCE(o."settings_json"->'payment'->>'status', 'pending'))
    WHEN 'verified' THEN 'verified'::"ManualPaymentStatus"
    WHEN 'rejected' THEN 'rejected'::"ManualPaymentStatus"
    WHEN 'more info requested' THEN 'more_info_required'::"ManualPaymentStatus"
    ELSE 'pending'::"ManualPaymentStatus"
  END,
  NULLIF(o."settings_json"->'payment'->>'adminNote', ''),
  o."updated_at",
  CURRENT_TIMESTAMP
FROM "organizations" o
LEFT JOIN "upgrade_requests" r ON r."organization_id" = o."id"
WHERE o."slug" <> 'platform'
  AND o."settings_json" ? 'payment'
  AND NULLIF(o."settings_json"->'payment'->>'transactionId', '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "manual_payments" m
    WHERE m."transaction_id" = o."settings_json"->'payment'->>'transactionId'
  );

INSERT INTO "support_tickets" (
  "id", "organization_id", "opened_by_user_id", "ticket_number", "subject",
  "description", "priority", "status", "created_at", "updated_at"
)
SELECT
  a."id",
  a."organization_id",
  a."actor_user_id",
  'LEGACY-' || upper(substr(a."id"::text, 1, 8)),
  COALESCE(NULLIF(a."metadata_json"->>'subject', ''), 'Legacy support request'),
  COALESCE(NULLIF(a."metadata_json"->>'description', ''), 'Migrated from the legacy audit-backed support queue.'),
  CASE lower(COALESCE(a."metadata_json"->>'priority', 'medium'))
    WHEN 'low' THEN 'low'::"SupportTicketPriority"
    WHEN 'high' THEN 'high'::"SupportTicketPriority"
    WHEN 'urgent' THEN 'urgent'::"SupportTicketPriority"
    ELSE 'medium'::"SupportTicketPriority"
  END,
  CASE lower(COALESCE(a."metadata_json"->>'status', 'open'))
    WHEN 'closed' THEN 'closed'::"SupportTicketStatus"
    WHEN 'resolved' THEN 'resolved'::"SupportTicketStatus"
    WHEN 'in progress' THEN 'in_progress'::"SupportTicketStatus"
    ELSE 'open'::"SupportTicketStatus"
  END,
  a."created_at",
  a."created_at"
FROM "audit_logs" a
WHERE a."action" ILIKE '%support%'
  AND NOT EXISTS (SELECT 1 FROM "support_tickets" t WHERE t."id" = a."id");
