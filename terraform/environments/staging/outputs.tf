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
