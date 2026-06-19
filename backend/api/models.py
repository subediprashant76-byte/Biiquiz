from __future__ import annotations

import uuid

from django.db import models


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, unique=True)
    plan = models.CharField(max_length=32, default="free")
    branding_json = models.JSONField(null=True, blank=True)
    settings_json = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "organizations"


class User(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    organization = models.ForeignKey(Organization, null=True, blank=True, on_delete=models.SET_NULL, db_column="organization_id")
    name = models.CharField(max_length=255)
    email = models.CharField(max_length=255, unique=True)
    password_hash = models.CharField(max_length=255)
    role = models.CharField(max_length=16, default="host")
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "users"


class Quiz(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    host = models.ForeignKey(User, on_delete=models.CASCADE, db_column="host_id", related_name="quizzes")
    organization = models.ForeignKey(Organization, null=True, blank=True, on_delete=models.SET_NULL, db_column="organization_id")
    title = models.CharField(max_length=255)
    subject = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    default_time_limit = models.IntegerField(default=30)
    default_marks = models.IntegerField(default=1)
    visibility = models.CharField(max_length=32, default="private")
    status = models.CharField(max_length=32, default="draft")
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "quizzes"


class Question(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, db_column="quiz_id", related_name="questions")
    question_text = models.TextField()
    option_a = models.TextField()
    option_b = models.TextField()
    option_c = models.TextField()
    option_d = models.TextField()
    correct_option = models.CharField(max_length=1)
    marks = models.IntegerField()
    time_limit = models.IntegerField()
    explanation = models.TextField(null=True, blank=True)
    order_number = models.IntegerField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "questions"
        unique_together = (("quiz", "order_number"),)


class HostPass(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    pass_code_hash = models.CharField(max_length=255, unique=True)
    plan_name = models.CharField(max_length=255)
    participant_limit = models.IntegerField()
    valid_until = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    assigned_host = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, db_column="assigned_host_id", related_name="assigned_passes")
    assigned_organization = models.ForeignKey(Organization, null=True, blank=True, on_delete=models.SET_NULL, db_column="assigned_organization_id")
    created_by_admin = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, db_column="created_by_admin_id", related_name="created_passes")
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "host_passes"


class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    quiz = models.ForeignKey(Quiz, on_delete=models.RESTRICT, db_column="quiz_id", related_name="rooms")
    host = models.ForeignKey(User, on_delete=models.CASCADE, db_column="host_id", related_name="rooms")
    organization = models.ForeignKey(Organization, null=True, blank=True, on_delete=models.SET_NULL, db_column="organization_id")
    room_code = models.CharField(max_length=32, unique=True)
    room_name = models.CharField(max_length=255)
    status = models.CharField(max_length=32, default="waiting")
    participant_limit = models.IntegerField(default=50)
    free_limit = models.IntegerField(default=50)
    host_pass = models.ForeignKey(HostPass, null=True, blank=True, on_delete=models.SET_NULL, db_column="host_pass_id")
    current_question = models.ForeignKey(Question, null=True, blank=True, on_delete=models.SET_NULL, db_column="current_question_id", related_name="current_in_rooms")
    current_question_order = models.IntegerField(null=True, blank=True)
    current_question_started_at = models.DateTimeField(null=True, blank=True)
    current_question_ends_at = models.DateTimeField(null=True, blank=True)
    show_leaderboard = models.BooleanField(default=True)
    show_correct_answer = models.BooleanField(default=False)
    scoring_mode = models.CharField(max_length=32, default="simple")
    created_at = models.DateTimeField()
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "rooms"


class Participant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, db_column="room_id", related_name="participants")
    display_name = models.CharField(max_length=255)
    join_token_hash = models.CharField(max_length=255)
    score = models.IntegerField(default=0)
    correct_count = models.IntegerField(default=0)
    wrong_count = models.IntegerField(default=0)
    attempted_count = models.IntegerField(default=0)
    total_response_time_ms = models.IntegerField(default=0)
    rank_snapshot = models.IntegerField(null=True, blank=True)
    joined_at = models.DateTimeField()
    last_seen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "participants"
        unique_together = (("room", "join_token_hash"),)


