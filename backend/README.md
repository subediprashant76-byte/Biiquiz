# biiQuiz Django API

This folder contains the Django API backend for the biiQuiz frontend in `../frontend`. It mirrors the existing `/api/...` route contract and maps Django models to the PostgreSQL tables created from `../prisma/schema.prisma`.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py check
python manage.py seed_test_users
python manage.py runserver 127.0.0.1:8000
```

The backend reads the root `.env` file. PostgreSQL must already exist and be migrated by Prisma:

```bash
cd ..
npm run prisma:migrate
```

## Connect the Next.js frontend

In the root `.env`, set:

```txt
USE_DJANGO_API="true"
DJANGO_API_URL="http://127.0.0.1:8000"
```

Then restart Next:

```bash
npm run dev
```

Next.js proxies `/api/*` to Django before the fallback Next API routes in `frontend/src/app/api`.

## Prisma Contract

Django models are unmanaged (`managed = False`) and use Prisma table names such as `users`, `quizzes`, `rooms`, and `answers`. The API runs a Prisma contract guard that reads `../prisma/schema.prisma` and verifies the required tables/enums are still present.

Prisma remains responsible for migrations. Django is responsible for serving API behavior.

## Implemented API Modules

- Auth: register, login, logout, me
- Quizzes and questions
- Live rooms: create, join, start, pause, next question, end
- Participant answers and scoring
- Leaderboard and CSV export
- Strict AI JSON save, validation, repair, draft preview, and publish
- Host dashboard, analytics, and host pass availability
- Organization overview, users, invites, settings, host passes, AI usage, analytics, reports, workspace, proctoring, and knowledge gaps

## Demo Data

`python manage.py seed_test_users` creates 10 accounts across personal, school, enterprise, and training contexts. The default password is `Test@12345`, or set `TEST_USER_PASSWORD` before running the command.

The seed also creates sample quizzes, questions, rooms, participants, answers, Host Passes, AI usage logs, organization stats, and audit logs so frontend screens render backend data instead of fixtures.

## BYOK Gemini

Gemini keys are still entered and used in the frontend. Django never stores Gemini API keys.

Strict flow:

1. Frontend calls Gemini with one or more user-provided keys.
2. Frontend posts generated JSON to `/api/ai/generate-questions`.
3. Django stores raw JSON, validates it, and creates draft rows only if valid.
4. If invalid, frontend repairs with Gemini and posts to `/api/ai/repair-questions`.
5. Django stores repaired JSON, validation errors, and attempt count.
6. Publish is allowed only after backend validation passes.
