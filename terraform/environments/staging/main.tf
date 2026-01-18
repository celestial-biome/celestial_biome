# terraform/environments/staging/main.tf

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

# 変数定義 (ここを修正しました: 正しく改行)
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

# モジュールの呼び出し (Staging設定)
module "core" {
  source = "../../modules/celestial_core"

  # 基本変数
  project_id  = var.project_id
  region      = var.region
  github_repo = var.github_repo
  sentry_org  = var.sentry_org

  # ★Staging固有の設定★
  env_name            = "staging"                              # リソース名に "-staging" が付きます
  domain_app          = "app-staging.celestial-biome.com"      # ステージング用ドメイン
  domain_api          = "api-staging.celestial-biome.com"      # ステージング用ドメイン
  deletion_protection = false                                  # 開発用なので削除保護はオフ
}
