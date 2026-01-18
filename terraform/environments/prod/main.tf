terraform {
  required_version = ">= 1.9.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    sentry = {
      source  = "jianyuan/sentry"
      version = "~> 0.11"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "sentry" {}

# 変数定義 (ここを修正しました)
variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "asia-northeast1"
}

variable "github_repo" {
  type = string
}

variable "sentry_org" {
  type    = string
  default = "celestial-biome"
}

# モジュールの呼び出し
module "core" {
  source = "../../modules/celestial_core"

  # 基本変数
  project_id  = var.project_id
  region      = var.region
  github_repo = var.github_repo
  sentry_org  = var.sentry_org

  # 本番固有の設定
  env_name            = "production"
  domain_app          = "app.celestial-biome.com"
  domain_api          = "api.celestial-biome.com"
  deletion_protection = true
}
