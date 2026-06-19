# Updated Master Prompt: Build biiQuiz Live Practice as a Practical, Scalable Production System

You are building a production-ready web application for:

**Domain:** `host.biiquiz.com`  
**Product:** `biiQuiz Live Practice`  
**Category:** Live quiz hosting, AI quiz generation, analytics, and education SaaS

Build a real, maintainable, scalable system. Do not build a toy demo. The application must be useful for teachers, tuition centers, schools, colleges, exam-prep institutes, and enterprise education organizations.

## Core Product Rule

There is no negative marking anywhere in the product.

- Correct answer = question marks
- Wrong answer = 0
- Timeout = 0
- No answer = 0
- Never add `negativeMarks`, `penalty`, `deductMarks`, or similar fields in the UI, database, APIs, schemas, AI prompts, or scoring logic.

## Use Existing Project References

Use the markdown content in:

- `resources/host.biiquiz.com\.md`

Use the UI screenshots in:

- `UI:Ux design/`

The PNG files are already flattened into the master design folder and named by page, for example:

- `landing_page.png`
- `login_page.png`
- `register_page.png`
- `pricing_page.png`
- `join_quiz.png`
- `unified_host_dashboard.png`
- `create_quiz_page.png`
- `quiz_editor.png`
- `ai_question_generator.png`
- `ai_preview_page.png`
- `create_live_room_page.png`
- `unified_live_room_control.png`
- `active_question.png`
- `leaderboard.png`
- `host_pass_management.png`
- `unified_admin_overview.png`
- `unified_enterprise_analytics.png`
- `organization_settings.png`
- `ai_usage_log.png`

Match these screens closely, but prioritize clean, responsive, accessible implementation over pixel-perfect copying.

## Recommended Tech Stack

Use this stack unless the existing project already has a different working stack:

- Next.js App Router
- TypeScript with strict mode
- Tailwind CSS
- PostgreSQL as the system of record
- Prisma ORM
- Redis for cache, rate limits, live room snapshots, pub/sub, presence, and leaderboard speed
- Socket.io or native WebSocket for realtime quiz events
- Zod for API validation
- NextAuth/Auth.js or a secure custom session implementation for host/admin auth
- Gemini API for AI question generation using user-provided frontend keys
- CSV export for final results
- Server actions or API routes only where appropriate

Participants do not need login. Hosts and admins must login.

## Architecture Principles

Create one clean architecture for the whole application.

Do not create scattered duplicate code. Use reusable services, schemas, database models, UI components, and domain helpers.

Required structure:

```txt
src/
  app/
    (public)/
      page.tsx
      pricing/
      join/
    (auth)/
      login/
      register/
    dashboard/
      page.tsx
      quizzes/
        create/
        [quizId]/
          edit/
          host/
          ai-generate/
          ai-preview/[generationId]/
    host/
      room/[roomCode]/
    play/
      [roomCode]/
    leaderboard/
      [roomCode]/
    admin/
      page.tsx
      host-passes/
      users/
      analytics/
      ai-usage/
    api/
      auth/
      quizzes/
      questions/
      rooms/
      participants/
      answers/
      leaderboard/
      ai/
      admin/

  components/
    ui/
    quiz/
    room/
    participant/
    leaderboard/
    ai/
    admin/
    analytics/

  lib/
    db.ts
    redis.ts
    auth.ts
    env.ts
    rate-limit.ts
    realtime.ts
    csv.ts
    logger.ts
    errors.ts

  schemas/
    auth.schema.ts
    quiz.schema.ts
    question.schema.ts
    room.schema.ts
    answer.schema.ts
    ai.schema.ts
    host-pass.schema.ts
    admin.schema.ts

  services/
    quiz.service.ts
    question.service.ts
    room.service.ts
    participant.service.ts
    answer.service.ts
    scoring.service.ts
    timer.service.ts
    leaderboard.service.ts
    ai-generation.service.ts
    ai-validation.service.ts
    host-pass.service.ts
    admin.service.ts
    analytics.service.ts
    cache.service.ts
    realtime.service.ts

  repositories/
    quiz.repository.ts
    room.repository.ts
    participant.repository.ts
    answer.repository.ts
    ai.repository.ts
    admin.repository.ts

  types/
    auth.ts
    quiz.ts
    room.ts
    participant.ts
    ai.ts
    analytics.ts

  utils/
    generate-room-code.ts
    sanitize.ts
    date.ts
    pagination.ts
```

