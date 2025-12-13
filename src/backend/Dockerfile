# src/backend/Dockerfile

# 1. Pythonベースイメージ
FROM python:3.11-slim

# 2. uv のバイナリを公式イメージからコピーしてくる (これが一番早くて確実です)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 3. 環境設定
ENV PYTHONUNBUFFERED=True
# 仮想環境(.venv)の中にインストールさせる設定
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

WORKDIR /app

# 4. 依存関係ファイルのコピー (requirements.txt ではなく pyproject.toml と uv.lock)
COPY pyproject.toml uv.lock ./

# 5. 依存関係のインストール
# --frozen: lockファイルを無視せず厳密にインストール
# --no-dev: 開発用パッケージを除外 (本番用なので)
RUN uv sync --frozen --no-dev

# 6. パスの設定
# uv はデフォルトで .venv を作るので、そこの bin にパスを通すとコマンドがそのまま使える
ENV PATH="/app/.venv/bin:$PATH"

# 7. ソースコードのコピー
COPY . .

# 8. 起動コマンド
# gunicorn は .venv/bin/gunicorn にあるので、パスが通っていればそのまま呼べます
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 celestial_biome.wsgi:application