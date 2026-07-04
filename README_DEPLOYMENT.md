# Host BiiQuiz Deployment

## Architecture

Production traffic enters through Nginx on the VPS. Nginx routes `https://host.biiquiz.com/` to the frontend container on `127.0.0.1:3000` and routes `https://host.biiquiz.com/api/` to the Django backend container on `127.0.0.1:8765`. Redis is internal to Docker Compose and is not published to the public internet.

GitHub Actions builds and pushes these images to GHCR:

- `ghcr.io/<OWNER>/host-biiquiz-frontend:latest`
- `ghcr.io/<OWNER>/host-biiquiz-frontend:<COMMIT_SHA>`
- `ghcr.io/<OWNER>/host-biiquiz-backend:latest`
- `ghcr.io/<OWNER>/host-biiquiz-backend:<COMMIT_SHA>`

The server does not build images. It only pulls images, refreshes containers, runs migrations and static collection, tests Nginx, restarts Nginx, and prunes unused images safely.

## Server Environment Files

Keep production secrets on the server. Do not commit real production `.env.production` files.

Expected server files:

```text
/home/nepgiftuser/projects/host.biiquiz/host.biiquiz.com/frontend/.env.production
/home/nepgiftuser/projects/host.biiquiz/host.biiquiz.com/backend/.env.production
```

Frontend production env:

```env
NEXT_PUBLIC_API_URL=/api
REDIS_URL=redis://redis:6379/0
```

Backend production env should include the app's current Django variable names:

```env
DJANGO_DEBUG=false
AUTH_SECRET=<server-secret>
DJANGO_ALLOWED_HOSTS=host.biiquiz.com,127.0.0.1,localhost
DJANGO_CSRF_TRUSTED_ORIGINS=https://host.biiquiz.com
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
```

Use managed PostgreSQL through `DATABASE_URL` unless the server is intentionally configured with a protected local Postgres service and named Docker volume.

## Manual Deployment

Run this on the server:

```bash
cd /home/nepgiftuser/projects/host.biiquiz/host.biiquiz.com
bash deploy.sh
```

## GitHub Deployment

Push to the `main` branch.

GitHub Actions will:

```text
lint frontend
build frontend
lint backend
run Django check
build Docker images
push images to GHCR
SSH to the server
run deploy.sh
```

Required GitHub secrets:

```text
SERVER_HOST
SERVER_USER
SERVER_SSH_KEY
GHCR_USERNAME
GHCR_TOKEN
```

`GHCR_TOKEN` must be a GitHub token with `read:packages` permission so the VPS can pull private GHCR images. `GHCR_USERNAME` is normally `basan-ta`.

The workflow uploads the latest deployment files before SSH deploy:

```text
deploy.sh -> /home/nepgiftuser/projects/host.biiquiz/host.biiquiz.com/deploy.sh
docker-compose.prod.yml -> /home/nepgiftuser/projects/host.biiquiz/host.biiquiz.com/docker-compose.prod.yml
```

Then it logs in to GHCR on the VPS and runs:

```bash
cd /home/nepgiftuser/projects/host.biiquiz/host.biiquiz.com
chmod +x deploy.sh
GHCR_OWNER=basan-ta IMAGE_TAG=latest bash deploy.sh
```

## Local Validation

The ignored local env files are:

```text
.env.local
backend/.env.local
frontend/.env.local
```

Start a local PostgreSQL database that matches `backend/.env.local`, or edit `DATABASE_URL` there to point at your local/managed development database. Then run:

```bash
cd host.biiquiz/backend
scripts/python.sh manage.py check
DJANGO_SETTINGS_MODULE=biiquiz_api.settings scripts/python.sh - <<'PY'
import django
from django.db import connection
django.setup()
with connection.cursor() as cursor:
    cursor.execute("SELECT 1")
    print(cursor.fetchone()[0])
PY
scripts/python.sh manage.py runserver 127.0.0.1:8765
```

