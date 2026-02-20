output "backend_url" {
  value = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  value = google_cloud_run_v2_service.frontend.uri
}

output "db_instance_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "service_account_email" {
  value = google_service_account.github_actions.email
}

output "domain_mapping_records_frontend" {
  value = google_cloud_run_domain_mapping.frontend_domain.status[0].resource_records
}

output "domain_mapping_records_backend" {
  value = google_cloud_run_domain_mapping.backend_domain.status[0].resource_records
}

# 以前の main.tf に含まれていた追加の出力
output "db_password_secret_id" {
  value = google_secret_manager_secret.db_password_secret.id
}

output "wif_provider_name" {
  value = google_iam_workload_identity_pool_provider.github_provider.name
}

output "firebase_config" {
  description = "Firebase configuration for Frontend"
  sensitive   = true # API Keyが含まれるためsensitive推奨ですが、Web API Keyは公開情報扱いです
  value = {
    api_key             = data.google_firebase_web_app_config.frontend.api_key
    auth_domain         = data.google_firebase_web_app_config.frontend.auth_domain
    project_id          = var.project_id
    storage_bucket      = data.google_firebase_web_app_config.frontend.storage_bucket
    messaging_sender_id = data.google_firebase_web_app_config.frontend.messaging_sender_id
    app_id              = google_firebase_web_app.frontend.app_id
  }
}

output "sentry_frontend_dsn" {
  description = "Sentry DSN for Frontend (Next.js)"
  sensitive   = true
  value       = data.sentry_key.frontend.dsn["public"]
}
