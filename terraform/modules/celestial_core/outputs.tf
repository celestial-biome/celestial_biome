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