Keep API routes thin. Business rules belong in services. Database queries belong in repositories or service-level query helpers.

## Production Quality Rules

- Use TypeScript strictly.
- Avoid `any`.
- Use Zod validation for all external input.
- Never trust frontend score, timer, room status, or participant count.
- Use PostgreSQL transactions for answer submission, participant join, question transitions, publishing AI drafts, and host pass redemption.
- Use idempotency and uniqueness constraints to prevent duplicate joins and duplicate answer submissions.
- Use Redis/cache only as a speed layer. PostgreSQL remains the source of truth.
- Never store user-provided Gemini API keys on the backend.
- In this product, personal and enterprise users provide their own Gemini API keys in the frontend for AI generation.
- Store secrets in environment variables.
- Add clear loading, empty, success, and error states.
- Make all pages responsive for mobile and desktop.
- Add indexes for every frequent lookup.
- Add server-side authorization checks on every host/admin endpoint.
- Return friendly errors to users and log detailed errors server-side.

## System Design

### Main Services

1. Web app service
   - Next.js UI, API routes, server actions where appropriate.

2. PostgreSQL database
   - Source of truth for users, quizzes, rooms, participants, answers, host passes, AI generations, analytics, and audit logs.

3. Redis cache
   - Room state snapshots
   - Live participant presence
   - Rate limiting
   - AI usage counters
   - Leaderboard cache
   - WebSocket pub/sub adapter
   - Short-lived idempotency locks

4. Realtime gateway
   - Socket.io/WebSocket event layer.
   - Broadcasts room events, question changes, timer updates, answer counts, and leaderboard updates.

5. AI validation and publishing service
   - Frontend BYOK Gemini generation.
   - Backend JSON validation, draft preview, and publishing flow.

### Data Flow For Live Quiz

1. Host creates quiz and questions.
2. Host creates room.
3. Server generates unique room code.
4. Participants join by room code without login.
5. Join checks participant limit and Host Pass rules.
6. Host starts quiz.
7. Server stores current question start/end timestamps.
8. Participants submit answers.
9. Server validates answer window and duplicate-answer constraint.
10. Server scores inside a database transaction.
11. Server updates participant totals.
12. Server refreshes leaderboard cache.
13. Realtime layer broadcasts updated room state and leaderboard.
14. Final results are stored and exportable as CSV.

## PostgreSQL Database Design

Use UUID primary keys unless the existing project has a consistent alternative. Use `timestamptz` for all timestamps. Use enums for stable state fields.

### Main Tables

#### users

- `id`
- `name`
- `email`
- `password_hash`
- `role`: `admin | host`
- `organization_id`, nullable
- `is_active`
- `last_login_at`
- `created_at`
- `updated_at`

Constraints and indexes:

- Unique `email`
- Index `role`
- Index `organization_id`

#### organizations

- `id`
- `name`
- `slug`
- `plan`: `free | basic | pro | school | enterprise`
- `branding_json`
- `settings_json`
- `created_at`
- `updated_at`

Indexes:

- Unique `slug`

#### quizzes

- `id`
- `host_id`
- `organization_id`, nullable
- `title`
- `subject`
- `description`
- `default_time_limit`
- `default_marks`
- `visibility`: `private | organization | public`
- `status`: `draft | published | archived`
- `created_at`
- `updated_at`

Indexes:

- `host_id, created_at`
- `organization_id, created_at`
- Full-text search index on `title`, `subject`, `description` if supported.

#### questions

- `id`
- `quiz_id`
- `question_text`
- `option_a`
- `option_b`
- `option_c`
- `option_d`
- `correct_option`: `A | B | C | D`
- `marks`
- `time_limit`
- `explanation`
- `order_number`
- `created_at`
- `updated_at`

Constraints and indexes:

- Unique `quiz_id, order_number`
- Check `marks > 0`
- Check `time_limit between 5 and 300`
- Index `quiz_id`

