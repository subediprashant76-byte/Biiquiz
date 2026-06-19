# biiQuiz Architecture

Source reference: `resources/host.biiquiz.com\.md`  
UI reference folder: `UI:Ux design/`

This document defines the practical system architecture for `host.biiquiz.com`, a live quiz hosting and AI question generation platform for educators, schools, institutions, and enterprise admins.

## Product Scope

biiQuiz Host supports these main flows:

- Public onboarding: landing, pricing, login, registration.
- Host workflow: dashboard, quiz creation, quiz editor, AI generator, AI preview, live room control, quiz discovery.
- Participant workflow: join quiz, active question, leaderboard, final result.
- Enterprise workflow: organization settings, host user management, invite flow, analytics, AI usage log, host pass management.
- Advanced education workflow: collaborative department workspace, proctoring/intervention dashboard, automated knowledge gap reports.

The system must be production-ready, scalable, secure, and easy to maintain.

## Flow Boundaries

Assumption: the product documentation uses **Enterprise workflow**, **Admin**, and **Organization** for the same tenant-level management area. In the current implementation this area keeps the documented `/admin/*` frontend routes and `/api/admin/*` backend endpoints, but the UI is treated as the **Organization Console**.

### Host Flow

Hosts are educators or trainers who create and run quizzes. They use `/dashboard/*` and `/host/room/*`.

- Owns quiz setup, question editing, BYOK AI generation, room creation, and live room control.
- Can view host-level analytics and host pass usage prompts.
- Must not manage organization users, organization settings, pass inventory, or tenant-wide analytics.
- Uses host-facing navigation and the Host workspace UI.

### Organization Flow

Organization admins manage a school, institution, department, or enterprise tenant. They use the documented `/admin/*` routes and `/api/admin/*` APIs.

- Owns tenant overview, host user management, invites, host pass inventory, organization analytics, AI usage audit, organization settings, department workspace, proctoring/intervention views, and knowledge gap reporting.
- Requires admin permissions on backend APIs.
- Uses organization-level data where backend support exists.
- Uses backend-derived data from the documented host and organization endpoints.

### Organization UI Flow

Organization UI is visually and structurally separate from Host UI.

- Uses the Organization Console shell and organization navigation.
- Does not show Host primary actions such as "Create quiz" as organization primary workflow actions.
- Can link back to the Host workspace only as a secondary context switch.
- Maps every screen to a documented `/api/host/*`, `/api/admin/*`, or core quiz/room endpoint.

## Architecture Goals

- Keep PostgreSQL as the source of truth.
- Use Redis as the fast cache, presence, rate-limit, and realtime coordination layer.
- Keep business rules on the server.
- Keep API routes thin and services reusable.
- Make realtime quiz rooms fast under load.
- Make participant join and answer submission race-safe.
- Support enterprise growth without rewriting the MVP.
- Keep AI generation isolated from core quiz runtime reliability.
- Use a BYOK AI model: hosts provide their own Gemini API key in the frontend when generating questions.

## Recommended Stack

- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Redis
- Socket.io or native WebSocket with Redis adapter
- Zod validation
- Auth.js/NextAuth or secure custom session auth
- Gemini API for AI question generation using user-provided frontend keys
- Object storage later for exports/assets if needed
- CSV export for final results

## High-Level System

```txt
Browser clients
  |-- Host/admin authenticated UI
  |-- Participant no-login UI
  |
Next.js app
  |-- Server-rendered pages
  |-- API routes / server actions
  |-- WebSocket gateway
  |
Application services
  |-- Quiz service
  |-- Room service
  |-- Participant service
  |-- Answer/scoring service
  |-- Leaderboard service
  |-- AI validation/publish service
  |-- Analytics service
  |-- Admin service
  |
Data layer
  |-- PostgreSQL source of truth
  |-- Redis cache, presence, pub/sub, locks, rate limits
  |
External services
  |-- Gemini API called by browser with user-provided key
  |-- Email provider later for invites
  |-- Monitoring/logging provider
```

## Clean Folder Structure

```txt
src/
  app/
    (public)/
    (auth)/
    dashboard/
    host/
    play/
    leaderboard/
    admin/
    api/
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
    logger.ts
    errors.ts
    realtime.ts
    rate-limit.ts
    csv.ts
  schemas/
  services/
  repositories/
  types/
  utils/
```

## Layering Rules

- Pages and components render UI only.
- API routes validate input, authorize the user, call services, and return responses.
- Services own business rules and transactions.
- Repositories own database access.
- Schemas own request/response validation.
- Realtime handlers call the same services as HTTP routes.
- No frontend code calculates trusted score, timer validity, participant limits, or host pass validity.

## Runtime Responsibilities

### PostgreSQL

PostgreSQL stores:

- Users and organizations
- Quizzes and questions
- Rooms and lifecycle state
- Participants and answers
- Host passes
- AI generations and AI question drafts
- Analytics events and rollups
- Audit logs

PostgreSQL is always the source of truth.

### Redis

Redis stores fast, short-lived operational data:

- `room:{roomCode}:state`
- `room:{roomCode}:leaderboard`
- `room:{roomCode}:participants:count`
- `room:{roomCode}:presence`
- `room:{roomCode}:question:{questionId}:submitted-count`
- `host:{hostId}:ai-usage:{yyyy-mm-dd}`
- `rate-limit:{scope}:{identifier}`
- Short-lived locks for join and answer operations

If Redis data is missing, rebuild from PostgreSQL.

### WebSocket/Realtime

Realtime is used for:

