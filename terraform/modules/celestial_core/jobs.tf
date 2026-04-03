# -----------------------------------------------------
# 1. ジョブ実行用のサービスアカウント作成
# -----------------------------------------------------
resource "google_service_account" "job_runner" {
  # 本番は既存の長い名前を維持し、それ以外(Staging)は "job-runner-staging" (18文字) に短縮する
  account_id   = var.env_name == "production" ? "space-weather-job-runner" : "job-runner${local.suffix}"
  display_name = "Space Weather Job Runner"
}

# -----------------------------------------------------
# 2. 権限設定 (BigQueryへの書き込み + ジョブ実行権限)
# -----------------------------------------------------

# BigQuery へのデータ書き込み権限
resource "google_project_iam_member" "job_bq_editor" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.job_runner.email}"
}

# BigQuery でクエリジョブを実行する権限
resource "google_project_iam_member" "job_bq_user" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.job_runner.email}"
}

# Cloud Scheduler がこの SA を使って Cloud Run Job を叩くための権限
resource "google_project_iam_member" "job_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.job_runner.email}"
}

# Secret Manager へのアクセス権
resource "google_project_iam_member" "job_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.job_runner.email}"
}

# Cloud SQL への接続権 (DB接続に必須)
resource "google_project_iam_member" "job_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.job_runner.email}"
}

# ==============================================================================
# SPACE WEATHER JOBS (Existing)
# ==============================================================================

# -----------------------------------------------------
# 3. Cloud Run Job (Space Weather Ingest)
# -----------------------------------------------------
resource "google_cloud_run_v2_job" "ingest_job" {
  name                = "ingest-space-weather-job${local.suffix}"
  location            = var.region
  deletion_protection = false

  template {
    template {
      service_account = google_service_account.job_runner.email

      containers {
        image   = "us-docker.pkg.dev/cloudrun/container/hello" # CI/CDで更新
        command = ["python", "manage.py", "ingest_space_weather"]

        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }
        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
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
        env {
          name = "DB_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.db_password_secret.secret_id
              version = "latest"
            }
          }
        }
        env {
          name = "DJANGO_SECRET_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.django_secret_key.secret_id
              version = "latest"
            }
          }
        }
        env {
          name  = "BQ_DATASET_ID"
          value = var.env_name == "production" ? "celestial_biome_data" : "celestial_biome_data_staging"
        }

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
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
      launch_stage,
      client,
      client_version,
    ]
  }
}

# -----------------------------------------------------
# 4. Cloud Scheduler (Space Weather Ingest Trigger)
# -----------------------------------------------------
resource "google_cloud_scheduler_job" "ingest_schedule" {
  name             = "schedule-space-weather${local.suffix}"
  description      = "Trigger Cloud Run Job to ingest space weather data"
  schedule         = "0 * * * *" # 毎時0分
  time_zone        = "Asia/Tokyo"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.ingest_job.name}:run"

    oauth_token {
      service_account_email = google_service_account.job_runner.email
    }
  }
}

# -----------------------------------------------------
# 5. Cloud Run Job (Space Weather Sync: BQ -> Cloud SQL)
# -----------------------------------------------------
resource "google_cloud_run_v2_job" "sync_db_job" {
  name                = "sync-space-weather-db-job${local.suffix}"
  location            = var.region
  deletion_protection = false

  template {
    template {
      service_account = google_service_account.job_runner.email

      containers {
        image   = "us-docker.pkg.dev/cloudrun/container/hello"
        command = ["python", "manage.py", "sync_bq_to_db"]

        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }
        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
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
        env {
          name = "DB_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.db_password_secret.secret_id
              version = "latest"
            }
          }
        }
        env {
          name = "DJANGO_SECRET_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.django_secret_key.secret_id
              version = "latest"
            }
          }
        }
        env {
          name  = "BQ_DATASET_ID"
          value = var.env_name == "production" ? "celestial_biome_data" : "celestial_biome_data_staging"
        }

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
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
      launch_stage,
      client,
      client_version,
    ]
  }
}

# -----------------------------------------------------
# 6. Cloud Scheduler (Space Weather Sync Trigger)
# -----------------------------------------------------
resource "google_cloud_scheduler_job" "sync_schedule" {
  name             = "schedule-sync-space-weather${local.suffix}"
  description      = "Trigger Cloud Run Job to sync space weather data from BQ to DB"
  schedule         = "5 * * * *" # 毎時5分
  time_zone        = "Asia/Tokyo"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.sync_db_job.name}:run"

    oauth_token {
      service_account_email = google_service_account.job_runner.email
    }
  }
}


