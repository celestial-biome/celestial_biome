# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Celestial Biome is a full-stack data visualization and AI inference platform that aggregates space weather, seismic, and economic data, then uses Vertex AI (Gemini 2.0 Flash) to detect "Singularities" (qualitative turning points) across domains.

- **Frontend:** Next.js 16 (App Router) → `app.celestial-biome.com`
- **Backend:** Django 5.2 + DRF → `api.celestial-biome.com`
- **Inference:** Separate FastAPI repo (`celestial-inference`) → `inference.celestial-biome.com`
- **Data:** BigQuery (raw warehouse) + Cloud SQL PostgreSQL (7-day rolling data mart)
- **Compute:** Google Cloud Run (services + jobs)

## Commands

### Backend (`src/backend/`)

```bash
uv sync                          # Install dependencies
uv run pytest                    # Run all tests
uv run pytest astronomy/tests/   # Run tests for a single app
uv run ruff check --fix .        # Lint and auto-fix
uv run ruff format .             # Format code
uv run ty check                  # Static type checking
uv run python manage.py migrate  # Run migrations
```

### Frontend (`src/frontend/`)

```bash
npm install       # Install dependencies
npm run dev       # Dev server (port 3000)
npm run build     # Production build
npm test          # Run Vitest
npm run check     # Biome lint + format (with auto-fix)
npx biome ci .    # Biome check (CI, no auto-fix)
```

### Local Full Stack

```bash
docker compose up --build   # Starts inference + backend + frontend + PostgreSQL
```

## Architecture

### Data Flow

External APIs → `ingest_*` management command → **BigQuery** (raw, append-only) → `sync_*` command → **Cloud SQL** (rolling 7-day, atomic delete+bulk-insert) → Django API → Next.js frontend

Each domain (`astronomy`, `geology`, `economy`) follows this exact pattern with its own pair of management commands (e.g., `ingest_space_weather` / `sync_bq_to_db`).

### Authentication

Firebase JWT-based auth throughout. Django's `FirebaseAuthentication` (in `config/authentication.py`) verifies tokens and lazily creates Django User records on first valid request. The frontend's `lib/api-client.ts` (`fetchWithAuth()`) attaches Bearer tokens to all API calls.

### Space Weather Pivot

`SpaceWeatherListView` fetches `(timestamp, metric, value)` rows from Cloud SQL and pivots them to wide format `{timestamp, solar_wind_speed, kp_index, ...}` in Python, with forward-fill for missing Kp index values.

### AI Inference Gateway

`api/views.py` → `api/services/inference_client.py` → FastAPI `/v1/predict` (60s timeout). The inference service performs structured RAG: pulls numeric evidence from BigQuery across all 3 domains and injects into Gemini 2.0 Flash prompts via Vertex AI.

### Frontend Data Loading

`app/page.tsx` is a Server Component that `Promise.allSettled`-fetches all 3 domain APIs in parallel and renders dashboard cards. Each domain has its own component folder under `app/components/` with a consistent structure: `index.tsx`, `*Charts.tsx`, `chart-options.ts`, `use*.ts`, `utils.ts`.

## Key Conventions

- **Python package manager:** `uv` only — never `pip` or `poetry`
- **Python linting/formatting:** Ruff; type checking: Ty
- **JS/TS linting/formatting:** Biome (not ESLint/Prettier)
- **Backend tests** use SQLite in-memory via `config/test_settings.py` with `--nomigrations --reuse-db`; test paths are `astronomy/`, `geology/`, `economy/`
- **OpenAPI schema:** Backend generates via `drf-spectacular`; frontend types generated via `openapi-typescript`
- **Canonical URL enforcement:** `middleware.ts` 301-redirects `*.run.app` URLs to custom domains
- **Branch strategy:** `feature/* → staging → main`; pushes to `staging` deploy to staging Cloud Run, pushes to `main` deploy to production

## CI Workflows

| Workflow | Trigger | Action |
|---|---|---|
| `ci.yml` | PR/push to `main` | Ruff + Ty + Biome checks |
| `backend-test.yml` | `src/backend/**` changes | `uv run pytest` |
| `frontend-test.yml` | `src/frontend/**` changes | `npm test` |
| `deploy-staging.yml` | Push to `staging` | Deploy to Cloud Run staging |
| `deploy.yml` | Push to `main` | Migrate + deploy to Cloud Run production |
