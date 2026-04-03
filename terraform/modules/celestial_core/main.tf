# 1. APIの有効化
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "iamcredentials.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "sqladmin.googleapis.com",
    "compute.googleapis.com",
    "firebase.googleapis.com",        # Firebase Management API
    "identitytoolkit.googleapis.com", # Identity Platform (Auth)
    "apikeys.googleapis.com",
  ])
  service            = each.key
  disable_on_destroy = false
}

# 2. Artifact Registry
resource "google_artifact_registry_repository" "app_repo" {
  location      = var.region
  repository_id = "app-repo${local.suffix}"
  description   = "Docker repository for Celestial Biome"
  format        = "DOCKER"
  depends_on    = [google_project_service.apis]
}

# 3. Workload Identity
# 3-1. Pool
resource "google_iam_workload_identity_pool" "github_pool" {
  workload_identity_pool_id = "celestial-pool${local.suffix}"

  display_name = "GitHub Actions Pool"
  depends_on   = [google_project_service.apis]
}

# 3-2. Provider (最小構成・手入力推奨)
resource "google_iam_workload_identity_pool_provider" "github_provider" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "gh-provider-cloudshell"
  display_name                       = "GitHub Actions Provider"

  # ★ここが一番怪しいので、1行だけにします。
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository == 'celestial-biome/celestial_biome'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# 3-3. Service Account
resource "google_service_account" "github_actions" {
  account_id   = "github-actions-sa${local.suffix}"
  display_name = "Service Account for GitHub Actions"
}

