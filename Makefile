# ORCA 2.0 — Makefile
# Cross-platform convenience commands. Requires make (Linux/Mac native; Windows: winget install GnuWin32.Make)

.PHONY: help run dev test build docker docker-dev clean

help:          ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*'  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", 1, 2}'

# ── Production (Docker) ───────────────────────────────────────────────────────
docker:        ## Build & run the full app in Docker (recommended)
	docker compose up --build

docker-stop:   ## Stop the Docker container
	docker compose down

# ── Local (no Docker) ─────────────────────────────────────────────────────────
install:       ## Install all Python and Node dependencies
	cd backend && pip install -r requirements.txt
	cd frontend && npm install --no-audit --no-fund

build:         ## Build the production React frontend
	cd frontend && npm run build

run:           ## Start backend server (serves built frontend on :8000)
	cd backend && ORCA_DATA_MODE=DEMO uvicorn app.main:app --host 127.0.0.1 --port 8000

run-live:      ## Start backend in LIVE mode (real INCOIS/Open-Meteo data)
	cd backend && ORCA_DATA_MODE=LIVE uvicorn app.main:app --host 127.0.0.1 --port 8000

dev:           ## Dev mode: backend with hot-reload + Vite HMR on :5173
	@echo "Starting backend with reload on :8000..."
	cd backend && ORCA_DATA_MODE=DEMO uvicorn app.main:app --reload --port 8000 &
	@echo "Starting Vite dev server on :5173..."
	cd frontend && npm run dev

# ── Tests ─────────────────────────────────────────────────────────────────────
test:          ## Run backend test suite
	cd backend && python -m pytest tests/ -q

test-v:        ## Run backend tests with verbose output
	cd backend && python -m pytest tests/ -v --tb=short

# ── Cleanup ───────────────────────────────────────────────────────────────────
clean:         ## Remove build artifacts and caches
	rm -rf frontend/dist frontend/node_modules
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
