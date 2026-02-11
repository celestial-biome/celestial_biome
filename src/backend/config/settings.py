import os
from pathlib import Path

import dj_database_url
import sentry_sdk
from django.core.exceptions import ImproperlyConfigured
from sentry_sdk.integrations.django import DjangoIntegration

# SECURITY WARNING: don't run with debug turned on in production!
# 環境変数が 'True' の場合のみ True になる
DEBUG = os.environ.get("DEBUG", "False").lower() in ("true", "1", "t")

# Cloud Run 用の SSL 設定
# 本番環境 (DEBUG=False) では HTTPS を強制し、ローカル (DEBUG=True) では無効化する
if not DEBUG:
    # 本番環境
    SECURE_PROXY_SSL_HEADER: tuple[str, str] | None = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT: bool = True
    SESSION_COOKIE_SECURE: bool = True
    CSRF_COOKIE_SECURE: bool = True
else:
    # ローカル開発環境 (ここが重要！)
    SECURE_PROXY_SSL_HEADER = None
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False

    # 追加: HSTS (HTTP Strict Transport Security) も無効化してリダイレクトを防ぐ
    SECURE_HSTS_SECONDS = 0
    SECURE_HSTS_INCLUDE_SUBDOMAINS = False
    SECURE_HSTS_PRELOAD = False

# Terraform (Cloud Run) で設定された SENTRY_DSN がある場合のみ有効化
if os.environ.get("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.environ.get("SENTRY_DSN"),
        integrations=[
            DjangoIntegration(),
        ],
        # 環境名 (production, development, staging)
        environment=os.environ.get("SENTRY_ENVIRONMENT", "production"),
        # パフォーマンス監視 (Traces)
        # 環境変数 SENTRY_TRACES_SAMPLE_RATE で制御 (デフォルト 0.0 = 無効)
        # 開発環境なら 1.0 (全件送信) にしておくとデバッグしやすいです
        traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", 0.0)),
        # プロファイリング (必要に応じて有効化)
        profiles_sample_rate=float(os.environ.get("SENTRY_PROFILES_SAMPLE_RATE", 0.0)),
        # ユーザーの個人情報(PII)を送信しない
        send_default_pii=False,
    )

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")


# 本番環境でSECRET_KEYが設定されていない場合は安全のため起動を停止する
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "django-insecure-dev-key"
    else:
        raise ImproperlyConfigured("The DJANGO_SECRET_KEY environment variable must be set in production.")


# ALLOWED_HOSTS のパース処理
# Terraform から "host1,host2" という文字列で来るので、リストに変換が必要
env_hosts = os.environ.get("ALLOWED_HOSTS", ".run.app,localhost")
ALLOWED_HOSTS = [host.strip() for host in env_hosts.split(",") if host.strip()]
if DEBUG:
    ALLOWED_HOSTS += ["*"]

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "drf_spectacular",
    "astronomy.apps.AstronomyConfig",
    "geology.apps.GeologyConfig",
    "economy.apps.EconomyConfig",
    "accounts.apps.AccountsConfig",
    "api.apps.ApiConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# データベース設定
# 環境変数 DB_HOST がある場合(=Cloud Run)はそれを使用、なければローカル(SQLite等)
if os.environ.get("DB_HOST"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("DB_NAME"),
            "USER": os.environ.get("DB_USER"),
            "PASSWORD": os.environ.get("DB_PASSWORD"),
            "HOST": os.environ.get("DB_HOST"),  # Terraformが設定した /cloudsql/... が入る
            "PORT": "",  # Unixソケット接続の場合は空にする
        }
    }
else:
    # ローカル開発用の設定 (今まで通りのSQLiteなど)
    DATABASES = {
        "default": dj_database_url.config(
            # compose.yaml で定義した DATABASE_URL を読み込む
            default=os.environ.get("DATABASE_URL"),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = "static/"
# 静的ファイルを集める場所
STATIC_ROOT = BASE_DIR / "staticfiles"
# WhiteNoiseを使って圧縮・キャッシュを行う設定
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# 環境変数からフロントエンドのURLを取得 (Terraformで設定)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# 本番のNext.jsのURLと、ローカル開発のURLを許可
CORS_ALLOWED_ORIGINS = [
    FRONTEND_URL,  # 環境変数から動的に追加
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# CSRF設定: 新しいドメインでの管理画面ログインを許可
CSRF_TRUSTED_ORIGINS = [
    FRONTEND_URL,  # Frontend (app-...)
    "https://*.run.app",
    f"https://{ALLOWED_HOSTS[0]}",  # Backend自身 (api-...) も許可しておくと安心
    "https://api.celestial-biome.com",  # 本番 (念のため維持)
    "https://api-staging.celestial-biome.com",  # Staging (念のため維持)
]

# Firebase トークンを通すために Authorization ヘッダーを許可
CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# Django REST Framework の設定
REST_FRAMEWORK = {
    # スキーマ生成クラスとして drf-spectacular を指定
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    # 認証クラスの設定
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # 作成したFirebase認証クラスを最優先にする
        "config.authentication.FirebaseAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    # デフォルトの権限設定
    "DEFAULT_PERMISSION_CLASSES": [
        # デフォルトの権限設定を「認証済みユーザーのみ許可」にする
        "rest_framework.permissions.IsAuthenticated",
    ],
}

# drf-spectacular の設定
SPECTACULAR_SETTINGS = {
    "TITLE": "Celestial Biome API",
    "DESCRIPTION": "Space, Nature, and Coffee.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# コンテナ環境変数名に合わせる
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT")

# ロギングを設定
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            # GCP Cloud Logging が severity を正しく認識できるよう
            # levelname
            "format": "%(levelname)s %(asctime)s %(name)s %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
