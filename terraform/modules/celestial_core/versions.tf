terraform {
  required_version = ">= 1.9.0"

  required_providers {
    # 1. Google (Cloud SQL edition対応のため v6.0以上)
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }

    # 2. Random (ID生成用)
    random = {
      source  = "hashicorp/random"
      version = ">= 3.0"
    }

    # 3. Sentry (あなたが心配してくれた部分！)
    sentry = {
      source  = "jianyuan/sentry"
      version = "~> 0.11"
    }
  }
}
