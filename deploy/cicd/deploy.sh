#!/usr/bin/env bash
set -euo pipefail

# Manual production deployment helper for bequest.com / biiQuiz Host.
# This file is optional. GitHub Actions uses the same logic over SSH.

APP_DIR="/home/nepgiftuser/host.biiquiz.com"
COMPOSE_PROJECT_NAME="hostbiiquizcom"
COMPOSE_FILE="$APP_DIR/docker-compose.cicd.yml"
BACKUP_DIR="/srv/backups/biiquiz"

if [ -z "${IMAGE_PREFIX:-}" ] || [ -z "${IMAGE_TAG:-}" ]; then
  echo "Usage:"
  echo "  IMAGE_PREFIX=ghcr.io/OWNER/REPO IMAGE_TAG=COMMIT_SHA bash deploy/cicd/deploy.sh"
  exit 1
fi

cd "$APP_DIR"

cat > "$COMPOSE_FILE" <<EOF
services:
  db:
    image: postgres:16
    restart: unless-stopped
    env_file:
      - /etc/biiquiz/host-api.env
    volumes:
      - biiquiz_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \$\$POSTGRES_USER -d \$\$POSTGRES_DB"]
      interval: 10s
      timeout: 5s
      retries: 10

  migrate:
    image: ${IMAGE_PREFIX}-migrate:${IMAGE_TAG}
    env_file:
      - /etc/biiquiz/host-api.env
    depends_on:
      db:
        condition: service_healthy
    restart: "no"

  api:
    image: ${IMAGE_PREFIX}-api:${IMAGE_TAG}
    restart: unless-stopped
    env_file:
      - /etc/biiquiz/host-api.env
    environment:
      GUNICORN_BIND: 0.0.0.0:8000
      HEALTHCHECK_HOST: hostapi.biiquiz.com
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "127.0.0.1:8765:8000"

  frontend:
    image: ${IMAGE_PREFIX}-frontend:${IMAGE_TAG}
    restart: unless-stopped
    env_file:
      - /etc/biiquiz/frontend.env
    depends_on:
      - api
    ports:
      - "127.0.0.1:3000:3000"

volumes:
  biiquiz_postgres_data:
    name: hostbiiquizcom_biiquiz_postgres_data
EOF

COMPOSE=(docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE")

"${COMPOSE[@]}" config
"${COMPOSE[@]}" pull
"${COMPOSE[@]}" up -d db

set -a
. /etc/biiquiz/host-api.env
set +a

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/predeploy-${IMAGE_TAG}-$(date +%F-%H%M%S).dump"

"${COMPOSE[@]}" exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom \
  > "$BACKUP_FILE"

echo "Database backup created: $BACKUP_FILE"

"${COMPOSE[@]}" rm -f migrate || true
"${COMPOSE[@]}" run --rm migrate
"${COMPOSE[@]}" up -d api frontend --remove-orphans

curl --fail -H 'Host: hostapi.biiquiz.com' -H 'X-Forwarded-Proto: https' http://127.0.0.1:8765/api/health
curl --fail -I http://127.0.0.1:3000
curl --fail -I https://host.biiquiz.com
curl --fail https://host.biiquiz.com/api/health
curl --fail https://hostapi.biiquiz.com/api/health

docker image prune -f

echo "Deployment completed successfully: $IMAGE_TAG"
