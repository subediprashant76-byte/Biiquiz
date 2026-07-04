# syntax=docker/dockerfile:1.7

FROM python:3.12-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    GUNICORN_BIND=0.0.0.0:8000 \
    HEALTHCHECK_HOST=localhost

WORKDIR /app

RUN groupadd --system app \
    && useradd --system --gid app --home /app app

COPY requirements.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY . ./

RUN python manage.py collectstatic --noinput \
    && chown -R app:app /app

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import os, urllib.request; req = urllib.request.Request('http://127.0.0.1:8000/api/health/', headers={'Host': os.environ.get('HEALTHCHECK_HOST', 'localhost'), 'X-Forwarded-Proto': 'https'}); urllib.request.urlopen(req, timeout=3).read()"

CMD ["gunicorn", "--config", "gunicorn.conf.py", "biiquiz_api.wsgi:application"]
