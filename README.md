# biiQuiz Host

biiQuiz Host is a live quiz hosting platform for educators and institutions. It uses a Next.js frontend, a Django API backend, PostgreSQL, Prisma-managed backend migrations, and BYOK Gemini AI question generation.

## Project Structure

```txt
frontend/   Next.js UI, deployable without Docker
backend/    Django API, backend-owned Prisma schema, migrations, and Docker deployment
resources/  Architecture and implementation docs
```

Prisma lives at `backend/prisma/` because it defines and migrates the backend database. Django maps those tables with unmanaged models. The Next.js frontend reaches Django through its `/api/*` rewrite and does not own database migrations.

## Prerequisites

- Node.js and npm
- PostgreSQL
- Redis, optional for local development

## Local Setup

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Update these values in `.env`:

```txt
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/biiquiz"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/biiquiz"
AUTH_SECRET="replace-with-a-long-random-secret"
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_GEMINI_MODEL="gemini-2.5-flash"
LOG_LEVEL="info"
USE_DJANGO_API="true"
DJANGO_API_URL="http://127.0.0.1:8765"
DJANGO_DEBUG="true"
DJANGO_ALLOWED_HOSTS="localhost,127.0.0.1"
DJANGO_SECURE_SSL_REDIRECT="false"
DJANGO_SECURE_HSTS_SECONDS="0"
APP_BASE_URL="http://localhost:3000"
EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_HOST_USER="your-gmail@gmail.com"
EMAIL_HOST_PASSWORD="your-google-app-password"
EMAIL_USE_TLS="true"
DEFAULT_FROM_EMAIL="your-gmail@gmail.com"
PASSWORD_RESET_OTP_MINUTES="10"
```

`REDIS_URL` is optional for basic local development. PostgreSQL is required.

Password reset uses a 6-digit OTP that expires after `PASSWORD_RESET_OTP_MINUTES`. For Gmail SMTP, enable 2-Step Verification on the Google account, create a Google App Password, and use that app password as `EMAIL_HOST_PASSWORD`. Do not use your normal Gmail password. Keep `DEFAULT_FROM_EMAIL` the same as `EMAIL_HOST_USER` unless you have configured and verified a custom sender/domain alias.

After changing email settings, restart the Django backend and smoke-test SMTP:

```bash
cd backend
./env/bin/python manage.py send_test_email --to your-email@gmail.com
```