class Answer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, db_column="room_id", related_name="answers")
    participant = models.ForeignKey(Participant, on_delete=models.CASCADE, db_column="participant_id", related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, db_column="question_id", related_name="answers")
    selected_option = models.CharField(max_length=1)
    is_correct = models.BooleanField()
    score_awarded = models.IntegerField(default=0)
    answered_at = models.DateTimeField()
    response_time_ms = models.IntegerField()
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "answers"
        unique_together = (("participant", "question"),)


class AiGeneration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    host = models.ForeignKey(User, on_delete=models.CASCADE, db_column="host_id")
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, db_column="quiz_id")
    input_prompt = models.TextField()
    input_subject = models.CharField(max_length=255)
    input_level = models.CharField(max_length=255)
    input_topic = models.CharField(max_length=255)
    input_difficulty = models.CharField(max_length=255)
    input_language = models.CharField(max_length=255)
    question_count = models.IntegerField()
    marks_per_question = models.IntegerField()
    time_per_question = models.IntegerField()
    raw_json = models.JSONField(null=True, blank=True)
    fixed_json = models.JSONField(null=True, blank=True)
    validation_errors = models.JSONField(null=True, blank=True)
    status = models.CharField(max_length=64)
    attempt_count = models.IntegerField(default=0)
    model = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "ai_generations"


class AiQuestionDraft(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    generation = models.ForeignKey(AiGeneration, on_delete=models.CASCADE, db_column="generation_id", related_name="drafts")
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, db_column="quiz_id")
    question_text = models.TextField()
    option_a = models.TextField()
    option_b = models.TextField()
    option_c = models.TextField()
    option_d = models.TextField()
    correct_option = models.CharField(max_length=1)
    marks = models.IntegerField()
    time_limit = models.IntegerField()
    explanation = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=32, default="draft")
    order_number = models.IntegerField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "ai_question_drafts"


class AiUsageLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    host = models.ForeignKey(User, on_delete=models.CASCADE, db_column="host_id")
    organization = models.ForeignKey(Organization, null=True, blank=True, on_delete=models.SET_NULL, db_column="organization_id")
    action = models.CharField(max_length=32)
    question_count = models.IntegerField(default=0)
    model = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=32)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "ai_usage_logs"


class OrganizationInvite(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_column="organization_id")
    email = models.CharField(max_length=255)
    role = models.CharField(max_length=16, default="host")
    token_hash = models.CharField(max_length=255, unique=True)
    invited_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, db_column="invited_by_user_id")
    accepted_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "organization_invites"


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    actor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, db_column="actor_user_id")
    organization = models.ForeignKey(Organization, null=True, blank=True, on_delete=models.SET_NULL, db_column="organization_id")
    action = models.CharField(max_length=255)
    entity_type = models.CharField(max_length=255)
    entity_id = models.UUIDField(null=True, blank=True)
    metadata_json = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "audit_logs"


class RoomQuestionStat(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, db_column="room_id")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, db_column="question_id")
    attempt_count = models.IntegerField(default=0)
    correct_count = models.IntegerField(default=0)
    wrong_count = models.IntegerField(default=0)
    no_answer_count = models.IntegerField(default=0)
    average_response_time_ms = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "room_question_stats"
        unique_together = (("room", "question"),)


class ParticipantRoomSummary(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, db_column="room_id")
    participant = models.ForeignKey(Participant, on_delete=models.CASCADE, db_column="participant_id")
    score = models.IntegerField()
    rank = models.IntegerField()
    correct_count = models.IntegerField()
    wrong_count = models.IntegerField()
    attempted_count = models.IntegerField()
    accuracy_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_response_time_ms = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "participant_room_summaries"
        unique_together = (("room", "participant"),)


class OrganizationDailyStat(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_column="organization_id")
    stat_date = models.DateField()
    rooms_count = models.IntegerField(default=0)
    participants_count = models.IntegerField(default=0)
    answers_count = models.IntegerField(default=0)
    average_accuracy_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ai_generations_count = models.IntegerField(default=0)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "organization_daily_stats"
        unique_together = (("organization", "stat_date"),)