# ==============================================================================
# EARTHQUAKE JOBS (New)
# ==============================================================================

# -----------------------------------------------------
# 7. Cloud Run Job (Earthquake Ingest: USGS -> BQ)
# -----------------------------------------------------
resource "google_cloud_run_v2_job" "ingest_earthquakes_job" {
  name                = "ingest-earthquakes-job${local.suffix}"
  location            = var.region
  deletion_protection = false

  template {
    template {
      service_account = google_service_account.job_runner.email

      containers {
        image = "us-docker.pkg.dev/cloudrun/container/hello" # CI/CDで更新
        # 新しいコマンドを指定
        command = ["python", "manage.py", "ingest_earthquakes"]

        # 環境変数は既存Jobと同じ (共通DB/Project設定)
        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }
        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
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
        env {
          name = "DB_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.db_password_secret.secret_id
              version = "latest"
            }
          }
        }
        env {
          name = "DJANGO_SECRET_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.django_secret_key.secret_id
              version = "latest"
            }
          }
        }
        env {
          name  = "BQ_DATASET_ID"
          value = var.env_name == "production" ? "celestial_biome_data" : "celestial_biome_data_staging"
        }

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
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
      launch_stage,
      client,
      client_version,
    ]
  }
}

# -----------------------------------------------------
# 8. Cloud Scheduler (Earthquake Ingest Trigger)
# -----------------------------------------------------
resource "google_cloud_scheduler_job" "ingest_earthquakes_trigger" {
  name             = "schedule-ingest-earthquakes${local.suffix}"
  description      = "Trigger Cloud Run Job to ingest earthquake data (Every 15 mins)"
  schedule         = "*/15 * * * *" # 15分ごとに実行
  time_zone        = "Asia/Tokyo"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.ingest_earthquakes_job.name}:run"

    oauth_token {
      service_account_email = google_service_account.job_runner.email
    }
  }
}

# -----------------------------------------------------
# 9. Cloud Run Job (Earthquake Sync: BQ -> Cloud SQL)
# -----------------------------------------------------
resource "google_cloud_run_v2_job" "sync_earthquakes_job" {
  name                = "sync-earthquakes-db-job${local.suffix}"
  location            = var.region
  deletion_protection = false

  template {
    template {
      service_account = google_service_account.job_runner.email

      containers {
        image = "us-docker.pkg.dev/cloudrun/container/hello"
        # 新しい同期コマンドを指定
        command = ["python", "manage.py", "sync_earthquakes_to_db"]

        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }
        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
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
        env {
          name = "DB_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.db_password_secret.secret_id
              version = "latest"
            }
          }
        }
        env {
          name = "DJANGO_SECRET_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.django_secret_key.secret_id
              version = "latest"
            }
          }
        }
        env {
          name  = "BQ_DATASET_ID"
          value = var.env_name == "production" ? "celestial_biome_data" : "celestial_biome_data_staging"
        }

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
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
      launch_stage,
      client,
      client_version,
    ]
  }
}

# -----------------------------------------------------
# 10. Cloud Scheduler (Earthquake Sync Trigger)
# -----------------------------------------------------
resource "google_cloud_scheduler_job" "sync_earthquakes_trigger" {
  name        = "schedule-sync-earthquakes${local.suffix}"
  description = "Trigger Cloud Run Job to sync earthquake data to DB"
  # Ingestの5分後に実行 (毎時 5, 20, 35, 50分)
  schedule         = "5,20,35,50 * * * *"
  time_zone        = "Asia/Tokyo"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.sync_earthquakes_job.name}:run"

    oauth_token {
      service_account_email = google_service_account.job_runner.email
    }
  }
}

# ==============================================================================
# ECONOMY JOBS (New)
# ==============================================================================

# -----------------------------------------------------
# 11. Cloud Run Job (Economy Ingest: Yahoo/WB -> BQ)
# -----------------------------------------------------
resource "google_cloud_run_v2_job" "ingest_economy_job" {
  name                = "ingest-economy-job${local.suffix}"
  location            = var.region
  deletion_protection = false

  template {
    template {
      service_account = google_service_account.job_runner.email

      containers {
        image = "us-docker.pkg.dev/cloudrun/container/hello" # CI/CDで更新
        command = ["python", "manage.py", "ingest_economy"]

        # 環境変数は他と同じ
        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }
        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
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
        env {
          name = "DB_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.db_password_secret.secret_id
              version = "latest"
            }
          }
        }
        env {
          name = "DJANGO_SECRET_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.django_secret_key.secret_id
              version = "latest"
            }
          }
        }
        env {
          name  = "BQ_DATASET_ID"
          value = var.env_name == "production" ? "celestial_biome_data" : "celestial_biome_data_staging"
        }

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
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
      launch_stage,
      client,
      client_version,
    ]
  }
}