If you see the full email printed in the terminal instead of receiving it, `EMAIL_BACKEND` is still set to the console backend.

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run prisma:migrate
```

Start the development server:

```bash
npm run dev
```

Open the app:

[http://localhost:3000](http://localhost:3000)

## Django Backend

The frontend `/api/*` calls are served by the Django backend.

Install and check the Django backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py check
python manage.py seed_test_users
python manage.py runserver 127.0.0.1:8765
```

In the root `.env`, enable the Django proxy:

```txt
USE_DJANGO_API="true"
DJANGO_API_URL="http://127.0.0.1:8765"
```

Then restart the Next.js frontend:

```bash
npm run dev
```

The Next.js app proxies `/api/*` to Django. Prisma owns backend migrations at `backend/prisma/`; Django models are unmanaged and validate against `backend/prisma/schema.prisma`.

For daily development with Django integration, run two terminals:

```bash
npm run backend:dev
```

```bash
npm run dev
```

## Create Users

The app has two authenticated roles:

- `host`: normal educator account
- `admin`: organization admin or platform Super Admin depending on organization assignment

Participants do not need accounts.

### Default Super Admin

A platform Super Admin can access the full Super Admin console. The account must have `role = 'admin'` and no organization assigned.

Created local Super Admin:

```txt
Email: super.admin@biiquiz.com
Password: SuperAdmin@12345
```

Login:

[http://localhost:3000/login](http://localhost:3000/login)

Super Admin console:

[http://localhost:3000/super-admin/dashboard](http://localhost:3000/super-admin/dashboard)

### Create a Host User

Start the app:

```bash
npm run dev
```

Open:

[http://localhost:3000/register](http://localhost:3000/register)

Create an account with your name, email, and password. New registered users are created with the `host` role by default.

### Create an Organization Admin

First create a normal host user from the register page. Then promote that user to `admin` in PostgreSQL:

```bash
psql "$DATABASE_URL"
```

Inside `psql`, run:

```sql
update users
set role = 'admin'
where email = 'admin@example.com';
```

Replace `admin@example.com` with the email you registered.

Confirm the role:

```sql
select id, name, email, role, is_active
from users
where email = 'admin@example.com';
```

Exit `psql`:

```sql
\q
```

Now log in at:

[http://localhost:3000/login](http://localhost:3000/login)

Organization admin pages are available from:

[http://localhost:3000/admin](http://localhost:3000/admin)

This creates an application admin. To make the user a platform Super Admin for `/super-admin/*`, make sure `organization_id` is `NULL`:

```sql
update users
set role = 'admin',
    organization_id = null
where email = 'admin@example.com';
```

This is different from a PostgreSQL database superuser.

### Create Demo Users

After running migrations, create test accounts from the terminal:

```bash
npm run seed:test-users
```

The command is safe to run multiple times. It updates the same test users and seeded app data if they already exist.

Default test password:

```txt
Test@12345
```

Created accounts:

| Account | Email | Role | Organization |
| --- | --- | --- | --- |
| Personal Host One | `personal.host1@example.com` | `host` | No organization |
| Personal Host Two | `personal.host2@example.com` | `host` | No organization |
| School Admin | `school.admin@example.com` | `admin` | biiQuiz School Demo |
| School Host One | `school.host1@example.com` | `host` | biiQuiz School Demo |
| School Host Two | `school.host2@example.com` | `host` | biiQuiz School Demo |
| Enterprise Admin | `enterprise.admin@example.com` | `admin` | biiQuiz Enterprise Demo |
| Enterprise Host One | `enterprise.host1@example.com` | `host` | biiQuiz Enterprise Demo |
| Enterprise Host Two | `enterprise.host2@example.com` | `host` | biiQuiz Enterprise Demo |
| Training Admin | `training.admin@example.com` | `admin` | biiQuiz Training Demo |
| Training Host One | `training.host1@example.com` | `host` | biiQuiz Training Demo |

To use a different password for all test users:

```bash
TEST_USER_PASSWORD="YourStrongPassword123!" npm run seed:test-users
```

## Verification

Run TypeScript checks:

```bash
npm run typecheck
```

Run tests:

```bash
npm test
```

Build for production:

```bash
npm run build
```

Start the production build:

```bash
npm run start
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Build the Next.js frontend. |
| `npm run start` | Start the production server after `npm run build`. |
| `npm run lint` | Run Next.js linting. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm run prisma:generate` | Generate Prisma Client. |
| `npm run prisma:migrate` | Run Prisma migrations locally. |
| `npm run prisma:deploy` | Apply committed Prisma migrations non-interactively. |
| `npm run prisma:studio` | Open Prisma Studio. |
| `npm run seed:test-users` | Create 10 demo users and seeded app data. |
| `npm test` | Run Vitest tests. |
| `npm run backend:check` | Validate the Django backend from the root wrapper. |
| `npm run backend:seed` | Seed Django test users from the root wrapper. |
| `npm run backend:verify-super-admin` | Verify all Super Admin database payloads and normalized relationships. |
| `npm run backend:dev` | Run the Django API server on private port 8765. |

## Django Scripts

Run from `backend/` after activating the virtual environment:

| Command | Purpose |
| --- | --- |
| `python manage.py check` | Validate Django settings, models, and URL configuration. |
| `python manage.py seed_test_users` | Create 10 demo users and seeded app data through Django. |
| `python manage.py verify_super_admin_data` | Smoke-test every Super Admin module against PostgreSQL. |

Seeded organizations are stored as sample tenants. Super Admin lists hide them by default; enable **Include samples** in a filter bar when testing seeded users and data. Production startup never runs the seed command automatically.

| `python manage.py runserver 127.0.0.1:8765` | Start the Django API server. |

## Backend Docker Deployment

The backend image contains Django/Gunicorn. A separate one-shot Docker target applies Prisma migrations before the API starts.

```bash
cd backend
cp .env.docker.example .env
# Replace every placeholder secret/domain in .env.
docker compose up --build -d
docker compose ps
curl http://127.0.0.1:8765/api/health
```

For production, terminate TLS at your reverse proxy, keep PostgreSQL private, and set `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, `APP_BASE_URL`, and SMTP values to real domains. See [deployment.md](deployment.md) for the Gunicorn, systemd, Nginx, TLS, backup, and maintenance runbook for `host.biiquiz.com` and `hostapi.biiquiz.com`.

## Frontend Hosting

The frontend does not require Docker. Deploy `frontend/` with Node.js (Vercel, Render, Netlify, or a Node host) and set:

```txt
USE_DJANGO_API=true
DJANGO_API_URL=https://hostapi.biiquiz.com
NEXT_PUBLIC_APP_URL=https://host.biiquiz.com
NEXT_PUBLIC_GEMINI_MODEL=gemini-2.5-flash
```

Then run `npm install`, `npm run build`, and `npm run start` from `frontend/`.

## BYOK Gemini AI

AI question generation uses a bring-your-own-key flow:

- Users enter their Gemini API keys in the frontend.
- Multiple user-provided keys can be used for fallback.
- The backend never stores Gemini API keys.
- `NEXT_PUBLIC_GEMINI_MODEL` controls the Gemini model name used by the frontend.
- Quick AI Gen keeps raw generated JSON, validation errors, and repair attempts in browser session state only.
- The frontend repairs invalid JSON with Gemini until validation passes or the repair limit is reached.
- Only final accepted MCQ question payloads are sent to `/api/quizzes/[quizId]/questions`.
- The backend still performs final validation and permission checks before saving questions.

Manual real-key smoke test:

1. Log in as a host.
2. Create or open a quiz.
3. Open AI generation and enter one or more Gemini keys.
4. Generate questions, repair if validation errors appear, then apply valid questions to the quiz.
5. Confirm saved questions appear in the quiz editor flow and no Gemini key, raw JSON, or repair log appears in database records.

## Troubleshooting

**Database connection errors**

Confirm PostgreSQL is running and `DATABASE_URL` / `DIRECT_URL` in `.env` point to an existing database.

**Prisma Client errors**

Run:

```bash
npm run prisma:generate
```

If the schema changed, run:

```bash
npm run prisma:migrate
```

**Port already in use**

Run the dev server on a different port:

```bash
npm run dev -- --port 3001
```

**Redis unavailable**

Redis is optional for basic local development. Cache, presence, rate-limit, and realtime coordination features need Redis for production-like behavior.
