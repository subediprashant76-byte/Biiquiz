-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'host');

-- CreateEnum
CREATE TYPE "OrganizationPlan" AS ENUM ('free', 'basic', 'pro', 'school', 'enterprise');

-- CreateEnum
CREATE TYPE "QuizVisibility" AS ENUM ('private', 'organization', 'public');

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('waiting', 'active', 'paused', 'ended');

-- CreateEnum
CREATE TYPE "CorrectOption" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "ScoringMode" AS ENUM ('simple', 'speed_bonus');

-- CreateEnum
CREATE TYPE "AiGenerationStatus" AS ENUM ('generated', 'validation_failed', 'repaired', 'ready_for_preview', 'published', 'failed');

-- CreateEnum
CREATE TYPE "AiDraftStatus" AS ENUM ('draft', 'approved', 'deleted');

-- CreateEnum
CREATE TYPE "AiUsageAction" AS ENUM ('generate', 'repair', 'publish');

-- CreateEnum
CREATE TYPE "UsageStatus" AS ENUM ('success', 'failed');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "OrganizationPlan" NOT NULL DEFAULT 'free',
    "branding_json" JSONB,
    "settings_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'host',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "organization_id" UUID,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "description" TEXT,
    "default_time_limit" INTEGER NOT NULL DEFAULT 30,
    "default_marks" INTEGER NOT NULL DEFAULT 1,
    "visibility" "QuizVisibility" NOT NULL DEFAULT 'private',
    "status" "QuizStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "question_text" TEXT NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "option_c" TEXT NOT NULL,
    "option_d" TEXT NOT NULL,
    "correct_option" "CorrectOption" NOT NULL,
    "marks" INTEGER NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "explanation" TEXT,
    "order_number" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "organization_id" UUID,
    "room_code" TEXT NOT NULL,
    "room_name" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'waiting',
    "participant_limit" INTEGER NOT NULL DEFAULT 50,
    "free_limit" INTEGER NOT NULL DEFAULT 50,
    "host_pass_id" UUID,
    "current_question_id" UUID,
    "current_question_order" INTEGER,
    "current_question_started_at" TIMESTAMPTZ,
    "current_question_ends_at" TIMESTAMPTZ,
    "show_leaderboard" BOOLEAN NOT NULL DEFAULT true,
    "show_correct_answer" BOOLEAN NOT NULL DEFAULT false,
    "scoring_mode" "ScoringMode" NOT NULL DEFAULT 'simple',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "join_token_hash" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,
    "attempted_count" INTEGER NOT NULL DEFAULT 0,
    "total_response_time_ms" INTEGER NOT NULL DEFAULT 0,
    "rank_snapshot" INTEGER,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "participant_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_option" "CorrectOption" NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "score_awarded" INTEGER NOT NULL DEFAULT 0,
    "answered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response_time_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "host_passes" (
    "id" UUID NOT NULL,
    "pass_code_hash" TEXT NOT NULL,
    "plan_name" TEXT NOT NULL,
    "participant_limit" INTEGER NOT NULL,
    "valid_until" TIMESTAMPTZ NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_host_id" UUID,
    "assigned_organization_id" UUID,
    "created_by_admin_id" UUID,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "host_passes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_generations" (
    "id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "input_prompt" TEXT NOT NULL,
    "input_subject" TEXT NOT NULL,
    "input_level" TEXT NOT NULL,
    "input_topic" TEXT NOT NULL,
    "input_difficulty" TEXT NOT NULL,
    "input_language" TEXT NOT NULL,
    "question_count" INTEGER NOT NULL,
    "marks_per_question" INTEGER NOT NULL,
    "time_per_question" INTEGER NOT NULL,
    "raw_json" JSONB,
    "fixed_json" JSONB,
    "validation_errors" JSONB,
    "status" "AiGenerationStatus" NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_question_drafts" (
    "id" UUID NOT NULL,
    "generation_id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "question_text" TEXT NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "option_c" TEXT NOT NULL,
    "option_d" TEXT NOT NULL,
    "correct_option" "CorrectOption" NOT NULL,
    "marks" INTEGER NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "explanation" TEXT,
    "status" "AiDraftStatus" NOT NULL DEFAULT 'draft',
    "order_number" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ai_question_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "organization_id" UUID,
    "action" "AiUsageAction" NOT NULL,
    "question_count" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT,
    "status" "UsageStatus" NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_invites" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'host',
    "token_hash" TEXT NOT NULL,
    "invited_by_user_id" UUID,
    "accepted_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "organization_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_question_stats" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,
    "no_answer_count" INTEGER NOT NULL DEFAULT 0,
    "average_response_time_ms" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "room_question_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant_room_summaries" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "participant_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "correct_count" INTEGER NOT NULL,
    "wrong_count" INTEGER NOT NULL,
    "attempted_count" INTEGER NOT NULL,
    "accuracy_percent" DECIMAL(5,2),
    "total_response_time_ms" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participant_room_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_daily_stats" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "stat_date" DATE NOT NULL,
    "rooms_count" INTEGER NOT NULL DEFAULT 0,
    "participants_count" INTEGER NOT NULL DEFAULT 0,
    "answers_count" INTEGER NOT NULL DEFAULT 0,
    "average_accuracy_percent" DECIMAL(5,2),
    "ai_generations_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "organization_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_plan_idx" ON "organizations"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "users_organization_id_role_idx" ON "users"("organization_id", "role");

-- CreateIndex
CREATE INDEX "quizzes_host_id_created_at_idx" ON "quizzes"("host_id", "created_at");

-- CreateIndex
CREATE INDEX "quizzes_organization_id_created_at_idx" ON "quizzes"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "quizzes_status_idx" ON "quizzes"("status");

-- CreateIndex
CREATE INDEX "questions_quiz_id_idx" ON "questions"("quiz_id");

-- CreateIndex
CREATE INDEX "questions_quiz_id_order_number_idx" ON "questions"("quiz_id", "order_number");

-- CreateIndex
CREATE UNIQUE INDEX "questions_quiz_id_order_number_key" ON "questions"("quiz_id", "order_number");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_room_code_key" ON "rooms"("room_code");

-- CreateIndex
CREATE INDEX "rooms_host_id_created_at_idx" ON "rooms"("host_id", "created_at");

-- CreateIndex
CREATE INDEX "rooms_organization_id_created_at_idx" ON "rooms"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "rooms_status_idx" ON "rooms"("status");

-- CreateIndex
CREATE INDEX "rooms_quiz_id_idx" ON "rooms"("quiz_id");

-- CreateIndex
CREATE INDEX "participants_room_id_score_total_response_time_ms_idx" ON "participants"("room_id", "score", "total_response_time_ms");

-- CreateIndex
CREATE INDEX "participants_room_id_joined_at_idx" ON "participants"("room_id", "joined_at");

-- CreateIndex
CREATE UNIQUE INDEX "participants_room_id_join_token_hash_key" ON "participants"("room_id", "join_token_hash");

-- CreateIndex
CREATE INDEX "answers_room_id_question_id_idx" ON "answers"("room_id", "question_id");

-- CreateIndex
CREATE INDEX "answers_participant_id_idx" ON "answers"("participant_id");

-- CreateIndex
CREATE INDEX "answers_question_id_idx" ON "answers"("question_id");

-- CreateIndex
CREATE INDEX "answers_room_id_score_awarded_idx" ON "answers"("room_id", "score_awarded");

-- CreateIndex
CREATE UNIQUE INDEX "answers_participant_id_question_id_key" ON "answers"("participant_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "host_passes_pass_code_hash_key" ON "host_passes"("pass_code_hash");

-- CreateIndex
CREATE INDEX "host_passes_assigned_host_id_idx" ON "host_passes"("assigned_host_id");

-- CreateIndex
CREATE INDEX "host_passes_assigned_organization_id_idx" ON "host_passes"("assigned_organization_id");

-- CreateIndex
CREATE INDEX "host_passes_valid_until_idx" ON "host_passes"("valid_until");

-- CreateIndex
CREATE INDEX "host_passes_is_active_idx" ON "host_passes"("is_active");

-- CreateIndex
CREATE INDEX "ai_generations_host_id_created_at_idx" ON "ai_generations"("host_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_generations_quiz_id_created_at_idx" ON "ai_generations"("quiz_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_generations_status_idx" ON "ai_generations"("status");

-- CreateIndex
CREATE INDEX "ai_question_drafts_generation_id_order_number_idx" ON "ai_question_drafts"("generation_id", "order_number");

-- CreateIndex
CREATE INDEX "ai_question_drafts_quiz_id_idx" ON "ai_question_drafts"("quiz_id");

-- CreateIndex
CREATE INDEX "ai_question_drafts_status_idx" ON "ai_question_drafts"("status");

-- CreateIndex
CREATE INDEX "ai_usage_logs_host_id_created_at_idx" ON "ai_usage_logs"("host_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_usage_logs_organization_id_created_at_idx" ON "ai_usage_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_usage_logs_action_created_at_idx" ON "ai_usage_logs"("action", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "organization_invites_token_hash_key" ON "organization_invites"("token_hash");

-- CreateIndex
CREATE INDEX "organization_invites_organization_id_created_at_idx" ON "organization_invites"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "organization_invites_email_idx" ON "organization_invites"("email");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_question_stats_room_id_question_id_key" ON "room_question_stats"("room_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "participant_room_summaries_room_id_participant_id_key" ON "participant_room_summaries"("room_id", "participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_daily_stats_organization_id_stat_date_key" ON "organization_daily_stats"("organization_id", "stat_date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_host_pass_id_fkey" FOREIGN KEY ("host_pass_id") REFERENCES "host_passes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_current_question_id_fkey" FOREIGN KEY ("current_question_id") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "host_passes" ADD CONSTRAINT "host_passes_assigned_host_id_fkey" FOREIGN KEY ("assigned_host_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "host_passes" ADD CONSTRAINT "host_passes_assigned_organization_id_fkey" FOREIGN KEY ("assigned_organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "host_passes" ADD CONSTRAINT "host_passes_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_question_drafts" ADD CONSTRAINT "ai_question_drafts_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "ai_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_question_drafts" ADD CONSTRAINT "ai_question_drafts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_question_stats" ADD CONSTRAINT "room_question_stats_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_question_stats" ADD CONSTRAINT "room_question_stats_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_room_summaries" ADD CONSTRAINT "participant_room_summaries_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_room_summaries" ADD CONSTRAINT "participant_room_summaries_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_daily_stats" ADD CONSTRAINT "organization_daily_stats_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