#### rooms

- `id`
- `quiz_id`
- `host_id`
- `organization_id`, nullable
- `room_code`
- `room_name`
- `status`: `waiting | active | paused | ended`
- `participant_limit`
- `free_limit`, default `50`
- `host_pass_id`, nullable
- `current_question_id`, nullable
- `current_question_order`, nullable
- `current_question_started_at`, nullable
- `current_question_ends_at`, nullable
- `show_leaderboard`
- `show_correct_answer`
- `scoring_mode`: `simple | speed_bonus`
- `created_at`
- `started_at`
- `ended_at`
- `updated_at`

Constraints and indexes:

- Unique `room_code`
- Index `host_id, created_at`
- Index `status`
- Index `quiz_id`

#### participants

- `id`
- `room_id`
- `display_name`
- `join_token_hash`
- `score`
- `correct_count`
- `wrong_count`
- `attempted_count`
- `total_response_time_ms`
- `rank_snapshot`, nullable
- `joined_at`
- `last_seen_at`
- `created_at`
- `updated_at`

Constraints and indexes:

- Unique `room_id, join_token_hash`
- Index `room_id, score desc, total_response_time_ms asc`
- Index `room_id, joined_at`

#### answers

- `id`
- `room_id`
- `participant_id`
- `question_id`
- `selected_option`
- `is_correct`
- `score_awarded`
- `answered_at`
- `response_time_ms`
- `created_at`

Constraints and indexes:

- Unique `participant_id, question_id`
- Index `room_id, question_id`
- Index `participant_id`
- Check `score_awarded >= 0`

#### host_passes

- `id`
- `pass_code_hash`
- `plan_name`
- `participant_limit`
- `valid_until`
- `is_active`
- `assigned_host_id`, nullable
- `assigned_organization_id`, nullable
- `created_by_admin_id`
- `used_at`
- `created_at`
- `updated_at`

Constraints and indexes:

- Unique `pass_code_hash`
- Index `assigned_host_id`
- Index `assigned_organization_id`
- Index `valid_until`

#### ai_generations

- `id`
- `host_id`
- `quiz_id`
- `input_prompt`
- `input_subject`
- `input_level`
- `input_topic`
- `input_difficulty`
- `input_language`
- `question_count`
- `marks_per_question`
- `time_per_question`
- `raw_json`
- `fixed_json`
- `validation_errors`
- `status`: `generated | validation_failed | repaired | ready_for_preview | published | failed`
- `attempt_count`
- `model`
- `created_at`
- `updated_at`

Indexes:

- `host_id, created_at`
- `quiz_id, created_at`
- `status`

#### ai_question_drafts

- `id`
- `generation_id`
- `quiz_id`
- `question_text`
- `option_a`
- `option_b`
- `option_c`
- `option_d`
- `correct_option`
- `marks`
- `time_limit`
- `explanation`
- `status`: `draft | approved | deleted`
- `order_number`
- `created_at`
- `updated_at`

Indexes:

- `generation_id, order_number`
- `quiz_id`

#### ai_usage_logs

- `id`
- `host_id`
- `organization_id`, nullable
- `action`: `generate | repair | publish`
- `question_count`
- `model`
- `status`: `success | failed`
- `error_message`
- `created_at`

Indexes:

- `host_id, created_at`
- `organization_id, created_at`

#### audit_logs

- `id`
- `actor_user_id`, nullable
- `organization_id`, nullable
- `action`
- `entity_type`
- `entity_id`
- `metadata_json`
- `created_at`

Use this for admin actions, host pass creation, AI generation, room lifecycle events, and sensitive changes.

## PostgreSQL Performance Requirements

- Use connection pooling.
- Keep transactions short.
- Use indexes for room code lookup, participant leaderboard sorting, answer duplicate prevention, host dashboard queries, and AI usage lookup.
- Use pagination for dashboards and admin lists.
- Avoid N+1 queries.
- For large analytics, use aggregated tables or materialized views later instead of recalculating everything from raw answers on every request.
- Use `EXPLAIN ANALYZE` during optimization for slow queries.
- Store raw answer-level data permanently for audit and analytics.

## Caching Strategy

