#!/bin/bash
set -euo pipefail

APP_NAME="host-biiquiz"
APP_DIR="/home/nepgiftuser/projects/host.biiquiz/host.biiquiz.com"
COMPOSE_FILE="docker-compose.prod.yml"
BACKEND_ENV_FILE="backend/.env.production"
FRONTEND_ENV_FILE="frontend/.env.production"
PUBLIC_URL="https://host.biiquiz.com"
FRONTEND_PORT="3000"
BACKEND_PORT="8765"
FRONTEND_CONTAINER="host-biiquiz-frontend"
BACKEND_CONTAINER="host-biiquiz-backend"
DOCKER="${DOCKER:-sudo docker}"

echo "========================================"
echo "Refreshing $APP_NAME from Docker registry"
echo "========================================"

cd "$APP_DIR"

GHCR_OWNER="${GHCR_OWNER:-basan-ta}"
GHCR_OWNER="$(printf '%s' "$GHCR_OWNER" | tr '[:upper:]' '[:lower:]')"
IMAGE_TAG="${IMAGE_TAG:-latest}"
export GHCR_OWNER IMAGE_TAG

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempts="${3:-30}"
  local delay="${4:-2}"

  echo "Waiting for ${label}: ${url}"
  for attempt in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null; then
      echo "${label} is healthy"
      return 0
    fi

    echo "${label} is not ready yet (${attempt}/${attempts})"
    sleep "$delay"
  done

  echo "${label} did not become healthy"
  return 1
}

warn_if_public_unreachable() {
  local url="$1"
  local label="$2"

  if curl -I "$url"; then
    echo "${label} is reachable"
  else
    echo "Warning: ${label} is not reachable yet: ${url}"
    echo "Continuing because public DNS/site checks are non-fatal."
  fi
}

check_required_file() {
  local path="$1"
  if [ ! -f "$path" ]; then
    echo "Missing required server-only file: $path"
    echo "Create it on the VPS. Do not commit production secrets."
    exit 1
  fi
}

check_database_url() {
  local env_file="$1"
  local database_url
  database_url="$(grep -E '^DATABASE_URL=' "$env_file" | tail -n 1 | cut -d= -f2- | sed -E 's/^['"'"'"]//; s/['"'"'"]$//' || true)"

  if [ -z "$database_url" ]; then
    echo "Missing DATABASE_URL in $env_file"
    exit 1
  fi

  case "$database_url" in
    *USER*|*PASSWORD*|*HOST*|*DATABASE*|*DBNAME*|*change-me*|*changeme*|*replace-with*|*localhost*|*127.0.0.1*)
      echo "Invalid production DATABASE_URL in $env_file"
      echo "Use the real managed PostgreSQL URL, or a Docker database service name if local Docker Postgres is intentionally configured."
      exit 1
      ;;
  esac
}

check_docker_port() {
  local port="$1"
  local expected_container="$2"
  local owner

  owner="$($DOCKER ps --filter "publish=${port}" --format '{{.Names}}' | head -n 1 || true)"
  if [ -z "$owner" ]; then
    return 0
  fi

  if [ "$owner" = "$expected_container" ]; then
    echo "Port ${port} is already owned by ${expected_container}; continuing with normal compose refresh."
    return 0
  fi

  echo "Port ${port} is already allocated by another Docker container: ${owner}"
  $DOCKER ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "$port" || true
  exit 1
}

echo "Checking required env files..."
check_required_file "$BACKEND_ENV_FILE"
check_required_file "$FRONTEND_ENV_FILE"
check_database_url "$BACKEND_ENV_FILE"

if [ "${DEPLOY_GIT_PULL:-false}" = "true" ]; then
  if [ -d .git ]; then
    echo "Pulling latest deployment files..."
    if ! git pull --ff-only; then
      echo "Git pull failed. The server does not need Git credentials when GitHub Actions uploads deployment files."
      exit 1
    fi
  else
    echo "DEPLOY_GIT_PULL=true was requested, but $APP_DIR is not a git repository."
    exit 1
  fi
else
  echo "Skipping git pull. GitHub Actions uploads deploy.sh and docker-compose.prod.yml before deployment."
fi

echo "Checking frontend port ${FRONTEND_PORT} before refresh..."
check_docker_port "$FRONTEND_PORT" "$FRONTEND_CONTAINER"

echo "Checking backend port ${BACKEND_PORT} before refresh..."
check_docker_port "$BACKEND_PORT" "$BACKEND_CONTAINER"

echo "Pulling latest Docker images..."
$DOCKER compose -f "$COMPOSE_FILE" pull

echo "Refreshing containers..."
$DOCKER compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "Checking containers..."
$DOCKER compose -f "$COMPOSE_FILE" ps

echo "Running backend migrations..."
$DOCKER compose -f "$COMPOSE_FILE" exec -T backend python manage.py migrate --noinput

echo "Collecting static files..."
$DOCKER compose -f "$COMPOSE_FILE" exec -T backend python manage.py collectstatic --noinput

echo "Checking local frontend..."
wait_for_url "http://127.0.0.1:${FRONTEND_PORT}" "frontend"

echo "Checking local backend health..."
wait_for_url "http://127.0.0.1:${BACKEND_PORT}/api/health/" "backend API health"

if $DOCKER compose -f "$COMPOSE_FILE" config --services | grep -qx redis; then
  echo "Checking Redis..."
  $DOCKER compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping
else
  echo "Redis service is not configured; skipping Redis check."
fi

echo "Checking public site..."
warn_if_public_unreachable "$PUBLIC_URL" "public site"
warn_if_public_unreachable "$PUBLIC_URL/api/health/" "public API health"

echo "Testing Nginx..."
sudo nginx -t

echo "Restarting Nginx..."
sudo systemctl restart nginx

echo "Cleaning unused Docker images safely..."
if $DOCKER image prune -f; then
  echo "Docker image prune completed"
else
  echo "Warning: Docker image prune skipped or already running."
fi

if $DOCKER builder prune -f; then
  echo "Docker builder prune completed"
else
  echo "Warning: Docker builder prune skipped or already running."
fi

echo "Deployment completed: $APP_NAME"
