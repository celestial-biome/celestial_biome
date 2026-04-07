# Celestial Biome — Backend

Celestial Biome のバックエンドアプリケーションです。Django + Django REST Framework で構築されており、宇宙天気・地震・経済データの API を提供します。

## Tech Stack

| Technology            | Version     | Note                         |
| --------------------- | ----------- | ---------------------------- |
| Django                | 5.2 LTS     | App Config / ORM             |
| Django REST Framework | Latest      | API Construction             |
| drf-spectacular       | Latest      | Swagger UI / OpenAPI 3       |
| Python                | 3.12        |                              |
| uv                    | Latest      | パッケージ管理（pip/poetry 使用禁止） |
| Ruff                  | Latest      | Lint / Format                |
| Ty                    | Latest      | Static Type Checker          |
| pytest                | Latest      | Testing                      |

## Getting Started

依存関係をインストールします（`uv` が必要です）。

```bash
cd src/backend
uv sync
```

開発サーバーを起動します（通常はプロジェクトルートの Docker Compose を使用）。

```bash
uv run python manage.py runserver
```

- API: http://localhost:8000
- Admin: http://localhost:8000/admin/
- Swagger UI: http://localhost:8000/api/schema/swagger-ui/

## Code Quality

```bash
# Lint 修正
uv run ruff check --fix .

# Format 修正
uv run ruff format .

# 型チェック
uv run ty check
```

Ruff は pre-commit フックで自動実行されます。

## Testing

```bash
# src/backend で実行
uv run pytest
```

主なテストファイル:

- `test_models.py`: DB モデルの CRUD テスト
- `test_commands.py`: 管理コマンド（Ingest, Sync）のロジックテスト
- `test_ingest.py`: 外部 API 連携（NOAA）のモックテスト
- `test_views.py`: API エンドポイントのレスポンス形式テスト

## Management Commands

```bash
# 宇宙天気データを手動取得（直近 7 日分）
uv run python manage.py ingest_space_weather --days 7

# BigQuery → Cloud SQL (Data Mart) 同期
uv run python manage.py sync_bq_to_db
```

詳細は [`astronomy/management/commands/README.md`](astronomy/management/commands/README.md) を参照してください。

## OpenAPI Schema 生成

```bash
uv run python manage.py spectacular --color --file schema.yml
```

生成した `schema.yml` を Frontend の型生成に使用します。詳細はルートの `README.md` — **Schema Driven Development** セクションを参照してください。
