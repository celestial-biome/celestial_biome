import os
from pathlib import Path

import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
# 環境変数がない場合はデフォルト値（開発用）を使用
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "django-insecure-dev-key")

# SECURITY WARNING: don't run with debug turned on in production!
# 環境変数が 'True' の場合のみ True になる
DEBUG = os.environ.get("DEBUG", "False") == "True"

# DockerやLBからのアクセスを許可するために環境変数から取得
# 開発中はとりあえず '*' (全許可) でも動きますが、以下のように書くとスマートです
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*").split(",")
if DEBUG:
    ALLOWED_HOSTS += ["*"]

# 2. CSRF_TRUSTED_ORIGINS の追加 (★重要)
# Cloud Run (HTTPS) 経由で管理画面 (/admin) にログインするために必須です。
# これがないと、ログインしようとした瞬間にエラーになります。
CSRF_TRUSTED_ORIGINS = ["https://*.run.app"]

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
    "astronomy",
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

# Cloud Runのドメインからのアクセスを許可します
# 今は疎通確認なので、Cloud Runの全ドメインを許可する設定が簡単で安全です
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.run\.app$",
]

# 本番のNext.jsのURLと、ローカル開発のURLを許可します
CORS_ALLOWED_ORIGINS = [
    # "https://celestial-frontend-617827263662.asia-northeast1.run.app", # ★あなたのFrontend URLに書き換えてください
    "http://localhost:3000",
]

# Django REST Framework の設定
REST_FRAMEWORK = {
    # スキーマ生成クラスとして drf-spectacular を指定
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# drf-spectacular の設定
SPECTACULAR_SETTINGS = {
    "TITLE": "Celestial Biome API",
    "DESCRIPTION": "Space, Nature, and Coffee.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}