PostgreSQL is the source of truth. Redis is a performance layer.

### Cache keys

Use consistent cache keys:

- `room:{roomCode}:state`
- `room:{roomCode}:participants:count`
- `room:{roomCode}:leaderboard`
- `room:{roomCode}:presence`
- `room:{roomCode}:question:{questionId}:submitted-count`
- `host:{hostId}:ai-usage:{yyyy-mm-dd}`
- `rate-limit:{scope}:{identifier}`

### What to cache

- Room state snapshot: 2 to 10 second TTL
- Leaderboard: refresh after answer submission, 2 to 5 second TTL
- Participant count: update on join/leave, short TTL
- Presence: heartbeat-based TTL
- AI usage counters: daily TTL
- Rate limits: TTL based on limit window

### Cache invalidation

Invalidate or refresh cache when:

- Participant joins
- Room starts/pauses/ends
- Question changes
- Answer is submitted
- Host updates room settings
- Quiz questions are edited before a room starts

If cache is missing or stale, rebuild from PostgreSQL.

## Realtime Requirements

Use Socket.io/WebSocket with Redis adapter/pub-sub if the app may run on multiple instances.

Events:

- `room:participant_joined`
- `room:participant_left`
- `room:started`
- `room:paused`
- `room:ended`
- `question:started`
- `question:ended`
- `answer:submitted`
- `answer:count_updated`
- `leaderboard:updated`
- `host:participant_presence_updated`
- `error`

Security:

- Hosts can only control their own rooms.
- Participants can only send answer events for their own join token/session.
- Validate every WebSocket command on the server.
- Do not trust client timestamps.

## Timer Rules

- Server time is the source of truth.
- Store `current_question_started_at` and `current_question_ends_at`.
- Frontend timer is display only.
- Answer submission must compare server time against `current_question_ends_at`.
- If the timer expires, unanswered participants get 0 by default.
- Do not insert answer rows for no-answer unless needed for analytics. Final reporting can calculate no-answer from missing answer rows.

## Scoring Rules

### Simple Mode

```txt
if answer is correct:
  score = question.marks
else:
  score = 0
```

### Speed Bonus Mode

```txt
if answer is correct:
  speed_bonus = round(question.marks * 0.5 * remaining_time / total_time)
  score = question.marks + speed_bonus
else:
  score = 0
```

Never subtract marks.

## Participant Limit and Host Pass Rules

- Free limit = 50 participants per room.
- If participant count is 50 or below, allow join.
- If participant count is above 50, require a valid Host Pass.

A valid Host Pass must be:

- Active
- Not expired
- Assigned to the host, assigned to the organization, or globally usable
- Participant limit greater than current participant count

If invalid or missing, show:

```txt
This quiz room has reached the free limit of 50 participants. Please ask the host to upgrade with a biiQuiz Host Pass.
```

Enforce this check in a transaction or with a short Redis lock to prevent race conditions during high-traffic joins.

## Required Pages

### Public

- `/`
- `/pricing`
- `/join`

### Auth

- `/login`
- `/register`

### Host

- `/dashboard`
- `/dashboard/quizzes/create`
- `/dashboard/quizzes/[quizId]/edit`
- `/dashboard/quizzes/[quizId]/host`
- `/dashboard/quizzes/[quizId]/ai-generate`
- `/dashboard/quizzes/[quizId]/ai-preview/[generationId]`
- `/host/room/[roomCode]`

### Participant

- `/play/[roomCode]`
- `/leaderboard/[roomCode]`

### Admin and Enterprise

- `/admin`
- `/admin/host-passes`
- `/admin/users`
- `/admin/analytics`
- `/admin/ai-usage`
- `/admin/organization-settings`

Build MVP pages first, then enterprise pages.

## Required API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Quizzes and Questions

- `GET /api/quizzes`
- `POST /api/quizzes`
- `GET /api/quizzes/[quizId]`
- `PATCH /api/quizzes/[quizId]`
- `DELETE /api/quizzes/[quizId]`
- `POST /api/quizzes/[quizId]/questions`
- `PATCH /api/questions/[questionId]`
- `DELETE /api/questions/[questionId]`

### Rooms

