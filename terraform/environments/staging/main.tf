# terraform/environments/staging/main.tf

terraform {
  required_version = ">= 1.9.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
    sentry = {
      source  = "jianyuan/sentry"
      version = "~> 0.11"
    }
  }
  cloud {
    organization = "celestial-biome"
    workspaces {
      name = "celestial-biome-staging"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  # 課金プロジェクトを明示して API エラーを防ぐ
  user_project_override = true
  billing_project       = var.project_id
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
  user_project_override = true

  # 課金プロジェクトを明示的に指定して、迷子になるのを防ぎます
  billing_project       = var.project_id
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

  providers = {
    google = google
    google-beta = google-beta
  }

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
