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