- `POST /api/rooms`
- `GET /api/rooms/[roomCode]`
- `POST /api/rooms/[roomCode]/join`
- `POST /api/rooms/[roomCode]/start`
- `POST /api/rooms/[roomCode]/pause`
- `POST /api/rooms/[roomCode]/next-question`
- `POST /api/rooms/[roomCode]/end`
- `POST /api/rooms/[roomCode]/answer`
- `GET /api/leaderboard/[roomCode]`
- `GET /api/rooms/[roomCode]/results.csv`

### Admin

- `GET /api/admin/overview`
- `GET /api/admin/users`
- `PATCH /api/admin/users/[userId]`
- `GET /api/admin/host-passes`
- `POST /api/admin/host-passes`
- `PATCH /api/admin/host-passes/[id]`
- `GET /api/admin/ai-usage`
- `GET /api/admin/analytics`

### AI

- `POST /api/ai/generate-questions`
- `POST /api/ai/repair-questions`
- `POST /api/ai/publish-questions`
- `GET /api/ai/generations/[generationId]`
- `PATCH /api/ai/draft-question/[draftQuestionId]`
- `DELETE /api/ai/draft-question/[draftQuestionId]`
- `POST /api/ai/draft-question`

## AI Question Generator

Use a BYOK model for Gemini generation.

Personal and enterprise users enter their own Gemini API key in the frontend. They can enter multiple keys for fallback. The frontend calls Gemini directly with those user-provided keys. The backend does not call Gemini in the default flow and must not store, log, proxy, or persist the user's Gemini keys.

Optional public environment variable:

```txt
NEXT_PUBLIC_GEMINI_MODEL=gemini-2.5-flash
```

Generation flow:

1. Host opens AI Generator.
2. Host enters subject, level, topic, difficulty, language, question count, marks, timer, and optional instructions.
3. Frontend validates basic input and checks that at least one Gemini key is available.
4. Frontend calls Gemini directly using the selected user-provided key.
5. If one key is rate-limited or temporarily fails, frontend may try the next user-provided key.
6. Frontend sends generated JSON to backend.
7. Backend validates host auth, quiz ownership, and generated content rules for saving/publishing.
8. Backend saves raw JSON first.
9. Backend validates JSON with Zod/schema.
10. If invalid, frontend can call Gemini repair using the user's key and resubmit repaired JSON.
11. Try maximum 2 repairs.
12. Backend saves valid questions as drafts.
13. Show preview editor.
14. Host edits, deletes, adds, regenerates, or publishes.
15. Published drafts are inserted into `questions` inside a transaction.

AI usage policy:

- Do not block Gemini generation based on platform-owned provider quotas because users use their own personal or enterprise Gemini keys.
- Enforce only reasonable platform protection limits on backend save/publish endpoints, such as maximum 50 questions per generation payload.
- Keep AI usage logs for audit, analytics, and enterprise reporting.
- Admins may later configure organization-level save/publish limits, but the default product goal is that every host can generate using their own key.

Gemini key fallback:

- Read keys from the frontend Gemini key manager.
- Try one user-provided key.
- If rate-limited or temporary provider error, try the next user-provided key.
- Do not send key details to the backend.
- Return friendly error:

```txt
AI generation is temporarily unavailable with the provided Gemini keys. Please check your key or try again later.
```

AI output must be JSON only and match this structure:

```json
{
  "quizTitle": "string",
  "subject": "string",
  "level": "string",
  "questions": [
    {
      "questionText": "string",
      "optionA": "string",
      "optionB": "string",
      "optionC": "string",
      "optionD": "string",
      "correctOption": "A",
      "marks": 5,
      "timeLimit": 30,
      "explanation": "string"
    }
  ]
}
```

Reject or remove:

- `negativeMarks`
- `negative_marking`
- `penalty`
- `deductMarks`

## Enterprise Features

After the MVP is stable, add enterprise features:

- Organization dashboard
- Host/user management
- Invite user flow
- Organization settings
- Enterprise analytics
- Individual host analytics
- Detailed analytics reports
- AI usage log
- Department collaborative workspace
- Live proctoring and intervention dashboard
- Automated knowledge gap reports
- Mobile variants for major admin and analytics screens

