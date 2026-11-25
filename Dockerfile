FROM python:3.13-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./backend
COPY static ./static
# Development/evaluation only; production requires managed PostgreSQL and hardened auth.
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn backend.app:app --timeout-keep-alive 5 --timeout-graceful-shutdown 15 --limit-concurrency 64 --no-access-log --host 0.0.0.0 --port ${PORT:-8000}"]