# -----------------------------------------------------
# 12. Cloud Scheduler (Economy Ingest Trigger)
# -----------------------------------------------------
resource "google_cloud_scheduler_job" "ingest_economy_trigger" {
  name             = "schedule-ingest-economy${local.suffix}"
  description      = "Trigger Cloud Run Job to ingest economy data (Daily 07:00 JST)"
  schedule         = "0 7 * * *" # 毎日 07:00 JST
  time_zone        = "Asia/Tokyo"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.ingest_economy_job.name}:run"

    oauth_token {
      service_account_email = google_service_account.job_runner.email
    }
  }
}

# -----------------------------------------------------
# 13. Cloud Run Job (Economy Sync: BQ -> Cloud SQL)
# -----------------------------------------------------
resource "google_cloud_run_v2_job" "sync_economy_job" {
  name                = "sync-economy-db-job${local.suffix}"
  location            = var.region
  deletion_protection = false

  template {
    template {
      service_account = google_service_account.job_runner.email

      containers {
        image = "us-docker.pkg.dev/cloudrun/container/hello"
        command = ["python", "manage.py", "sync_economy_db"]

        # 環境変数は省略（ingestと同じ設定を入れる）
        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }
        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
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
        env {
          name = "DB_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.db_password_secret.secret_id
              version = "latest"
            }
          }
        }
        env {
          name = "DJANGO_SECRET_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.django_secret_key.secret_id
              version = "latest"
            }
          }
        }
        env {
          name  = "BQ_DATASET_ID"
          value = var.env_name == "production" ? "celestial_biome_data" : "celestial_biome_data_staging"
        }

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
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
      launch_stage,
      client,
      client_version,
    ]
  }
}

# -----------------------------------------------------
# 14. Cloud Scheduler (Economy Sync Trigger)
# -----------------------------------------------------
resource "google_cloud_scheduler_job" "sync_economy_trigger" {
  name             = "schedule-sync-economy${local.suffix}"
  description      = "Trigger Cloud Run Job to sync economy data to DB (Daily 07:30 JST)"
  schedule         = "30 7 * * *" # 毎日 07:30 JST
  time_zone        = "Asia/Tokyo"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.sync_economy_job.name}:run"

    oauth_token {
      service_account_email = google_service_account.job_runner.email
    }
  }
}

# -----------------------------------------------------
# 15. Cloud Run Job (DB Migration)
# -----------------------------------------------------
resource "google_cloud_run_v2_job" "migrate_job" {
  name                = "migrate-job${local.suffix}"  # deploy.yml の指定名と一致させる
  location            = var.region
  deletion_protection = false

  template {
    template {
      service_account = google_service_account.job_runner.email

      containers {
        # 初回はダミー、以降はGitHub Actionsが更新する
        image = "us-docker.pkg.dev/cloudrun/container/hello"

        # ★ここが重要: マイグレーションを実行するコマンド
        command = ["python", "manage.py", "migrate"]

        # --- 以下、DB接続用の環境変数 (他のJobと同じ) ---
        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }
        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
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
        env {
          name = "DB_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.db_password_secret.secret_id
              version = "latest"
            }
          }
        }
        env {
          name = "DJANGO_SECRET_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.django_secret_key.secret_id
              version = "latest"
            }
          }
        }

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
  }
  depends_on = [
    google_secret_manager_secret_version.django_secret_key_version
  ]

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
      launch_stage,
      client,
      client_version,
    ]
  }
}