# 3-4. IAM Binding (Roles)
resource "google_project_iam_member" "sa_roles" {
  for_each = toset([
    "roles/run.admin",
    "roles/artifactregistry.writer",
    "roles/iam.serviceAccountUser",
  ])
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# 3-5. IAM Binding (リポジトリ制限なし・全許可)
resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"

  # ★マッピングを減らしたので、条件も「プール内の全ID許可」に緩めます
  member = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/*"
}

# -----------------------------------------------------
# 5. 追加APIの有効化 (Secret Manager, SQL Admin)
# -----------------------------------------------------
resource "google_project_service" "extra_apis" {
  for_each = toset([
    "secretmanager.googleapis.com",
    "sqladmin.googleapis.com",
    "cloudscheduler.googleapis.com", # Cloud Scheduler API を有効化
  ])
  service            = each.key
  disable_on_destroy = false
}

# -----------------------------------------------------
# 6. ランダムなDBパスワードの生成
# -----------------------------------------------------
resource "random_password" "db_password" {
  length  = 16
  special = false # 記号を含めると接続文字列でトラブルになることがあるため今回はオフ
}

# -----------------------------------------------------
# 6-1. Django SECRET_KEY の設定
# -----------------------------------------------------

# Django SECRET_KEY 用のランダム文字列生成
resource "random_password" "django_secret" {
  length  = 50
  special = true
}

# Secret Manager に保存
resource "google_secret_manager_secret" "django_secret_key" {
  secret_id = "django-secret-key${local.suffix}"
  replication {
    auto {}
  }
  depends_on = [google_project_service.extra_apis]
}

resource "google_secret_manager_secret_version" "django_secret_key_version" {
  secret      = google_secret_manager_secret.django_secret_key.id
  secret_data = random_password.django_secret.result
}

# -----------------------------------------------------
# 7. Secret Manager (パスワードを金庫に保存)
# -----------------------------------------------------
resource "google_secret_manager_secret" "db_password_secret" {
  secret_id = "db-password${local.suffix}"
  replication {
    auto {}
  }
  depends_on = [google_project_service.extra_apis]
}

resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password_secret.id
  secret_data = random_password.db_password.result
}

# -----------------------------------------------------
# 8. Cloud SQL (PostgreSQL)
# -----------------------------------------------------
resource "google_sql_database_instance" "postgres" {
  name             = "celestial-db-instance-${random_id.suffix.hex}"
  database_version = "POSTGRES_16"
  region           = var.region

  # 検証環境なので削除保護はOFF (本番用変数がある場合は var.deletion_protection に戻してください)
  deletion_protection = false

  settings {
    tier    = "db-f1-micro"
    edition = "ENTERPRISE"

    ip_configuration {
      ipv4_enabled = true
    }

    # Staging はデータを BigQuery から再生成できるためバックアップ不要
    backup_configuration {
      enabled = var.env_name == "production"
    }

    # Staging はストレージを最小値で固定（自動拡張によるコスト増を防止）
    disk_size       = 10
    disk_autoresize = var.env_name == "production"
  }

  depends_on = [google_project_service.extra_apis]
}

# DBインスタンス名の重複回避用サフィックス
resource "random_id" "suffix" {
  byte_length = 4
}

# -----------------------------------------------------
# 9. データベースとユーザーの作成
# -----------------------------------------------------
resource "google_sql_database" "database" {
  name     = "celestial_db"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "users" {
  name     = "celestial_user"
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}

# -----------------------------------------------------
# 10. アウトプット (Cloud Run設定時に使用)
# -----------------------------------------------------

# -----------------------------------------------------
# 11. Cloud Run 用のサービスアカウント権限設定
# -----------------------------------------------------
# デフォルトの Compute Engine サービスアカウントを取得
data "google_compute_default_service_account" "default" {
  depends_on = [google_project_service.apis]
}

# 1. Secret Manager へのアクセス権 (DBパスワード取得用)
resource "google_project_iam_member" "run_secret_access" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${data.google_compute_default_service_account.default.email}"
}

# 2. Cloud SQL への接続権
resource "google_project_iam_member" "run_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${data.google_compute_default_service_account.default.email}"
}

# -----------------------------------------------------
# 12. Cloud Run (Backend - Django)
# -----------------------------------------------------
resource "google_cloud_run_v2_service" "backend" {
  name     = "celestial-backend${local.suffix}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL" # 公開設定

  template {
    containers {
      # 初回はGoogleのサンプルイメージで枠だけ作る
      # (後でGitHub Actionsが正しいアプリで上書きします)
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      # 環境変数 (Django用)
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      # 許可するホスト名を指定（カンマ区切り）
      # ここに含まれないドメイン（*.run.app など）でアクセスすると
      # Djangoが "400 Bad Request" を返してブロックします。
      env {
        name  = "ALLOWED_HOSTS"
        value = var.env_name == "production" ? ".run.app,api.celestial-biome.com,localhost,127.0.0.1" : ".run.app,api-staging.celestial-biome.com,localhost,127.0.0.1"
      }
      env {
        name  = "DEBUG"
        value = "False"
      }
      env {
        name  = "DB_HOST"
        value = "/cloudsql/${google_sql_database_instance.postgres.connection_name}"
      }
      env {
        name  = "DB_NAME"
        value = google_sql_database.database.name
      }
      env {
        name  = "DB_USER"
        value = google_sql_user.users.name
      }
      # DBパスワードはSecret Managerから直接注入
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password_secret.secret_id
            version = "latest"
          }
        }
      }
      # Django SECRET_KEY を注入
      env {
        name = "DJANGO_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.django_secret_key.secret_id
            version = "latest"
          }
        }
      }
      # フロントエンドのURLを渡す (CORS設定用)
      # Django側でこれを受け取って CORS_ALLOWED_ORIGINS に追加
      env {
        name  = "FRONTEND_URL"
        value = var.env_name == "production" ? "https://app.celestial-biome.com" : "https://app-staging.celestial-biome.com"
      }
      env {
        name  = "INFERENCE_API_URL"
        value = var.env_name == "production" ? "https://inference.celestial-biome.com" : "https://inference-staging.celestial-biome.com"
      }
      # Sentry関連の環境変数
      env {
        name  = "SENTRY_DSN"
        value = data.sentry_key.backend.dsn["public"]
      }
      env {
        name  = "SENTRY_ENVIRONMENT"
        value = "development" # または "production"
      }
      env {
        name  = "SENTRY_TRACES_SAMPLE_RATE"
        value = "1.0" # 開発環境なら 1.0 (全件) でもOK
      }

      # Cloud SQL 接続インスタンスの指定
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres.connection_name]
      }
    }
  }

  # ★重要: Terraform は今後、イメージの変更を無視する (デプロイはGitHub Actionsの仕事)
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].labels,
      client,
      client_version,
      scaling,
    ]
  }

  depends_on = [
    google_project_iam_member.run_secret_access,
    google_project_iam_member.run_sql_client,
    google_secret_manager_secret_version.django_secret_key_version
  ]
}

# -----------------------------------------------------
# 13. Cloud Run (Frontend - Next.js)
# -----------------------------------------------------
resource "google_cloud_run_v2_service" "frontend" {
  name     = "celestial-frontend${local.suffix}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      # BackendのURLを環境変数として渡す
      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = google_cloud_run_v2_service.backend.uri
      }
      # Sentry関連の環境変数
      env {
        name  = "SENTRY_DSN"
        value = data.sentry_key.frontend.dsn["public"]
      }
      env {
        name  = "SENTRY_ENVIRONMENT"
        value = "development"
      }
      # この環境の正規URLを渡す（staging か prod で動的に変更）
      env {
        name  = "CANONICAL_URL"
        value = var.env_name == "production" ? "https://app.celestial-biome.com" : "https://app-staging.celestial-biome.com"
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].labels,
      client,
      client_version,
      scaling,
    ]
  }
}

# -----------------------------------------------------
# 14. 誰でもアクセス可能にする設定 (未認証アクセス許可)
# -----------------------------------------------------
resource "google_cloud_run_service_iam_member" "public_access_backend" {
  service  = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "public_access_frontend" {
  service  = google_cloud_run_v2_service.frontend.name
  location = google_cloud_run_v2_service.frontend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# -----------------------------------------------------
# 15. URLのアウトプット
# -----------------------------------------------------


# -----------------------------------------------------
# 16. Backend (Default Compute SA) に BigQuery の読み取り権限を付与
# -----------------------------------------------------
resource "google_project_iam_member" "backend_bq_viewer" {
  project = var.project_id
  role    = "roles/bigquery.dataViewer"
  member  = "serviceAccount:${data.google_compute_default_service_account.default.email}"
}

resource "google_project_iam_member" "backend_bq_user" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${data.google_compute_default_service_account.default.email}"
}

# -----------------------------------------------------
# 17. カスタムドメインマッピング (Frontend)
# -----------------------------------------------------
resource "google_cloud_run_domain_mapping" "frontend_domain" {
  location = var.region
  name     = var.domain_app # サブドメイン

  metadata {
    namespace = var.project_id
  }

  spec {
    # マッピング先のCloud Runサービス名
    route_name = google_cloud_run_v2_service.frontend.name
  }
}

# -----------------------------------------------------
# 18. カスタムドメインマッピング (Backend)
# -----------------------------------------------------
resource "google_cloud_run_domain_mapping" "backend_domain" {
  location = var.region
  name     = var.domain_api # サブドメイン

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.backend.name
  }
}

# -----------------------------------------------------
# 19. Firebase Authentication Configuration
# -----------------------------------------------------

# GCPプロジェクトでFirebaseを有効化
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  # APIが有効化されてから実行
  depends_on = [google_project_service.apis]
}

# Firebase Web App の作成 (Frontend用)
resource "google_firebase_web_app" "frontend" {
  provider     = google-beta
  project      = var.project_id
  display_name = "Celestial Biome Frontend (${var.env_name})"

  # Firebaseプロジェクト有効化後に作成
  depends_on = [google_firebase_project.default]
}

# Web Appの設定値（API Keyなど）を取得するデータソース
data "google_firebase_web_app_config" "frontend" {
  provider   = google-beta
  web_app_id = google_firebase_web_app.frontend.app_id
  project    = var.project_id
}

# Identity Platform (Auth) の設定
# ここで Email/Password 認証を有効化します
#resource "google_identity_platform_config" "auth_config" {
#  project  = var.project_id
#
#  sign_in {
#    email {
#      enabled           = true
#      password_required = true # パスワード必須
#    }
#    # 必要に応じてここにGoogleログインなどを追加可能
#    # anonymous { enabled = true }
#  }
#
#  depends_on = [google_firebase_project.default]
#}

# Backend (Cloud Run SA) に Firebase の検証権限を付与
# IDトークンの検証やユーザー情報の取得に必要です
resource "google_project_iam_member" "backend_firebase_viewer" {
  project = var.project_id
  # ユーザー情報の参照権限 (verify_id_token等で必要になる場合がある)
  role   = "roles/firebaseauth.viewer"
  member = "serviceAccount:${data.google_compute_default_service_account.default.email}"
}

# -----------------------------------------------------
# 20. API Key Restriction (Browser Key)
# -----------------------------------------------------
resource "google_apikeys_key" "firebase_key" {
  # env_name が 'staging' の時だけ管理する（または 'prod' だけ管理する）
  count        = var.env_name == "staging" ? 1 : 0
  name         = "firebase-api-key${local.suffix}"        # Terraform上の識別名
  display_name = "Browser key (auto created by Firebase)"
  project      = var.project_id

  restrictions {
    browser_key_restrictions {
      allowed_referrers = [
        "https://app.celestial-biome.com/*",
        "https://app-staging.celestial-biome.com/*",
        "http://localhost:3000/*",
        "https://celestial-biome-480601.firebaseapp.com/*",
        "https://celestial-biome-480601.web.app/*",
        "https://*.run.app/*"
      ]
    }

    # 許可するAPI (Identity ToolkitなどがFirebase Authに必須)
    api_targets {
      service = "identitytoolkit.googleapis.com"
    }
    api_targets {
      service = "firebase.googleapis.com"
    }
  }

  depends_on = [google_project_service.apis]
}

# -----------------------------------------------------
# Admin Superuser Password
# -----------------------------------------------------
resource "random_password" "admin_password" {
  length  = 16
  special = false # トラブル防止のため記号なし
}

resource "google_secret_manager_secret" "admin_password_secret" {
  secret_id = "admin-password${local.suffix}"
  replication {
    auto {}
  }
  depends_on = [google_project_service.extra_apis]
}

resource "google_secret_manager_secret_version" "admin_password_version" {
  secret      = google_secret_manager_secret.admin_password_secret.id
  secret_data = random_password.admin_password.result
}