In another terminal:

```bash
cd host.biiquiz/frontend
npm ci
npm run lint --if-present
npm run build
npm run dev
```

Health checks:

```bash
curl -I http://127.0.0.1:8765/api/health
curl -I http://127.0.0.1:3000
```

If the DB check fails with `Connection refused`, local PostgreSQL is not running or `DATABASE_URL` points to the wrong host/port.

## Safe Cleanup

These cleanup commands are safe because they do not delete volumes or database data:

```bash
docker image prune -f
docker builder prune -f
```

## Dangerous Commands To Avoid

Never run these during deployment:

```bash
docker compose down -v
docker system prune -a --volumes
docker volume prune
rm -rf /var/lib/postgresql
```

## Rollback

Find the previous commit SHA from GitHub Actions, then edit `docker-compose.prod.yml` on the server or export `IMAGE_TAG` before running Compose.

Temporary rollback with an environment variable:

```bash
cd /home/nepgiftuser/projects/host.biiquiz/host.biiquiz.com
IMAGE_TAG=<OLD_COMMIT_SHA> docker compose -f docker-compose.prod.yml pull
IMAGE_TAG=<OLD_COMMIT_SHA> docker compose -f docker-compose.prod.yml up -d --remove-orphans
sudo nginx -t
sudo systemctl restart nginx
```

Permanent rollback:

```bash
cd /home/nepgiftuser/projects/host.biiquiz/host.biiquiz.com
perl -0pi -e 's/:\\$\\{IMAGE_TAG:-latest\\}/:<OLD_COMMIT_SHA>/g' docker-compose.prod.yml
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans
sudo nginx -t
sudo systemctl restart nginx
```

## Logs And Debugging

```bash
docker ps
docker compose -f docker-compose.prod.yml ps
docker logs host-biiquiz-frontend
docker logs host-biiquiz-backend
docker logs host-biiquiz-redis
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo journalctl -u nginx -n 100 --no-pager
curl -I https://host.biiquiz.com
curl -I https://host.biiquiz.com/api/health
curl -fsS http://127.0.0.1:3000 >/dev/null
curl -fsS http://127.0.0.1:8765/api/health/ || curl -fsS http://127.0.0.1:8765/api/health
```

## Common Errors And Fixes

`pull access denied` or `unauthorized`: make the GHCR package public, or log in on the server with a token that has package read access.

`env file not found`: create `frontend/.env.production` and `backend/.env.production` on the server. Keep real secrets out of Git.

`DATABASE_URL must be configured`: add a production PostgreSQL URL to `backend/.env.production`.

`AUTH_SECRET must be configured`: add a long random `AUTH_SECRET` to `backend/.env.production`.

`Invalid production DATABASE_URL`: replace placeholders and do not use `localhost` or `127.0.0.1` inside Docker production unless you have intentionally added a Docker database service. Prefer a managed PostgreSQL URL.

`pull access denied` or `not found`: confirm the workflow pushed both `ghcr.io/<owner>/host-biiquiz-frontend:latest` and `ghcr.io/<owner>/host-biiquiz-backend:latest`, then check `GHCR_USERNAME` and `GHCR_TOKEN` in GitHub secrets.

`port is already allocated`: find the owner with `sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "3000|8765"`. Stop only the conflicting app container, never database containers or volumes.

`nginx -t` fails: fix the Nginx config before restarting. The deploy script stops before `systemctl restart nginx` when the config test fails.

Shared Nginx source of truth is the server site config copied from the workspace root `nginx.conf`. The `host.biiquiz.com` block must proxy `/` to `127.0.0.1:3000` and `/api/`, `/admin/`, `/static/`, `/media/` to `127.0.0.1:8765`.

`/api/health/` returns 404 but `/api/health` works: Host BiiQuiz currently defines `path("health", views.health)`, so `/api/health` is the canonical endpoint. The deploy script accepts both forms.
