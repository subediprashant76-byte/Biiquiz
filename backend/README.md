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
python manage.py verify_super_admin_data
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

The seed also creates sample quizzes, questions, rooms, participants, answers, Host Passes, subscriptions, domains, payments, upgrade requests, support tickets, AI usage logs, organization stats, and audit logs. Seeded organizations are marked `is_sample=true` and are hidden from Super Admin lists unless `includeSamples=true` is requested.

## BYOK Gemini

Gemini keys are still entered and used in the frontend. Django never stores Gemini API keys.

Strict flow:

1. Frontend calls Gemini with one or more user-provided keys.
2. Frontend keeps raw generated JSON, validation errors, and repair attempts in browser session state only.
3. Frontend repairs invalid JSON with Gemini until validation passes or the repair limit is reached.
4. Frontend maps valid single-correct MCQs to the existing question payload.
5. Django receives only final accepted payloads through `/api/quizzes/<quiz_id>/questions`.
6. Django performs final validation, RBAC, and tenant checks before saving.
