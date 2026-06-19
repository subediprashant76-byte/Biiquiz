# biiQuiz Database Design

Source reference: `resources/host.biiquiz.com\.md`

This document defines a scalable PostgreSQL schema for `host.biiquiz.com`. PostgreSQL is the source of truth. Redis is used only for cache, locks, rate limits, presence, and realtime coordination.

## Database Principles

- Use UUID primary keys.
- Use `timestamptz` for timestamps.
- Use enums for stable status fields.
- Use transactions for join, answer submission, room state transitions, Host Pass redemption, and AI publish.
- Use unique constraints to prevent duplicate answers and duplicate join sessions.
- Add indexes for every frequent lookup.
- Keep raw answer data for audit and analytics.
- Use rollup tables later for heavy analytics.
- Never add negative marking fields.

## Core Enums

```txt
user_role: admin, host
organization_plan: free, basic, pro, school, enterprise
quiz_visibility: private, organization, public
quiz_status: draft, published, archived
room_status: waiting, active, paused, ended
correct_option: A, B, C, D
scoring_mode: simple, speed_bonus
ai_generation_status: generated, validation_failed, repaired, ready_for_preview, published, failed
ai_draft_status: draft, approved, deleted
ai_usage_action: generate, repair, publish
usage_status: success, failed
```

## Tables

### organizations

Stores schools, departments, institutes, or enterprise customers.

```txt
id uuid primary key
name text not null
slug text not null unique
plan organization_plan not null default 'free'
branding_json jsonb
settings_json jsonb
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Indexes:

- `unique(slug)`
- `index(plan)`

### users

Stores hosts and admins. Participants do not need user accounts.

```txt
id uuid primary key
organization_id uuid references organizations(id) on delete set null
name text not null
email text not null unique
password_hash text not null
role user_role not null default 'host'
is_active boolean not null default true
last_login_at timestamptz
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Indexes:

- `unique(email)`
- `index(role)`
- `index(organization_id)`
- `index(organization_id, role)`

### quizzes

Stores quiz metadata.

```txt
id uuid primary key
host_id uuid not null references users(id) on delete cascade
organization_id uuid references organizations(id) on delete set null
title text not null
subject text
description text
default_time_limit integer not null default 30
default_marks integer not null default 1
visibility quiz_visibility not null default 'private'
status quiz_status not null default 'draft'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

- `default_time_limit between 5 and 300`
- `default_marks between 1 and 100`

Indexes:

- `index(host_id, created_at desc)`
- `index(organization_id, created_at desc)`
- `index(status)`
- Full-text index on `title`, `subject`, `description` later for Explore Quizzes.

### questions

Stores manually created and AI-published questions.

```txt
id uuid primary key
quiz_id uuid not null references quizzes(id) on delete cascade
question_text text not null
option_a text not null
option_b text not null
option_c text not null
option_d text not null
correct_option correct_option not null
marks integer not null
time_limit integer not null
explanation text
order_number integer not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

- `unique(quiz_id, order_number)`
- `marks between 1 and 100`
- `time_limit between 5 and 300`

Indexes:

- `index(quiz_id)`
- `index(quiz_id, order_number)`

### rooms

Stores live room lifecycle state.

```txt
id uuid primary key
quiz_id uuid not null references quizzes(id) on delete restrict
host_id uuid not null references users(id) on delete cascade
organization_id uuid references organizations(id) on delete set null
room_code text not null unique
room_name text not null
status room_status not null default 'waiting'
participant_limit integer not null default 50
free_limit integer not null default 50
host_pass_id uuid references host_passes(id) on delete set null
current_question_id uuid references questions(id) on delete set null
current_question_order integer
current_question_started_at timestamptz
current_question_ends_at timestamptz
show_leaderboard boolean not null default true
show_correct_answer boolean not null default false
scoring_mode scoring_mode not null default 'simple'
created_at timestamptz not null default now()
started_at timestamptz
ended_at timestamptz
updated_at timestamptz not null default now()
```

Constraints:

- `participant_limit >= free_limit`
- `free_limit = 50`

Indexes:

- `unique(room_code)`
- `index(host_id, created_at desc)`
- `index(organization_id, created_at desc)`
- `index(status)`
- `index(quiz_id)`

