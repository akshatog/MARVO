# ── Stage 1: Build the React frontend ────────────────────────────────────────
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ .
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM python:3.10-slim
LABEL org.opencontainers.image.title="ORCA 2.0"
LABEL org.opencontainers.image.description="Marine EcOsystem Reasoning with Collaborative Agents — SIH26176"

WORKDIR /app

# System deps (needed by h5py / scipy for MOSDAC satellite parsing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libhdf5-dev libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Source
COPY backend/ ./backend/

# Pre-built frontend (served by FastAPI's StaticFiles)
COPY --from=frontend-build /app/frontend/dist ./frontend/dist/

# Default environment — override with -e flags or docker-compose
ENV ORCA_DATA_MODE=DEMO
ENV ORCA_USE_LLM=0
ENV PYTHONIOENCODING=utf-8

EXPOSE 8000
CMD ["sh", "-c", "cd backend && uvicorn app.main:app --host 0.0.0.0 --port "]
