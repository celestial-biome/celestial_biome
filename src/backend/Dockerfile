# src/backend/Dockerfile

# 1. Pythonのベースイメージ
FROM python:3.11-slim

# 2. ログがバッファされずにすぐ出力されるように設定 (Cloud Runで必須)
ENV PYTHONUNBUFFERED=True
ENV APP_HOME=/app
WORKDIR $APP_HOME

# 3. 依存関係のインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Gunicorn (本番用サーバー) が入っていなければ追加インストール
RUN pip install gunicorn

# 4. ソースコードのコピー
COPY . ./

# 5. Cloud Run はポート 8080 を環境変数 $PORT で渡してくる
# Django (Gunicorn) をそのポートで起動させる
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 celestial_biome.wsgi:application