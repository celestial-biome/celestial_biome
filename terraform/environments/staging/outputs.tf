output "backend_url" {
  value = module.core.backend_url
}

output "frontend_url" {
  value = module.core.frontend_url
}

output "db_instance_connection_name" {
  value = module.core.db_instance_connection_name
}

output "service_account_email" {
  value = module.core.service_account_email
}

output "domain_mapping_records" {
  value = module.core.domain_mapping_records_frontend
}

output "backend_domain_mapping_records" {
  value = module.core.domain_mapping_records_backend
}

output "firebase_config" {
  description = "Firebase configuration for Frontend"
  value       = module.core.firebase_config
  sensitive   = true
}

output "sentry_frontend_dsn" {
  description = "Sentry DSN for Frontend (Next.js)"
  value       = module.core.sentry_frontend_dsn
  sensitive   = true
}