### participants

Stores no-login quiz participants.

```txt
id uuid primary key
room_id uuid not null references rooms(id) on delete cascade
display_name text not null
join_token_hash text not null
score integer not null default 0
correct_count integer not null default 0
wrong_count integer not null default 0
attempted_count integer not null default 0
total_response_time_ms integer not null default 0
rank_snapshot integer
joined_at timestamptz not null default now()
last_seen_at timestamptz
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

- `unique(room_id, join_token_hash)`
- `score >= 0`
- `correct_count >= 0`
- `wrong_count >= 0`
- `attempted_count >= 0`

Indexes:

- `index(room_id, score desc, total_response_time_ms asc)`
- `index(room_id, joined_at)`

### answers

Stores submitted answers.

```txt
id uuid primary key
room_id uuid not null references rooms(id) on delete cascade
participant_id uuid not null references participants(id) on delete cascade
question_id uuid not null references questions(id) on delete cascade
selected_option correct_option not null
is_correct boolean not null
score_awarded integer not null default 0
answered_at timestamptz not null default now()
response_time_ms integer not null
created_at timestamptz not null default now()
```

Constraints:

- `unique(participant_id, question_id)`
- `score_awarded >= 0`
- `response_time_ms >= 0`

Indexes:

- `index(room_id, question_id)`
- `index(participant_id)`
- `index(question_id)`
- `index(room_id, score_awarded)`

No-answer and timeout do not require inserted rows for MVP. They can be calculated by comparing participants against expected questions and submitted answers.

### host_passes

Stores upgrade passes for rooms above the free participant limit.

```txt
id uuid primary key
pass_code_hash text not null unique
plan_name text not null
participant_limit integer not null
valid_until timestamptz not null
is_active boolean not null default true
assigned_host_id uuid references users(id) on delete set null
assigned_organization_id uuid references organizations(id) on delete set null
created_by_admin_id uuid references users(id) on delete set null
used_at timestamptz
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

- `participant_limit > 50`

Indexes:

- `unique(pass_code_hash)`
- `index(assigned_host_id)`
- `index(assigned_organization_id)`
- `index(valid_until)`
- `index(is_active)`

### ai_generations

Stores AI generation attempts and validation state.

Do not store Gemini API keys. AI uses user-provided frontend keys, and the backend stores only generated JSON, validation results, draft questions, metadata, and usage logs.

```txt
id uuid primary key
host_id uuid not null references users(id) on delete cascade
quiz_id uuid not null references quizzes(id) on delete cascade
input_prompt text not null
input_subject text not null
input_level text not null
input_topic text not null
input_difficulty text not null
input_language text not null
question_count integer not null
marks_per_question integer not null
time_per_question integer not null
raw_json jsonb
fixed_json jsonb
validation_errors jsonb
status ai_generation_status not null
attempt_count integer not null default 0
model text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

- `question_count between 1 and 50`
- `marks_per_question between 1 and 100`
- `time_per_question between 5 and 300`

Indexes:

- `index(host_id, created_at desc)`
- `index(quiz_id, created_at desc)`
- `index(status)`

### ai_question_drafts

Stores preview questions before publishing.

```txt
id uuid primary key
generation_id uuid not null references ai_generations(id) on delete cascade
quiz_id uuid not null references quizzes(id) on delete cascade
question_text text not null
option_a text not null
option_b text not null
option_c text not null
option_d text not null
correct_option correct_option not null
marks integer not null
time_limit integer not null
explanation text
status ai_draft_status not null default 'draft'
order_number integer not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

- `marks between 1 and 100`
- `time_limit between 5 and 300`

Indexes:

- `index(generation_id, order_number)`
- `index(quiz_id)`
- `index(status)`

### ai_usage_logs

Stores AI usage audit trail.

```txt
id uuid primary key
host_id uuid not null references users(id) on delete cascade
organization_id uuid references organizations(id) on delete set null
action ai_usage_action not null
question_count integer not null default 0
model text
status usage_status not null
error_message text
created_at timestamptz not null default now()
```

Indexes:

- `index(host_id, created_at desc)`
- `index(organization_id, created_at desc)`
- `index(action, created_at desc)`

