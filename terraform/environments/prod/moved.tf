moved {
  from = google_project_service.apis
  to   = module.core.google_project_service.apis
}
moved {
  from = google_artifact_registry_repository.app_repo
  to   = module.core.google_artifact_registry_repository.app_repo
}
moved {
  from = google_iam_workload_identity_pool.github_pool
  to   = module.core.google_iam_workload_identity_pool.github_pool
}
moved {
  from = google_iam_workload_identity_pool_provider.github_provider
  to   = module.core.google_iam_workload_identity_pool_provider.github_provider
}
# ★重要: 元の名前(github_actions_sa)から、新しい名前(github_actions)への移動
moved {
  from = google_service_account.github_actions_sa
  to   = module.core.google_service_account.github_actions
}
moved {
  from = google_project_iam_member.sa_roles
  to   = module.core.google_project_iam_member.sa_roles
}
moved {
  from = google_service_account_iam_member.wif_binding
  to   = module.core.google_service_account_iam_member.wif_binding
}
moved {
  from = google_project_service.extra_apis
  to   = module.core.google_project_service.extra_apis
}
moved {
  from = random_password.db_password
  to   = module.core.random_password.db_password
}
moved {
  from = google_secret_manager_secret.db_password_secret
  to   = module.core.google_secret_manager_secret.db_password_secret
}
moved {
  from = google_secret_manager_secret_version.db_password_version
  to   = module.core.google_secret_manager_secret_version.db_password_version
}
moved {
  from = google_sql_database_instance.postgres
  to   = module.core.google_sql_database_instance.postgres
}
moved {
  from = random_id.suffix
  to   = module.core.random_id.suffix
}
moved {
  from = google_sql_database.database
  to   = module.core.google_sql_database.database
}
moved {
  from = google_sql_user.users
  to   = module.core.google_sql_user.users
}
moved {
  from = google_project_iam_member.run_secret_access
  to   = module.core.google_project_iam_member.run_secret_access
}
moved {
  from = google_project_iam_member.run_sql_client
  to   = module.core.google_project_iam_member.run_sql_client
}
moved {
  from = google_cloud_run_v2_service.backend
  to   = module.core.google_cloud_run_v2_service.backend
}
moved {
  from = google_cloud_run_v2_service.frontend
  to   = module.core.google_cloud_run_v2_service.frontend
}
moved {
  from = google_cloud_run_service_iam_member.public_access_backend
  to   = module.core.google_cloud_run_service_iam_member.public_access_backend
}
moved {
  from = google_cloud_run_service_iam_member.public_access_frontend
  to   = module.core.google_cloud_run_service_iam_member.public_access_frontend
}
moved {
  from = google_project_iam_member.backend_bq_viewer
  to   = module.core.google_project_iam_member.backend_bq_viewer
}
moved {
  from = google_project_iam_member.backend_bq_user
  to   = module.core.google_project_iam_member.backend_bq_user
}
moved {
  from = google_cloud_run_domain_mapping.frontend_domain
  to   = module.core.google_cloud_run_domain_mapping.frontend_domain
}
moved {
  from = google_cloud_run_domain_mapping.backend_domain
  to   = module.core.google_cloud_run_domain_mapping.backend_domain
}

# --- bigquery.tf resources ---
moved {
  from = google_bigquery_dataset.default
  to   = module.core.google_bigquery_dataset.default
}
moved {
  from = google_bigquery_table.default
  to   = module.core.google_bigquery_table.default
}

# --- jobs.tf resources ---
moved {
  from = google_service_account.job_runner
  to   = module.core.google_service_account.job_runner
}
moved {
  from = google_project_iam_member.job_bq_editor
  to   = module.core.google_project_iam_member.job_bq_editor
}
moved {
  from = google_project_iam_member.job_bq_user
  to   = module.core.google_project_iam_member.job_bq_user
}
moved {
  from = google_project_iam_member.job_invoker
  to   = module.core.google_project_iam_member.job_invoker
}
moved {
  from = google_project_iam_member.job_secret_accessor
  to   = module.core.google_project_iam_member.job_secret_accessor
}
moved {
  from = google_project_iam_member.job_sql_client
  to   = module.core.google_project_iam_member.job_sql_client
}
moved {
  from = google_project_iam_member.job_log_writer
  to   = module.core.google_project_iam_member.job_log_writer
}
# Jobs
moved {
  from = google_cloud_run_v2_job.ingest_space_weather_job
  to   = module.core.google_cloud_run_v2_job.ingest_job
}
moved {
  from = google_cloud_run_v2_job.sync_space_weather_db_job
  to   = module.core.google_cloud_run_v2_job.sync_db_job
}
moved {
  from = google_cloud_run_v2_job.ingest_earthquakes_job
  to   = module.core.google_cloud_run_v2_job.ingest_earthquakes_job
}
moved {
  from = google_cloud_run_v2_job.sync_earthquakes_db_job
  to   = module.core.google_cloud_run_v2_job.sync_earthquakes_job
}
moved {
  from = google_cloud_run_v2_job.ingest_economy_job
  to   = module.core.google_cloud_run_v2_job.ingest_economy_job
}
moved {
  from = google_cloud_run_v2_job.sync_economy_db_job
  to   = module.core.google_cloud_run_v2_job.sync_economy_job
}
moved {
  from = google_cloud_run_v2_job.migrate_job
  to   = module.core.google_cloud_run_v2_job.migrate_job
}
moved {
  from = google_cloud_run_v2_job.create_superuser_job
  to   = module.core.google_cloud_run_v2_job.create_superuser_job
}
# Schedules
moved {
  from = google_cloud_scheduler_job.ingest_space_weather_schedule
  to   = module.core.google_cloud_scheduler_job.ingest_space_weather_schedule
}
moved {
  from = google_cloud_scheduler_job.sync_space_weather_db_schedule
  to   = module.core.google_cloud_scheduler_job.sync_space_weather_db_schedule
}
moved {
  from = google_cloud_scheduler_job.ingest_earthquakes_schedule
  to   = module.core.google_cloud_scheduler_job.ingest_earthquakes_schedule
}
moved {
  from = google_cloud_scheduler_job.sync_earthquakes_db_schedule
  to   = module.core.google_cloud_scheduler_job.sync_earthquakes_db_schedule
}
moved {
  from = google_cloud_scheduler_job.ingest_economy_schedule
  to   = module.core.google_cloud_scheduler_job.ingest_economy_schedule
}
moved {
  from = google_cloud_scheduler_job.sync_economy_db_schedule
  to   = module.core.google_cloud_scheduler_job.sync_economy_db_schedule
}

# --- sentry.tf resources ---
moved {
  from = sentry_team.main
  to   = module.core.sentry_team.main
}
moved {
  from = sentry_project.backend
  to   = module.core.sentry_project.backend
}
moved {
  from = sentry_project.frontend
  to   = module.core.sentry_project.frontend
}
