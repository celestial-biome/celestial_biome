# 開発環境と同じベースイメージを使用 (Python 3.12 + uv プリインストール済み)
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# 環境設定
ENV PYTHONUNBUFFERED=True
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

WORKDIR /app

# 依存関係ファイルのコピー
COPY pyproject.toml uv.lock ./

# 依存関係のインストール
# --frozen: lockファイルを厳守
# --no-dev: 開発用パッケージを除外
RUN uv sync --frozen --no-dev

# パスの設定 (uv が作る .venv へのパスを通す)
ENV PATH="/app/.venv/bin:$PATH"

# ソースコードのコピー
COPY . .

# 起動コマンド
# パスが通っているので gunicorn と書くだけでOK
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 celestial_biome.wsgi:application