variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "Default Region"
  type        = string
  default     = "asia-northeast1"
}

variable "github_repo" {
  description = "GitHub Repository (owner/repo)"
  type        = string
}

variable "sentry_org" {
  description = "Sentry Organization Slug"
  type        = string
  default     = "celestial-biome" # Sentry組織ID
}

variable "env_name" {
  description = "Environment name (e.g., production, staging)"
  type        = string
}

variable "domain_app" {
  description = "Frontend Domain (e.g., app.celestial-biome.com)"
  type        = string
}

variable "domain_api" {
  description = "Backend Domain (e.g., api.celestial-biome.com)"
  type        = string
}

variable "deletion_protection" {
  description = "Enable deletion protection for DB/BQ"
  type        = bool
  default     = true
}
