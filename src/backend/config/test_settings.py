import os

# ettings.py を読み込む前に、テスト実行に必要な環境変数を偽装する
# これにより、settings.py 内のセキュリティチェック(ImproperlyConfigured)を回避します
os.environ["DJANGO_SECRET_KEY"] = "insecure-test-key"
os.environ["DEBUG"] = "True"

from .settings import *  # noqa

# テスト実行時は強制的に軽量なSQLiteを使用する（PostgreSQL設定を無視）
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# テスト実行用のダミーGCPプロジェクトID
GOOGLE_CLOUD_PROJECT = "test-project-id"

SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER = None
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False
