# Celestial Biome

**Celestial Biome is a platform designed to discover "Singularities"—qualitative turning points and unseen insights—by integrating diverse measurable data.**

Celestial Biome は、さまざまな計測可能なデータを蓄積・統合し、そこから**「特異点（質的な転換点）」**を見つけ出すプラットフォームプロジェクトです。（開発中）

私は、一見無関係に見える以下の要素を横断的に可視化し、複雑系の中に潜む相関関係を明らかにすることで、人生やプロジェクトにおける意思決定の新たな羅針盤を構築しています。

* **Sensory:** Coffee, Wine, Fly Fishing (五感・感性)
* **Environment:** Space, Outdoor, Geology (自然環境・宇宙)
* **Society:** Economy, Market Indicators (社会・経済活動)

By visualizing the synthesis of elements that influence human life—ranging from **coffee, wine, and fly fishing** to **space weather and economic activities**—I aim to uncover hidden connections and provide new metrics for decision-making.


Google Cloud Platform (GCP) 上に構築され、最新の技術スタックと厳格な運用ルールに基づき開発しています。

## 🌍 Production Environment

本番環境は以下の URL で稼働しています。

- **Frontend (App):** https://app.celestial-biome.com
- **Backend (API):** Cloud Run Service (Auto-generated URL)
- **Admin Panel:** (Backend URL)/admin/

## 🏗 Architecture & Tech Stack

本プロジェクトは以下の技術スタックとバージョンを厳守して開発されています。

### Backend (Server Side)

| Component           | Technology            | Version     | Note                     |
| ------------------- | --------------------- | ----------- | ------------------------ |
| **Framework**       | Django                | **5.2 LTS** | App Config / ORM         |
| **API**             | Django REST Framework | Latest      | API Construction         |
| **Schema**          | drf-spectacular       | Latest      | **Swagger UI / OpenAPI 3** |
| **Language**        | Python                | **3.12**    |                          |
| **Pkg Manager**     | **uv**                | Latest      | **pip/poetry 使用禁止**  |
| **Lint/Fmt**        | Ruff                  | Latest      | Enforced by pre-commit   |
| **Type Check** 　　　| **Ty** 　　　　　　　　　| Latest      | **Static Type Checker** |
| **Testing**         | pytest                | Latest      |                          |
| **Monitoring**      | Sentry SDK (Django)   | ~2.0.0      | Runtime Error & Performance Tracking |
| **Async**           | **Cloud Tasks**       | -           | No Celery/Redis          |
| **Data Analysis**　 | **Pandas**            | Latest      | Data manipulation        |

### Frontend (Client Side)

| Component         | Technology         | Version     | Note                         |
| ----------------- | ------------------ | ----------- | ---------------------------- |
| **Framework**     | Next.js            | **16**      | App Router                   |
| **Language**      | TypeScript         | 5.x         |                              |
| **Runtime**       | Node.js            | **v22 LTS** |                              |
| **Styling**       | Tailwind CSS       | **v4**      |                              |
| **Lint/Fmt**      | **Biome**          | Latest      | **ESLint/Prettier 使用禁止** |
| **Type Gen**      | openapi-typescript | Latest      | Schema Driven Dev            |
| **Testing**       | Vitest             | Latest      | Unit & Component Testing     |
| **Visualization** | Echarts            | 6.x         | Charts & Graphs              |

### Infrastructure

| Component          | Technology          | Note                                     |
| ------------------ | ------------------- | ---------------------------------------- |
| **Domain**　　　　　　| Custom Domain 　　　| Terraform & Cloud Run Mapping 　　　　　　　|
| **Cloud**          | Google Cloud (GCP)  |                                          |
| **Compute**        | Cloud Run           | Frontend & Backend (Standalone)          |
| **ETL / Batch**    | Cloud Run Jobs      | Scheduled by Cloud Scheduler             |
| **Database**       | Cloud SQL           | PostgreSQL 16 (**App Data & Data Mart**) |
| **Data Warehouse** | BigQuery            | **Time-series data storage**             |
| **Storage**        | Cloud Storage (GCS) | Static & Media files                     |
| **IaC**            | Terraform           | Infrastructure management                |
| **CI/CD**          | GitHub Actions      | CI, Build, Deploy                        |
| **Monitoring**     | Sentry              | Error Tracking, Source Maps (Frontend)   |

---

## 📂 Project Structure

```text
celestial_biome
├── .github/workflows       # CI/CD (ci.yml, deploy.yml, frontend-test.yml, backend-test.yml)
├── .pre-commit-config.yaml # Code Quality Rules (Ruff & Biome)
├── compose.yaml            # Local Development (Hot Reload)
├── src
│   ├── backend             # Django Root
│   │   ├── config          # Settings, URLs
│   │   ├── pyproject.toml  # Managed by uv
│   │   └── Dockerfile      # Prod: uv base
│   └── frontend            # Next.js Root
│       ├── app             # App Router
│       │   └── components  # UI Components(Feature-based folders)
│       ├── vitest.config.ts # Vitest Config
│       ├── biome.json      # Biome Config
│       └── Dockerfile      # Prod: Node 22 Multi-stage
└── terraform               # Infrastructure definitions
```

