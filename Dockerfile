# ── Stage 1: Build the React frontend ────────────────────────────────────────
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ .
# Vite bakes env vars at build time — pass the Mapbox token as a build arg
ARG VITE_MAPBOX_TOKEN
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM python:3.10-slim
LABEL org.opencontainers.image.title="MARVO 2.0"
LABEL org.opencontainers.image.description="Marine Agentic Reasoning and Voyage Optimizer — SIH26176"

WORKDIR /app

# System deps (only what's actually needed at runtime)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Source
COPY backend/ ./backend/

# Pre-built frontend (served by FastAPI's StaticFiles)
COPY --from=frontend-build /app/frontend/dist ./frontend/dist/

# Default environment — override with -e flags or docker-compose
ENV MARVO_DATA_MODE=LIVE
ENV MARVO_USE_LLM=1
ENV PYTHONIOENCODING=utf-8

EXPOSE 8000
CMD ["sh", "-c", "cd backend && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
