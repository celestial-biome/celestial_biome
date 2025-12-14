# Celestial Biome

Celestial Biome は、コーヒー、ワイン、フライフィッシング、宇宙、アウトドアといった要素を統合するプロジェクトのプラットフォームです。

## 🏗 Architecture

このプロジェクトは Google Cloud Platform (GCP) 上に構築されています。

- **Frontend:** Next.js (Cloud Run)
- **Backend:** Django + Gunicorn (Cloud Run)
- **Database:** PostgreSQL 16 (Cloud SQL)
- **IaC:** Terraform
- **CI/CD:** GitHub Actions

## 🚀 Tech Stack

- **Language:** TypeScript, Python 3.12
- **Package Manager:** npm, uv (Python)
- **Linter/Formatter:** Biome (Frontend), Ruff (Backend)
- **Infra:** Terraform, Docker

## 💻 Local Development

### Prerequisites
- Docker & Docker Compose
- Node.js (v22+)
- uv (Python package manager)
- Google Cloud SDK

### Setup
```bash
# 1. Clone the repository
git clone <repository-url>
cd celestial_biome

# 2. Setup Backend (.venv & hooks)
cd src/backend
uv sync

# 3. Setup Frontend
cd ../frontend
npm install

# 4. Start Development Server
cd ../../
docker compose up --build