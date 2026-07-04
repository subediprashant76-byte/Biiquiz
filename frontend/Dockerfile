# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS deps

WORKDIR /app/frontend

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund


FROM node:20-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=/api
ARG USE_DJANGO_API=true
ARG DJANGO_API_URL=http://backend:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV USE_DJANGO_API=${USE_DJANGO_API}
ENV DJANGO_API_URL=${DJANGO_API_URL}

COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY frontend ./frontend
COPY backend/prisma ./backend/prisma

WORKDIR /app/frontend
RUN npm run build


FROM node:20-bookworm-slim AS runner

WORKDIR /app/frontend

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_URL=/api \
    USE_DJANGO_API=true \
    DJANGO_API_URL=http://backend:8000 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system app \
    && useradd --system --gid app --home /app app

COPY --from=builder --chown=app:app /app/frontend ./
RUN npm prune --omit=dev --no-audit --no-fund

USER app

EXPOSE 3000

CMD ["npm", "run", "start"]
