# Backend Implementation

## Backend Stack
- Python backend: Django API service in `backend/`, enabled from the frontend with `USE_DJANGO_API="true"`.
- Super Admin business data uses normalized PostgreSQL tables for plans, subscriptions, upgrades, payments, domains, support, platform settings, and AI settings. Prisma owns migrations; Django maps these tables as unmanaged models.
Prisma remains the backend migration and schema authority at `backend/prisma/schema.prisma`. Django models are unmanaged and mapped to those table names. The Next app lives in `frontend/` and proxies `/api/*` to Django.

Stack:
- Next.js App Router frontend
- Django 5 API service
- PostgreSQL
- Prisma ORM for migrations/schema contract
- Django unmanaged ORM models for Python API access
- Zod validation for frontend payloads and response contracts
- Python validation matching Prisma/Zod constraints on the Django side
- Optional Redis helper for cache/realtime-style production concerns
- AI generation where Gemini API keys are entered and used in the frontend, not stored by either backend

## Setup
```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run seed:test-users
npm run dev
```

Django setup:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py check
python manage.py seed_test_users
python manage.py runserver 127.0.0.1:8000
```

Frontend proxy to Django:

```txt
USE_DJANGO_API="true"
DJANGO_API_URL="http://127.0.0.1:8000"
```

Verification:
```bash
npm run typecheck
npm test
npm run build
```

## Data Models
Important Prisma models already present:
- `Organization`: tenant, plan, branding/settings JSON, users, rooms, host passes, analytics rollups.
- `User`: host/admin identity, organization membership, active status.
- `Quiz`: host-owned quiz metadata, visibility, status.
- `Question`: MCQ content, correct option, marks, timer.
- `Room`: live quiz session, room code, status, participant limit, current question.
- `Participant`: room-scoped participant profile and score.
- `Answer`: submitted answer, correctness, score, response time.
- `HostPass`: participant limit unlock with hashed pass code.
- `AiGeneration` and `AiQuestionDraft`: backend-stored AI output after frontend Gemini generation.
- `AiUsageLog`: AI generation/repair/publish audit metadata.
- `OrganizationInvite`, `AuditLog`, `RoomQuestionStat`, `ParticipantRoomSummary`, `OrganizationDailyStat`: organization/admin support models.

## API Endpoints
| Method | Endpoint | Purpose | Request | Response |
|---|---|---|---|---|
| POST | `/api/auth/register` | Create host account | name, email, password | user/session data |
| POST | `/api/auth/login` | Login host/admin | email, password | session data |
| POST | `/api/auth/logout` | Logout | none | ok |
| GET | `/api/auth/me` | Current user | none | user |
| GET/POST | `/api/quizzes` | List/create quizzes | quiz metadata on POST | quiz data |
| GET/PATCH/DELETE | `/api/quizzes/[quizId]` | Manage quiz | quiz updates | quiz data |
| POST | `/api/quizzes/[quizId]/questions` | Add question | MCQ fields | question |
| PATCH/DELETE | `/api/questions/[questionId]` | Update/delete question | question fields | question/ok |
| POST | `/api/rooms` | Create live room | quizId, room settings, optional host pass | room code |
| GET | `/api/rooms/[roomCode]` | Read room state | none | room/current question |
| POST | `/api/rooms/[roomCode]/join` | Join participant | displayName | participant session |
| POST | `/api/rooms/[roomCode]/start` | Start room | none | room |
| POST | `/api/rooms/[roomCode]/pause` | Pause room | none | room |
| POST | `/api/rooms/[roomCode]/next-question` | Advance current question | none | room |
| POST | `/api/rooms/[roomCode]/end` | End room | none | room |
| POST | `/api/rooms/[roomCode]/answer` | Submit participant answer | questionId, selectedOption | score result |
| GET | `/api/leaderboard/[roomCode]` | Get rankings | none | leaderboard rows |
| GET | `/api/rooms/[roomCode]/results.csv` | Export results | none | CSV |
| POST | `/api/ai/generate-questions` | Legacy saved-draft AI flow, not used by Quick AI Gen | input, generatedJson | generation |
| POST | `/api/ai/repair-questions` | Legacy saved-draft repair flow, not used by Quick AI Gen | generationId, repairedJson | generation, drafts, validationErrors |
| POST | `/api/ai/publish-questions` | Legacy saved-draft publish flow | generationId | quiz questions |
| GET | `/api/ai/generations/[generationId]` | Legacy saved-draft generation detail | none | generation and drafts |
| POST/PATCH/DELETE | `/api/ai/draft-question*` | Legacy saved-draft question management | draft fields | draft/ok |
| GET | `/api/admin/overview` | Admin overview data | none | metrics |
| GET | `/api/admin/users` | User management data | none | users |
| GET/POST | `/api/admin/host-passes` | Host pass data/create pass | pass data on POST | passes/pass |
| GET | `/api/admin/ai-usage` | AI usage audit | none | logs |
| GET | `/api/admin/analytics` | Analytics summary | none | analytics |
| GET | `/api/host/dashboard` | Host dashboard data | none | stats, drafts, active rooms |
| GET | `/api/host/analytics` | Host analytics data | none | stats, subjects, recent rooms |
| GET | `/api/host/host-passes` | Host pass availability | none | stats, passes |
| POST | `/api/admin/users/invite` | Create organization invite | email, role | invite |
| GET/PATCH | `/api/admin/organization-settings` | Read/update org settings | profile/settings on PATCH | organization settings |
| GET | `/api/admin/analytics/reports` | Detailed reports | none | report rows |
| GET | `/api/admin/users/[userId]/analytics` | Individual host analytics | none | host analytics |
| GET | `/api/admin/workspace` | Shared workspace templates | none | templates |
| GET | `/api/admin/proctoring/[roomCode]` | Room intervention data | none | stats, alerts |
| GET | `/api/admin/knowledge-gaps` | Knowledge gap data | none | gaps |

## Organization API Boundary

Assumption: the resource documentation uses Enterprise workflow, Admin, and Organization for the same tenant-management backend area. The current backend keeps the documented `/api/admin/*` endpoint namespace and protects it with `requireAdmin`; the frontend presents these screens as the Organization Console.

Host backend flow:
- Uses `/api/quizzes*`, `/api/questions*`, `/api/rooms*`, `/api/ai/*`, `/api/leaderboard/*`, and CSV export endpoints.
- Requires `requireHost` for authenticated host operations.
- Allows admins through host endpoints only where service authorization explicitly supports admin access.

Organization backend flow:
- Uses `/api/admin/overview`, `/api/admin/users`, `/api/admin/host-passes`, `/api/admin/ai-usage`, `/api/admin/analytics`, reports, settings, workspace, proctoring, and knowledge gap endpoints.
- Requires the Django organization-admin or Super Admin permission guard, depending on the route family.
- Reads organization-wide data from PostgreSQL through Prisma on the Next side and unmanaged Django models on the Python side.
- Does not store frontend BYOK Gemini keys.

Organization UI data mapping:
| Organization Screen | Endpoint / Source | Backend Status |
|---|---|---|
| Organization overview | `/api/admin/overview` | Read summary/activity implemented |
| Host user management | `/api/admin/users` | Read list implemented |
| Invite user flow | `/api/admin/users/invite` | Invite create implemented |
| Host pass inventory | `/api/admin/host-passes` | List/create implemented; assign/extend/revoke actions pending |
| Organization settings | `/api/admin/organization-settings` | Read/update implemented |
| Organization analytics | `/api/admin/analytics` | Backend-derived summary/report data implemented |
| Detailed reports | `/api/admin/analytics/reports` | Backend-derived report rows implemented |
| Individual host analytics | `/api/admin/users/[userId]/analytics` | Backend-derived host analytics implemented |
| AI usage audit | `/api/admin/ai-usage` | Read list implemented |
| Department workspace | `/api/admin/workspace` | Backend-derived templates implemented |
| Proctoring/intervention | `/api/admin/proctoring/[roomCode]` | Room-derived stats/alerts implemented |
| Knowledge gap reports | `/api/admin/knowledge-gaps` | Answer-derived gaps implemented |

## Authentication
Hosts and admins authenticate through the existing auth API. New registered users are hosts by default. Admin/super users can be created by promoting a user in PostgreSQL or by running the documented seed script. Participants do not need accounts and join a room by code/name.

## Frontend Integration
Implemented frontend screens use relative `/api/*` calls from `frontend/`. The supported deployment sets `USE_DJANGO_API="true"`; `frontend/next.config.mjs` proxies those requests to `DJANGO_API_URL`. Production builds require `DJANGO_API_URL`.

API-connected flows supported by Django:
- Auth register/login/logout/me
- Quiz create/list/detail/update/archive
- Question add/update/delete
- Room create/join/start/pause/next/end
- Participant answer submission and scoring
- Leaderboard and CSV export
- AI generation JSON save, generation load, and draft publish
- Admin overview, users, host passes, AI usage, analytics summaries

Host and organization UI screens now read backend `/api/*` data. `src/lib/ui-data.ts` is limited to public landing/pricing content.

## BYOK Gemini
Gemini API keys are entered in the frontend. Multiple keys can be used for fallback. If the user chooses to remember keys, they are stored only in that browser's localStorage. The Quick AI Gen route does not send Gemini keys, raw generated JSON, validation errors, or repair logs to the backend.

Strict flow:
1. Browser calls Gemini with the selected user key.
2. Browser validates generated JSON against the supported single-correct MCQ schema.
3. If invalid, browser repairs with Gemini using the user's key and validates again.
4. Browser repeats repair until errors are zero or the repair limit is reached.
5. Browser maps valid questions to the existing manual question payload.
6. Backend receives only final accepted payloads through `/api/quizzes/[quizId]/questions` and performs final validation/RBAC before saving.

## Pending Backend Work
- Add richer host pass actions and user status update endpoints.
- Add production-grade realtime transport and deeper analytics rollups.
- Add production realtime transport if polling is not sufficient.
- Add Redis-backed leaderboard/presence caching for production scale.
- Add full Django test suite with database fixtures once Django is the primary backend runtime.
