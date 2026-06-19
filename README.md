# biiQuiz Host

biiQuiz Host is a live quiz hosting platform for educators and institutions. It uses a Next.js frontend, Django/Next API backends, PostgreSQL, Prisma, optional Redis caching, and BYOK Gemini AI question generation.

## Project Structure

```txt
frontend/   Next.js UI and fallback Next API routes
backend/    Django API service
prisma/     Shared Prisma schema and migrations source
resources/  Architecture and implementation docs
```

The frontend can use two backend options:

- Django API service in `backend/`, mapped to the same Prisma/PostgreSQL tables.
- Fallback Next.js API routes in `frontend/src/app/api`.

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
DJANGO_API_URL="http://127.0.0.1:8000"
DJANGO_DEBUG="true"
DJANGO_ALLOWED_HOSTS="localhost,127.0.0.1"
```

`REDIS_URL` is optional for basic local development. PostgreSQL is required.

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

## Optional Django Backend

Use this when you want the frontend `/api/*` calls to be served by Python Django instead of the fallback Next.js API routes. This is the recommended integrated mode for the current project structure.

Install and check the Django backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py check
python manage.py seed_test_users
python manage.py runserver 127.0.0.1:8000
```

In the root `.env`, enable the Django proxy:

```txt
USE_DJANGO_API="true"
DJANGO_API_URL="http://127.0.0.1:8000"
```

Then restart the Next.js frontend:

```bash
npm run dev
```

The Next.js app will proxy `/api/*` to Django before local Next API routes. Prisma still owns migrations and the database schema; Django models are unmanaged and validate against `prisma/schema.prisma`.

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
- `admin`: app super user for admin pages and Host Pass management

Participants do not need accounts.

### Create a Host User

Start the app:

```bash
npm run dev
```

Open:

[http://localhost:3000/register](http://localhost:3000/register)

Create an account with your name, email, and password. New registered users are created with the `host` role by default.

### Create an Admin / Super User

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

Admin pages are available from:

[http://localhost:3000/admin](http://localhost:3000/admin)

This creates an app-level super user. It is different from a PostgreSQL database superuser.

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
| `npm run build` | Generate Prisma Client and build the app. |
| `npm run start` | Start the production server after `npm run build`. |
| `npm run lint` | Run Next.js linting. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm run prisma:generate` | Generate Prisma Client. |
| `npm run prisma:migrate` | Run Prisma migrations locally. |
| `npm run prisma:studio` | Open Prisma Studio. |
| `npm run seed:test-users` | Create 10 demo users and seeded app data. |
| `npm test` | Run Vitest tests. |
| `npm run backend:check` | Validate the Django backend from the root wrapper. |
| `npm run backend:seed` | Seed Django test users from the root wrapper. |
| `npm run backend:dev` | Run the Django API server on port 8000. |

## Django Scripts

Run from `backend/` after activating the virtual environment:

| Command | Purpose |
| --- | --- |
| `python manage.py check` | Validate Django settings, models, and URL configuration. |
| `python manage.py seed_test_users` | Create 10 demo users and seeded app data through Django. |
| `python manage.py runserver 127.0.0.1:8000` | Start the Django API server. |

## BYOK Gemini AI

AI question generation uses a bring-your-own-key flow:

- Users enter their Gemini API keys in the frontend.
- Multiple user-provided keys can be used for fallback.
- The backend never stores Gemini API keys.
- `NEXT_PUBLIC_GEMINI_MODEL` controls the Gemini model name used by the frontend.
- Generated JSON is first saved to the backend as raw JSON.
- The backend validates the JSON and creates draft questions only when valid.
- If validation fails, the frontend can repair the saved JSON with the user's Gemini key and resubmit it.
- Publishing is blocked until backend validation passes and valid draft rows exist.

Manual real-key smoke test:

1. Log in as a host.
2. Create or open a quiz.
3. Open AI generation and enter one or more Gemini keys.
4. Generate questions, repair if validation errors appear, then publish.
5. Confirm the quiz editor shows real questions and no Gemini key appears in database records or logs.

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
