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