## 💻 Local Development

### Prerequisites:

- Docker & Docker Compose

- uv (Python Package Manager)

- Node.js v22+ & npm

1. Setup Backend
   Backend の依存関係は `uv` で管理されています。

```text
cd src/backend
uv sync
```

2. Setup Frontend
   Frontend の依存関係をインストールします。

```text
cd src/frontend
npm install
```

3. Start Application
   Docker Compose を使用して開発環境（Hot Reload 有効）を起動します。

```text
# プロジェクトルートで実行

docker compose up --build
```

- Frontend: http://localhost:3000

- Backend API: http://localhost:8000

- Admin Panel: http://localhost:8000/admin/

## ⚙️ Operational Rules & Workflows

### 1. Schema Driven Development

Backend と Frontend の型同期は、OpenAPI スキーマを介して行います。

1.  Backend: モデルや API に変更を加える。
2.  Backend: `drf-spectacular` 経由で `schema.yml` (OpenAPI) を生成する。
3.  Frontend: `openapi-typescript` を実行し、Backend の型定義を TypeScript 型として自動生成・取り込みを行う。

### 2. Code Quality (Linting & Type Checking)

コミット時および CI 実行時に、以下のツールによる品質チェックが強制されます。

- Backend:
  - `Ruff`: Lint と Format (pre-commit で強制)
  - `Ty`: 静的型チェック (CI で強制)

- Frontend:
  - `Biome`: Lint と Format (pre-commit で強制)

手動実行する場合：

```text
# Backend (src/backend)

uv run ruff check --fix .  # Lint修正
uv run ruff format .       # Format修正
uv run ty check            # 型チェック実行

# Frontend (src/frontend)

npx biome check --write .
```

### 3. Testing

Backend, Frontend 共に単体テスト環境が整備されています。
開発時はこまめにテストを実行し、品質を担保してください。

- **Backend (pytest)**:
  ```bash
  # src/backend で実行
  uv run pytest
  ```
  - `test_models.py`: DB モデルの CRUD テスト
  - `test_commands.py`: 管理コマンド（Ingest, Sync）のロジックテスト
  - `test_ingest.py`: 外部 API 連携（NOAA）のモックテスト
  - `test_views.py`: API エンドポイントのレスポンス形式テスト
- **Frontend (Vitest)**:
  ```bash
  # src/frontend で実行
  npm test
  ```
  - `utils.test.ts`: ロジック関数の単体テスト
  - `chart-options.test.ts`: グラフ設定（ECharts）のスナップショットテスト
  - `ui-parts.test.tsx`: UI コンポーネントの描画テスト
  - `useSpaceWeather.test.ts`: カスタムフックとデータ取得フローのテスト

### 4. Async Operations

非同期処理が必要な場合は、Celery/Redis 構成ではなく、**Google Cloud Tasks** を使用してください。

### 5. Data Pipeline (Space Weather)

宇宙天気データ（NOAA SWPC）を収集・蓄積し、可視化するパイプラインを構築しています。
**Data Warehouse (BigQuery)** と **Data Mart (Cloud SQL)** を分離することで、分析用データの蓄積と Web アプリの高速応答を両立させています。

```mermaid
graph LR
subgraph External[External Data Source]
NOAA[NOAA SWPC API]
end

    subgraph GCP[Google Cloud Platform]
        subgraph Compute[Compute & Orchestration]
            Scheduler[Cloud Scheduler]
            Job_Ingest[Cloud Run Job<br>Ingest]
            Job_Sync[Cloud Run Job<br>Sync]
            Backend[Cloud Run Service<br>Django API]
            Frontend[Cloud Run Service<br>Next.js UI]
        end

        subgraph Storage[Data Storage]
            BQ[(BigQuery<br>Data Warehouse)]
            SQL[(Cloud SQL<br>PostgreSQL<br>Data Mart)]
        end
    end

    Scheduler -- Trigger (Hourly :00) --> Job_Ingest
    Job_Ingest -- 1. Fetch JSON --> NOAA
    Job_Ingest -- 2. Store Raw Data --> BQ

    Scheduler -- Trigger (Hourly :05) --> Job_Sync
    Job_Sync -- 3. Query (Aggregated) --> BQ
    Job_Sync -- 4. Upsert (Refresh) --> SQL

    Frontend -- 5. Request API --> Backend
    Backend -- 6. Query (Fast) --> SQL
```

1.  **Ingestion (ETL)**: Cloud Run Job (`ingest_space_weather`) が NOAA からデータを取得し、**BigQuery** に蓄積 (毎時 0 分実行)。
2.  **Sync (Data Mart)**: Cloud Run Job (`sync_bq_to_db`) が BigQuery から直近 7 日分のデータを集計・取得し、**Cloud SQL** の専用テーブルに洗い替え (毎時 5 分実行)。
    - **Transaction**: データの不整合を防ぐため、`transaction.atomic` を用いて全削除・一括挿入（Bulk Create）を安全に行います。
