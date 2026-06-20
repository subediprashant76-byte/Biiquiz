# biiQuiz Host Deployment and Operations

## Production Topology

- Frontend: `https://host.biiquiz.com`
- Django API: `https://hostapi.biiquiz.com`
- Gunicorn: `127.0.0.1:8765`
- Nginx: public ports `80` and `443`
- PostgreSQL: local/private network only
- Prisma schema and migrations: `backend/prisma/`

Port `8765` is intentionally used instead of `8000` because another service may already use the common application ports. Gunicorn must bind to loopback only; Nginx is the public entry point.

## Why the `db` Error Occurred

`db` is the PostgreSQL service name inside `backend/docker-compose.yml`. Docker provides DNS for that name only to containers on the Compose network. A host command such as `python manage.py migrate` cannot resolve it.

Configuration is now separated:

- Host development uses root `.env` defaults with optional `backend/.env.local` overrides.
- Docker Compose reads `backend/.env` and injects the container-only `db` URL.
- Bare-metal production uses `/etc/biiquiz/host-api.env` through systemd.

Exported process and systemd variables always take precedence over repository environment files, so local files cannot replace production secrets.

For host execution, use `127.0.0.1` or the actual database hostname, never `db`.

## DNS

Create DNS records before requesting certificates:

```txt
host.biiquiz.com     A/AAAA  <frontend server or platform>
hostapi.biiquiz.com  A/AAAA  <backend server>
```

Confirm:

```bash
dig +short host.biiquiz.com
dig +short hostapi.biiquiz.com
```

## Server Installation

The commands below assume Ubuntu/Debian and `/srv/biiquiz` as the checkout path.

```bash
sudo apt update
sudo apt install -y nginx postgresql-client python3 python3-venv nodejs npm certbot python3-certbot-nginx
sudo useradd --system --create-home --shell /usr/sbin/nologin biiquiz || true
sudo mkdir -p /srv/biiquiz /etc/biiquiz /var/www/certbot
sudo chown -R biiquiz:www-data /srv/biiquiz
```

Clone or copy the repository into `/srv/biiquiz`, then install dependencies:

```bash
cd /srv/biiquiz
sudo -u biiquiz npm ci
sudo -u biiquiz python3 -m venv backend/.venv
sudo -u biiquiz backend/.venv/bin/pip install -r backend/requirements.txt
```

## Production Environment

```bash
sudo cp backend/deploy/host-api.env.example /etc/biiquiz/host-api.env
sudo chmod 600 /etc/biiquiz/host-api.env
sudo chown root:root /etc/biiquiz/host-api.env
sudo editor /etc/biiquiz/host-api.env
```

Required values:

```txt
DATABASE_URL=postgresql://...@127.0.0.1:5432/biiquiz?sslmode=prefer
DIRECT_URL=postgresql://...@127.0.0.1:5432/biiquiz?sslmode=prefer
AUTH_SECRET=<long random value>
DJANGO_ALLOWED_HOSTS=hostapi.biiquiz.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://host.biiquiz.com,https://hostapi.biiquiz.com
DJANGO_SECURE_SSL_REDIRECT=true
DJANGO_SECURE_HSTS_SECONDS=31536000
APP_BASE_URL=https://host.biiquiz.com
GUNICORN_BIND=127.0.0.1:8765
```

Generate an application secret with `openssl rand -hex 64`. Do not commit production environment files. Enable the one-year HSTS value only after HTTPS is working correctly; browsers remember HSTS until it expires.

## Database Migration

Prisma is the schema authority. Do not use `python manage.py migrate` for application tables.

```bash
cd /srv/biiquiz
set -a
. /etc/biiquiz/host-api.env
set +a
npm run prisma:deploy
backend/.venv/bin/python backend/manage.py check --deploy
```

Create a backup before every migration:

```bash
mkdir -p /srv/backups/biiquiz
pg_dump "$DATABASE_URL" --format=custom --file="/srv/backups/biiquiz/biiquiz-$(date +%F-%H%M%S).dump"
```

## Gunicorn and systemd

Install the service template:

```bash
sudo cp backend/deploy/systemd/biiquiz-host-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now biiquiz-host-api
sudo systemctl status biiquiz-host-api
```

Confirm the private port is available and listening:

```bash
sudo ss -ltnp | grep ':8765'
curl -H 'Host: hostapi.biiquiz.com' -H 'X-Forwarded-Proto: https' http://127.0.0.1:8765/api/health
```

If `8765` is occupied, choose another loopback port in `/etc/biiquiz/host-api.env` and update both Nginx templates before restarting.

## Nginx and TLS

Start with the HTTP bootstrap configuration:

