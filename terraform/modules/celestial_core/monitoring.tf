# 1. 通知チャンネル（メール）の作成
resource "google_monitoring_notification_channel" "email_admin" {
  display_name = "Email Admin Notification (${var.env_name})"
  type         = "email"
  labels = {
    email_address = var.notification_email
  }
}

# 2. ログベースメトリクスの作成（Cloud Run Job のエラーをカウント）
resource "google_logging_metric" "run_job_error_count" {
  name   = "run-job-error-count${local.suffix}"
  filter = "resource.type=\"cloud_run_job\" severity>=ERROR"

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
  }
}

# 3. for_each を使ったアラートポリシーの動的生成
resource "google_monitoring_alert_policy" "job_specific_alerts" {
  for_each     = toset(local.monitored_job_prefixes)
  display_name = "Cloud Run Job Failure: ${each.value} [${var.env_name}]"
  combiner     = "OR"

  conditions {
    display_name = "Error log detected in ${each.value}"
    condition_threshold {
      filter = <<EOT
        metric.type="logging.googleapis.com/user/${google_logging_metric.run_job_error_count.name}"
        AND resource.type="cloud_run_job"
        AND resource.labels.job_name = starts_with("${each.value}")
      EOT

      duration        = "0s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_COUNT"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email_admin.name
  ]

  documentation {
    content   = "ジョブ「${each.value}」でエラーが発生しました。環境: ${var.env_name}"
    mime_type = "text/markdown"
  }
}

# 監視対象ジョブのリスト定義
locals {
  monitored_job_prefixes = [
    "ingest-earthquakes-job",
    "ingest-economy-job",
    "ingest-space-weather-job",
    "sync-earthquakes-db-job",
    "sync-economy-db-job",
    "sync-space-weather-db-job"
  ]
}

# =====================================================
# Cloud Run Service SLOs
# =====================================================

# 4. Monitoring Service (SLO の親リソース)
resource "google_monitoring_service" "backend" {
  service_id   = "celestial-backend${local.suffix}"
  display_name = "Celestial Backend API [${var.env_name}]"

  basic_service {
    service_type = "CLOUD_RUN"
    service_labels = {
      service_name = google_cloud_run_v2_service.backend.name
      location     = var.region
    }
  }
}

resource "google_monitoring_service" "frontend" {
  service_id   = "celestial-frontend${local.suffix}"
  display_name = "Celestial Frontend [${var.env_name}]"

  basic_service {
    service_type = "CLOUD_RUN"
    service_labels = {
      service_name = google_cloud_run_v2_service.frontend.name
      location     = var.region
    }
  }
}

# 5. 可用性 SLO (99.5%、30日ローリングウィンドウ)
#    good = 2xx レスポンス / total = 全リクエスト
resource "google_monitoring_slo" "backend_availability" {
  service      = google_monitoring_service.backend.service_id
  slo_id       = "backend-availability${local.suffix}"
  display_name = "Backend Availability 99.5% [${var.env_name}]"

  goal                = 0.995
  rolling_period_days = 30

  request_based_sli {
    good_total_ratio {
      good_service_filter = join(" AND ", [
        "metric.type=\"run.googleapis.com/request_count\"",
        "resource.type=\"cloud_run_revision\"",
        "resource.labels.service_name=\"${google_cloud_run_v2_service.backend.name}\"",
        "metric.labels.response_code_class=\"2xx\""
      ])
      total_service_filter = join(" AND ", [
        "metric.type=\"run.googleapis.com/request_count\"",
        "resource.type=\"cloud_run_revision\"",
        "resource.labels.service_name=\"${google_cloud_run_v2_service.backend.name}\""
      ])
    }
  }
}

resource "google_monitoring_slo" "frontend_availability" {
  service      = google_monitoring_service.frontend.service_id
  slo_id       = "frontend-availability${local.suffix}"
  display_name = "Frontend Availability 99.5% [${var.env_name}]"

  goal                = 0.995
  rolling_period_days = 30

  request_based_sli {
    good_total_ratio {
      good_service_filter = join(" AND ", [
        "metric.type=\"run.googleapis.com/request_count\"",
        "resource.type=\"cloud_run_revision\"",
        "resource.labels.service_name=\"${google_cloud_run_v2_service.frontend.name}\"",
        "metric.labels.response_code_class=\"2xx\""
      ])
      total_service_filter = join(" AND ", [
        "metric.type=\"run.googleapis.com/request_count\"",
        "resource.type=\"cloud_run_revision\"",
        "resource.labels.service_name=\"${google_cloud_run_v2_service.frontend.name}\""
      ])
    }
  }
}

# 6. バーンレートアラート
#    Fast Burn: 1h ウィンドウ、バーンレート > 14.4
#      → 30日バジェットの 2% を 1時間で消費（即時対応が必要なレベル）
#    Slow Burn: 6h ウィンドウ、バーンレート > 6
#      → 30日バジェットの 5% を 6時間で消費（早急な確認が必要なレベル）
#
#    閾値の計算 (99.5% SLO, 30日):
#      エラーバジェット = 0.5% × 30d × 24h = 3.6h
#      Fast Burn 閾値: (2% × 30 × 24) / 1h  = 14.4
#      Slow Burn 閾値: (5% × 30 × 24) / 6h  = 6.0

resource "google_monitoring_alert_policy" "slo_fast_burn" {
  for_each = {
    backend  = google_monitoring_slo.backend_availability.name
    frontend = google_monitoring_slo.frontend_availability.name
  }

  display_name = "SLO Fast Burn: ${each.key} [${var.env_name}]"
  combiner     = "OR"

  conditions {
    display_name = "1h burn rate > 14.4x"
    condition_threshold {
      filter          = "select_slo_burn_rate(\"${each.value}\", 3600s)"
      comparison      = "COMPARISON_GT"
      threshold_value = 14.4
      duration        = "0s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email_admin.name]

  documentation {
    content   = "**[Fast Burn]** `${each.key}` の SLO エラーバジェットが急速に消費されています。\n\n環境: `${var.env_name}`\n\n1 時間で 30 日分バジェットの 2% を超過しました。**即時対応が必要です。**"
    mime_type = "text/markdown"
  }
}

resource "google_monitoring_alert_policy" "slo_slow_burn" {
  for_each = {
    backend  = google_monitoring_slo.backend_availability.name
    frontend = google_monitoring_slo.frontend_availability.name
  }

  display_name = "SLO Slow Burn: ${each.key} [${var.env_name}]"
  combiner     = "OR"

  conditions {
    display_name = "6h burn rate > 6x"
    condition_threshold {
      filter          = "select_slo_burn_rate(\"${each.value}\", 21600s)"
      comparison      = "COMPARISON_GT"
      threshold_value = 6
      duration        = "0s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email_admin.name]

  documentation {
    content   = "**[Slow Burn]** `${each.key}` の SLO エラーバジェットが継続的に消費されています。\n\n環境: `${var.env_name}`\n\n6 時間で 30 日分バジェットの 5% を超過しました。早急な確認が必要です。"
    mime_type = "text/markdown"
  }
}