3.  **Serving**: Backend API は **Cloud SQL** を参照してデータを返却。これにより、BigQuery の起動オーバーヘッドを回避し、高速なレスポンスを実現。
    - **Optimization**: 取得したデータに対し、Pandas を用いて Pivot 変換（Long -> Wide）や欠損値の補完（Forward Fill）を行い、Frontend が描画しやすい形式でレスポンスします。
4.  **Visualization**: Frontend (Next.js + Echarts) でデータを可視化。

## 📚 API Documentation (Swagger UI)

drf-spectacular により、OpenAPI 仕様書とインタラクティブなドキュメントが自動生成されます。 ローカル環境起動中、以下のURLからアクセス可能です。

- Swagger UI: http://localhost:8000/api/schema/swagger-ui/
  - APIの仕様確認、パラメータ (`start_date`, `end_date`, `country`) のテスト実行が可能です。
- Redoc: http://localhost:8000/api/schema/redoc/
- Schema (YAML): http://localhost:8000/api/schema/

## 📡 Data Sources

本プラットフォームでは、以下の信頼性の高い外部データソースから定期的にデータを収集・統合しています。

### 1. Space Weather (宇宙天気)
- **Source:** [NOAA Space Weather Prediction Center (SWPC)](https://www.swpc.noaa.gov/)
- **Description:** 太陽活動と地球周辺の宇宙環境データ。
  - **GOES Satellite:** 太陽フレア監視のためのX線フラックス (Primary Satellite)。
  - **Solar Wind:** 太陽風の速度 (Plasma) および 惑星間磁場 (Magnetometer / Bz)。
  - **Kp Index:** 地磁気嵐の大きさを表す指数。

### 2. Geology (地質・地震)
- **Source:** [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/)
- **Description:** USGS Real-time Notifications, Feeds, and Web Services を使用し、世界中で発生した地震データを取得。
  - **Metrics:** 発生時刻、マグニチュード (M2.5以上)、震源地 (緯度・経度・深さ)。

### 3. World Economy (世界経済)
- **Source:** Yahoo Finance & The World Bank
- **Description:** 市場心理と経済のファンダメンタルズを可視化するための指標。
  - **Yahoo Finance:** 主要国の株価指数 (S&P 500, Nikkei 225, FTSE 100, etc.) を `yfinance` 経由で取得。
  - **World Bank Open Data:** 各国のGDPやインフレ率などのマクロ経済指標を `wbgapi` 経由で取得。

## 🛠 Management Commands

- **Ingest Space Weather Data**
  NOAA から宇宙天気データを手動で取得・保存します。

  ```bash
  # ローカル実行 (.env に GCP_PROJECT_ID が必要)
  uv run python manage.py ingest_space_weather --days 7
  ```

- Sync Data Mart (BigQuery -> Cloud SQL)
  BigQuery から直近 7 日間のデータを取得し、Cloud SQL (Data Mart) を更新します。
  ```bash
  uv run python manage.py sync_bq_to_db
  ```

## 🚀 Deployment & Operations

### Deployment

GitHub Actions により、`main` ブランチへのプッシュで自動的に Build と Cloud Run への Deploy が行われます。　　

CI/CD Pipeline Feature:
1. Dynamic Backend URL:
Frontend のビルドプロセスにおいて、デプロイ済みの Backend URL を gcloud コマンドで動的に取得し、NEXT_PUBLIC_API_URL として注入しています。これにより、環境変数のハードコーディングや手動設定を排除しています。
2. Sentry Release Automation:
ビルド時に Sentry CLI を実行し、ソースマップ（Source Maps）を自動的にアップロードしています。これにより、本番環境で発生したエラーを Minify 前の元のソースコード行で特定・デバッグすることが可能です。

### Monitoring & Observability

Sentry を活用し、Frontend / Backend 双方で包括的な監視体制を構築しています。

**Monitoring Strategy:**
* **Frontend:** ビルドパイプライン（CI/CD）でソースマップを自動アップロードし、Minify されたコードを復元してエラー箇所を特定可能にしています。
* **Backend:** `sentry-sdk` の Django 統合を使用し、実行時エラーのスタックトレース収集と、API レスポンスタイムのパフォーマンストレースを実施しています。

### Database Migration (Production)

本番環境 (Cloud SQL) へのマイグレーションは、Cloud Run Jobs を使用して安全に実行します。

```text
# 実行例 (変数は環境に合わせて設定)

gcloud run jobs deploy migrate-db \
 --image $IMAGE \
  --region $REGION \
  --set-cloudsql-instances $INSTANCE_CONNECTION_NAME \
  --set-env-vars DB_NAME=celestial_db \
  --set-env-vars DB_USER=celestial_user \
  --set-env-vars GCP_PROJECT_ID=$PROJECT_ID \
 --command "python,manage.py,migrate" \
 --execute-now
```

### Superuser Creation

管理ユーザーの作成も同様に Cloud Run Jobs 経由で行います。

```text
gcloud run jobs deploy create-superuser \
 --image $IMAGE \
 --command "python,manage.py,createsuperuser,--noinput" \
 --execute-now
```
