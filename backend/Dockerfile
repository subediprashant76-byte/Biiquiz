# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS migrations
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY prisma ./prisma
COPY scripts ./scripts
CMD ["npm", "run", "prisma:deploy"]

FROM python:3.13-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app --home /app app
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt
COPY . ./
RUN python manage.py collectstatic --noinput && chown -R app:app /app
USER app
EXPOSE 8000
ENV GUNICORN_BIND=0.0.0.0:8000
ENV HEALTHCHECK_HOST=localhost
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import os, urllib.request; request = urllib.request.Request('http://127.0.0.1:8000/api/health', headers={'Host': os.getenv('HEALTHCHECK_HOST', 'localhost'), 'X-Forwarded-Proto': 'https'}); urllib.request.urlopen(request, timeout=3)" || exit 1
CMD ["gunicorn", "--config", "gunicorn.conf.py", "biiquiz_api.wsgi:application"]