### organization_invites

Supports enterprise invite user flow.

```txt
id uuid primary key
organization_id uuid not null references organizations(id) on delete cascade
email text not null
role user_role not null default 'host'
token_hash text not null unique
invited_by_user_id uuid references users(id) on delete set null
accepted_at timestamptz
expires_at timestamptz not null
created_at timestamptz not null default now()
```

Indexes:

- `unique(token_hash)`
- `index(organization_id, created_at desc)`
- `index(email)`

### audit_logs

Stores sensitive platform actions.

```txt
id uuid primary key
actor_user_id uuid references users(id) on delete set null
organization_id uuid references organizations(id) on delete set null
action text not null
entity_type text not null
entity_id uuid
metadata_json jsonb
created_at timestamptz not null default now()
```

Indexes:

- `index(actor_user_id, created_at desc)`
- `index(organization_id, created_at desc)`
- `index(entity_type, entity_id)`

## Analytics Rollup Tables

Use these after MVP when analytics queries become heavy.

### room_question_stats

```txt
id uuid primary key
room_id uuid not null references rooms(id) on delete cascade
question_id uuid not null references questions(id) on delete cascade
attempt_count integer not null default 0
correct_count integer not null default 0
wrong_count integer not null default 0
no_answer_count integer not null default 0
average_response_time_ms integer
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

- `unique(room_id, question_id)`

### participant_room_summaries

```txt
id uuid primary key
room_id uuid not null references rooms(id) on delete cascade
participant_id uuid not null references participants(id) on delete cascade
score integer not null
rank integer not null
correct_count integer not null
wrong_count integer not null
attempted_count integer not null
accuracy_percent numeric(5,2)
total_response_time_ms integer
created_at timestamptz not null default now()
```

Constraints:

- `unique(room_id, participant_id)`

### organization_daily_stats

```txt
id uuid primary key
organization_id uuid not null references organizations(id) on delete cascade
stat_date date not null
rooms_count integer not null default 0
participants_count integer not null default 0
answers_count integer not null default 0
average_accuracy_percent numeric(5,2)
ai_generations_count integer not null default 0
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

- `unique(organization_id, stat_date)`

## Transaction Patterns

### Answer Submission Transaction

Inside one transaction:

1. Read room and current question.
2. Check active timer using server time.
3. Insert answer with unique `(participant_id, question_id)`.
4. Calculate score.
5. Update participant totals.
6. Commit.

If the unique answer constraint fails, return "Answer already submitted".

### Participant Join Transaction

Inside one transaction or Redis lock:

1. Read room.
2. Count participants.
3. Validate free limit or Host Pass.
4. Insert participant.
5. Commit.

### AI Publish Transaction

Inside one transaction:

1. Verify generation belongs to host and quiz.
2. Read non-deleted drafts.
3. Validate drafts.
4. Insert into `questions` with correct order numbers.
5. Update generation status to `published`.
6. Write AI usage log.

## Redis Cache Design

PostgreSQL is source of truth. Redis is disposable.

```txt
room:{roomCode}:state
room:{roomCode}:participants:count
room:{roomCode}:leaderboard
room:{roomCode}:presence
room:{roomCode}:question:{questionId}:submitted-count
host:{hostId}:ai-usage:{yyyy-mm-dd}
rate-limit:{scope}:{identifier}
lock:room:{roomCode}:join
lock:answer:{participantId}:{questionId}
```

Recommended TTLs:

- Room state: 2-10 seconds
- Leaderboard: 2-5 seconds
- Presence: 20-60 seconds heartbeat
- AI usage: expires after the daily window
- Rate limits: same as limit window
- Locks: 2-10 seconds

## Scaling Notes

- Partition `answers` by month or room if answer volume becomes very large.
- Use read replicas for analytics-heavy dashboards.
- Use rollup tables for enterprise analytics.
- Use `EXPLAIN ANALYZE` for slow admin reports.
- Keep live room queries narrow.
- Avoid loading all participants for large rooms unless exporting.
- Paginate admin/user/analytics lists.

## No Negative Marking

The database must not include any field for negative marks, penalty marks, or deduction marks.