Keep enterprise features modular. Do not let them pollute the MVP room/quiz flow.

## Analytics Design

Track enough raw data to support:

- Score distribution
- Accuracy by question
- Accuracy by topic/subject
- Average response time
- Participant attendance
- Room completion rate
- Host activity
- AI generation usage
- Knowledge gap analysis

For MVP, calculate analytics from normalized tables with optimized queries. For scale, add rollup tables such as:

- `room_question_stats`
- `participant_room_summaries`
- `host_daily_stats`
- `organization_daily_stats`

Update rollups after room end or with a background job.

## UI and UX Requirements

Use the provided screenshots as design references. Build a professional education SaaS interface:

- Clear hierarchy
- Fast workflows for teachers
- Mobile-first participant experience
- Accessible contrast
- Responsive layout
- Loading states
- Empty states
- Error states
- Confirmation states for destructive actions
- Copy room code and join link buttons
- Timer circle/progress bar
- Live participant counter
- Submitted answer counter
- Host control panel
- Leaderboard table/cards
- Final result card
- Upgrade required modal
- CSV export button

Do not create a marketing-only landing page as the main work. The product flows must actually work.

## Implementation Phases

### Phase 1: Foundation and Core Live Quiz

Build:

- Auth for host/admin
- PostgreSQL schema and migrations
- Redis connection and cache helper
- Quiz CRUD
- Question CRUD
- Room creation
- Participant join
- 50 participant free limit
- Host Pass validation
- Server-controlled timer
- Answer submission
- Server-side scoring
- Live leaderboard
- CSV export
- Basic admin host pass management

Acceptance criteria:

- Host can register/login.
- Host can create quiz and questions.
- Host can create live room.
- Participants can join without login.
- Free limit is enforced.
- Host Pass unlock works.
- Host can start, pause, next, and end quiz.
- Participants can answer once per question.
- Late answers are rejected server-side.
- Score is calculated only on backend.
- Leaderboard updates live.
- Results export as CSV.

### Phase 2: AI Question Generator

Build:

- AI generator form
- Frontend Gemini integration using user-provided keys
- JSON validation
- Repair loop
- AI draft questions
- AI preview editor
- Publish to quiz
- AI usage logs
- AI usage logs

Acceptance criteria:

- Host can generate questions from topic.
- Raw JSON is saved.
- Invalid JSON is repaired up to 2 times.
- Drafts can be edited/deleted/added.
- Valid drafts can publish into quiz.
- No negative marking exists anywhere.
- Gemini keys are provided by the user in the frontend and are never stored or logged by the backend.

### Phase 3: Enterprise and Analytics

Build:

- Organization model
- Admin overview
- User and seat management
- Invite flow
- Organization settings
- Analytics dashboards
- AI usage log
- Department workspace
- Proctoring/intervention dashboard
- Knowledge gap reports

Acceptance criteria:

- Admin can manage hosts and organization users.
- Analytics pages load with paginated/optimized data.
- AI usage is auditable.
- Organization settings are isolated per organization.
- Enterprise features do not break MVP quiz flow.

## Testing Requirements

Add practical tests for high-risk logic:

- Scoring service
- Timer validation
- Duplicate answer prevention
- Participant limit and Host Pass validation
- AI JSON validation and cleanup
- AI usage logs and optional platform save/publish limits
- Authorization checks

Add integration tests for:

- Participant join
- Answer submission
- Room lifecycle
- AI publish flow

## Final Build Instruction

Build the system in phases. Finish Phase 1 before Phase 2. Finish Phase 2 before Phase 3.

Do not rewrite everything between phases. Reuse the same database schema, services, validation, components, and cache/realtime architecture.

The final result should be a clean, responsive, scalable, maintainable application for `host.biiquiz.com` with:

- Live quiz hosting
- Server-side timer and scoring
- 50-participant free limit
- Host Pass upgrade mechanism
- PostgreSQL source-of-truth data model
- Redis caching and realtime scaling strategy
- Live leaderboard
- CSV export
- Admin management
- AI question generation
- AI JSON validation and repair
- AI preview before publish
- Enterprise analytics path
- No negative marking anywhere