- Participant joins
- Room start/pause/end
- Question start/end
- Submitted answer count
- Leaderboard updates
- Participant presence
- Host control updates

Every realtime command must be validated server-side.

## Critical Flows

### Participant Join

1. Load room by room code.
2. Check room status allows joining.
3. Count participants from Redis or PostgreSQL.
4. If count is above free limit, validate Host Pass.
5. Create participant inside a transaction.
6. Cache updated participant count.
7. Broadcast `room:participant_joined`.

Use a transaction or short Redis lock to avoid participant limit race conditions.

### Answer Submission

1. Validate participant token/session.
2. Load room state.
3. Confirm room is active.
4. Confirm current question matches submitted question.
5. Compare server time with `current_question_ends_at`.
6. Prevent duplicate answer using unique constraint.
7. Calculate score server-side.
8. Insert answer and update participant totals in one transaction.
9. Refresh leaderboard cache.
10. Broadcast `answer:submitted` and `leaderboard:updated`.

### AI Generation

1. Host opens the AI generator.
2. Host enters one or more personal or enterprise Gemini API keys in the frontend.
3. Frontend stores keys only in browser memory or optional local browser storage after user consent.
4. Frontend calls Gemini directly with the selected user-provided key.
5. If one key is rate-limited or fails temporarily, frontend may try the next user-provided key.
6. Frontend receives JSON from Gemini and sends the generated JSON to the backend for validation and persistence.
7. Backend validates host auth, quiz ownership, and generated JSON.
8. Backend saves raw JSON, removes unsupported fields, validates schema, and saves valid drafts.
9. If JSON is invalid, frontend can request Gemini repair using the user's key, then resubmit repaired JSON to backend.
10. Host previews, edits, deletes, adds, or publishes drafts.
11. Backend publishes approved drafts into quiz questions inside a transaction.

AI must not affect live room reliability.

Important: because Gemini calls happen from the browser, user-provided keys are visible to that user's browser/device. The platform must not store these keys in PostgreSQL, Redis, logs, analytics, or backend requests.

## Deployment Architecture

### MVP Deployment

Use this simple production setup first:

- One Next.js web service
- Managed PostgreSQL
- Managed Redis
- Environment variables for secrets
- HTTPS behind platform load balancer
- Automated migrations during release
- Structured logs and error monitoring

Suitable platforms:

- Vercel plus managed Postgres/Redis, if WebSocket support is handled externally.
- Render/Fly.io/Railway/AWS/GCP with long-running Node service for WebSockets.
- Docker deployment on a VPS for early controlled rollout.

### Scaled Deployment

When traffic grows:

- Run multiple web app instances.
- Use Redis adapter for Socket.io/WebSocket pub/sub.
- Keep all room state rebuildable from PostgreSQL.
- Use connection pooling for PostgreSQL.
- Add read replicas for analytics/admin reads if needed.
- Move long-running AI/analytics jobs to background workers.
- Add CDN caching for public static assets.

## Environment Variables

```txt
DATABASE_URL=
DIRECT_URL=
REDIS_URL=
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_GEMINI_MODEL=gemini-2.5-flash
LOG_LEVEL=info
```

Never put platform-owned private keys in `NEXT_PUBLIC_` variables. User-provided Gemini keys are entered in the frontend by the user and must not be sent to the backend.

## Deployment Code Practice

- Keep `main` deployable.
- Use migrations for all database changes.
- Never edit production database schema manually.
- Run typecheck, lint, and tests before deployment.
- Use environment-specific variables.
- Use health checks for app, database, and Redis.
- Log request IDs for debugging.
- Add graceful shutdown for WebSocket and database connections.
- Use feature flags for unfinished enterprise features.
- Keep AI provider errors isolated and user-friendly.
- Redact Gemini API keys from browser-visible errors, backend payloads, logs, and analytics.
- Avoid breaking API changes without migration support.

## Security Practice

- Hash passwords with a strong algorithm.
- Use secure, HTTP-only cookies for sessions.
- Validate all inputs with Zod.
- Authorize every host/admin action.
- Never trust participant-provided score, time, room status, or identity claims.
- Rate-limit auth, join, answer, and AI endpoints.
- Store Host Pass codes hashed.
- Store participant join tokens hashed.
- Log admin actions in audit logs.
- Do not collect, store, or log user-provided Gemini API keys.
- Show a clear warning that browser-side API keys are visible on the user's own device and should be restricted from the Google/Gemini console when possible.

## Observability

Track:

- Room join count
- Answer submission latency
- WebSocket connection count
- Leaderboard rebuild time
- Database slow queries
- Redis cache hit/miss
- AI validation/publish success/failure
- AI repair attempts
- CSV export failures
- Admin actions

Add structured logs around room lifecycle, answer submission, and AI generation.

## Phased Delivery

### Phase 1: Core Live Quiz

- Auth
- Quiz CRUD
- Question CRUD
- Room creation
- Participant join
- Server timer
- Server scoring
- Live leaderboard
- Host Pass limit
- CSV export
- Basic admin

### Phase 2: AI Question Generator

- AI generation form with user-provided Gemini key input
- Frontend Gemini integration
- JSON validation and repair
- Draft preview editor
- Publish to quiz
- AI usage logs and limits

### Phase 3: Enterprise

- Organizations
- User/seat management
- Invite flow
- Organization settings
- Analytics dashboards
- Department workspace
- Proctoring/intervention
- Knowledge gap reports

## Non-Negotiable Product Rule

No negative marking exists anywhere.

- No database column
- No API field
- No UI control
- No AI prompt field
- No scoring branch
- No report metric