```bash
sudo cp backend/deploy/nginx/hostapi.biiquiz.com.bootstrap.conf /etc/nginx/sites-available/hostapi.biiquiz.com
sudo ln -sfn /etc/nginx/sites-available/hostapi.biiquiz.com /etc/nginx/sites-enabled/hostapi.biiquiz.com
sudo nginx -t
sudo systemctl reload nginx
curl http://hostapi.biiquiz.com/api/health
```

Request the certificate:

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d hostapi.biiquiz.com
```

Enable the final TLS configuration:

```bash
sudo cp backend/deploy/nginx/hostapi.biiquiz.com.conf /etc/nginx/sites-available/hostapi.biiquiz.com
sudo nginx -t
sudo systemctl reload nginx
curl https://hostapi.biiquiz.com/api/health
sudo certbot renew --dry-run
```

Do not change or disable an existing Nginx site. Each hosted service should have its own `server_name` and private upstream port.

## Frontend Deployment

Set these values on the frontend host:

```txt
USE_DJANGO_API=true
DJANGO_API_URL=https://hostapi.biiquiz.com
NEXT_PUBLIC_APP_URL=https://host.biiquiz.com
NEXT_PUBLIC_GEMINI_MODEL=gemini-2.5-flash
```

Build and restart the frontend using the hosting provider's Node workflow:

```bash
npm ci
npm run build
npm run start
```

Verify login, profile, quiz creation, room join, answers, leaderboard, organization admin, and Super Admin flows through `https://host.biiquiz.com`.

## Docker Alternative

Docker Compose binds the API to `127.0.0.1:8765` and uses `db` only inside Docker:

```bash
cd /srv/biiquiz/backend
cp .env.docker.example .env
editor .env
docker compose up --build -d
docker compose ps
curl -H 'Host: hostapi.biiquiz.com' -H 'X-Forwarded-Proto: https' http://127.0.0.1:8765/api/health
```

The container health check also sends these proxy headers, so Django's production HTTPS redirect does not turn the internal health probe into an invalid TLS request.

Use either systemd Gunicorn with an external PostgreSQL server or Docker Compose, not both for the same backend instance.

## Routine Deployment

```bash
cd /srv/biiquiz
git fetch --all --prune
git pull --ff-only
npm ci
backend/.venv/bin/pip install -r backend/requirements.txt
pg_dump "$DATABASE_URL" --format=custom --file="/srv/backups/biiquiz/predeploy-$(date +%F-%H%M%S).dump"
npm run prisma:deploy
backend/.venv/bin/python backend/manage.py check --deploy
sudo systemctl restart biiquiz-host-api
curl --fail https://hostapi.biiquiz.com/api/health
```

## Monitoring and Logs

```bash
sudo systemctl status biiquiz-host-api
sudo journalctl -u biiquiz-host-api -f
sudo tail -f /var/log/nginx/hostapi.biiquiz.com.access.log
sudo tail -f /var/log/nginx/hostapi.biiquiz.com.error.log
curl --fail https://hostapi.biiquiz.com/api/health
df -h
free -h
```

Monitor HTTP 5xx rates, PostgreSQL connections, disk space, response latency, failed logins, SMTP failures, and certificate expiry.

## Backup and Restore

Keep encrypted backups outside the application server and test restores regularly.

```bash
pg_dump "$DATABASE_URL" --format=custom --file=biiquiz.dump
createdb biiquiz_restore_test
pg_restore --clean --if-exists --no-owner --dbname=biiquiz_restore_test biiquiz.dump
```

Never test a restore directly against the production database.

## Rollback

1. Put the frontend into maintenance mode or stop writes.
2. Restore the previous application release.
3. Restart `biiquiz-host-api`.
4. Restore the pre-deployment database backup only when the migration is incompatible and after confirming the data-loss impact.
5. Re-run health and critical-flow checks.

Prisma migrations are forward-oriented; do not manually delete rows from `_prisma_migrations`.

## Troubleshooting

### `failed to resolve host 'db'`

The command is running outside Docker with a Docker-only URL. Move local overrides to `backend/.env.local`, or export a host-reachable URL:

```bash
cp backend/.env.local.example backend/.env.local
editor backend/.env.local
npm run prisma:deploy
npm run backend:check
```

Keep `backend/.env` for Docker Compose only.

### Port already in use

```bash
sudo ss -ltnp | grep ':8765'
```

Change `GUNICORN_BIND` and the Nginx `proxy_pass` together. Never bind Gunicorn publicly to `0.0.0.0` in a bare-metal Nginx deployment.

### Nginx returns 502

Check Gunicorn and its private port:

```bash
sudo systemctl status biiquiz-host-api
sudo journalctl -u biiquiz-host-api -n 200 --no-pager
curl -v -H 'Host: hostapi.biiquiz.com' -H 'X-Forwarded-Proto: https' http://127.0.0.1:8765/api/health
```

### Database unavailable

Check the URL, PostgreSQL service, firewall, credentials, and SSL mode. The health endpoint returns HTTP 503 while PostgreSQL is unavailable.