# -----------------------------------------------------
# 16. Cloud Run Job (Create Superuser)
# -----------------------------------------------------
resource "google_cloud_run_v2_job" "create_superuser_job" {
  name                = "create-superuser-job${local.suffix}"
  location            = var.region
  deletion_protection = false

  # パスワードの中身（Version）が作成されるまで待機する設定
  depends_on = [
    google_secret_manager_secret_version.admin_password_version
  ]

  template {
    template {
      service_account = google_service_account.job_runner.email

      containers {
        # アプリのイメージを使用 (CI/CDで更新されるので初回はhelloでもOKだが、アプリコード必須)
        # ※注意: ここが hello だと manage.py が無いので失敗します。
        # 初回構築時はエラーになりますが、デプロイ後に実行すればOKです。
        image = "us-docker.pkg.dev/cloudrun/container/hello"

        # 非対話モードでsuperuserを作成するコマンド
        command = [
          "python", "manage.py", "createsuperuser",
          "--noinput",
          "--username", "admin", # ユーザー名は固定
          "--email", "admin@celestial-biome.com"
        ]

        # パスワードを環境変数として渡す (Djangoがこれを読み取ってパスワードに設定する)
        env {
          name = "DJANGO_SUPERUSER_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.admin_password_secret.secret_id
              version = "latest"
            }
          }
        }

        # --- 以下、DB接続用共通設定 (他のJobと同じ) ---
        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
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
        env {
          name = "DB_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.db_password_secret.secret_id
              version = "latest"
            }
          }
        }
        env {
          name = "DJANGO_SECRET_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.django_secret_key.secret_id
              version = "latest"
            }
          }
        }

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
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
      launch_stage,
      client,
      client_version,
    ]
  }
}

# ==============================================================================
# STAGING ONLY: Cloud SQL scheduled stop/start to reduce compute costs
# db-f1-micro runs ~$7.67/month; stopping nights/weekends saves ~$3.5/month
# ==============================================================================

# NOTE: job_runner SA に roles/cloudsql.editor（または cloudsql.instances.update を含む
# カスタムロール）の付与が必要だが、TF Cloud SA の権限制限により Terraform では管理不可。
# GCP Console → IAM & Admin → IAM で手動付与が必要:
#   Member: job-runner-staging@celestial-biome-480601.iam.gserviceaccount.com
#   Role: Cloud SQL Editor

# Cloud Run Job: START (activation_policy = ALWAYS)
resource "google_cloud_run_v2_job" "sql_start_job" {
  count               = var.env_name == "production" ? 0 : 1
  name                = "sql-start-job-staging"
  location            = var.region
  deletion_protection = false

  template {
    template {
      service_account = google_service_account.job_runner.email

      containers {
        image   = "gcr.io/google.com/cloudsdktool/google-cloud-cli:slim"
        command = ["gcloud"]
        args = [
          "sql", "instances", "patch",
          google_sql_database_instance.postgres.name,
          "--activation-policy=ALWAYS",
          "--project=${var.project_id}",
        ]
      }
    }
  }

  lifecycle {
    ignore_changes = [launch_stage, client, client_version]
  }
}

# Cloud Run Job: STOP (activation_policy = NEVER)
resource "google_cloud_run_v2_job" "sql_stop_job" {
  count               = var.env_name == "production" ? 0 : 1
  name                = "sql-stop-job-staging"
  location            = var.region
  deletion_protection = false

  template {
    template {
      service_account = google_service_account.job_runner.email

      containers {
        image   = "gcr.io/google.com/cloudsdktool/google-cloud-cli:slim"
        command = ["gcloud"]
        args = [
          "sql", "instances", "patch",
          google_sql_database_instance.postgres.name,
          "--activation-policy=NEVER",
          "--project=${var.project_id}",
        ]
      }
    }
  }

  lifecycle {
    ignore_changes = [launch_stage, client, client_version]
  }
}

# Cloud Scheduler: START at 09:00 JST weekdays
resource "google_cloud_scheduler_job" "sql_start_schedule" {
  count            = var.env_name == "production" ? 0 : 1
  name             = "sql-start-staging"
  description      = "Start staging Cloud SQL at 09:00 JST on weekdays"
  schedule         = "0 9 * * 1-5"
  time_zone        = "Asia/Tokyo"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.sql_start_job[0].name}:run"

    oauth_token {
      service_account_email = google_service_account.job_runner.email
    }
  }
}

# Cloud Scheduler: STOP at 20:00 JST weekdays (covers nights + weekend)
resource "google_cloud_scheduler_job" "sql_stop_schedule" {
  count            = var.env_name == "production" ? 0 : 1
  name             = "sql-stop-staging"
  description      = "Stop staging Cloud SQL at 20:00 JST on weekdays"
  schedule         = "0 20 * * 1-5"
  time_zone        = "Asia/Tokyo"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.sql_stop_job[0].name}:run"

    oauth_token {
      service_account_email = google_service_account.job_runner.email
    }
  }
}
