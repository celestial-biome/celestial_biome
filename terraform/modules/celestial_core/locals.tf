locals {
  # 本番環境(production)なら空文字、それ以外なら "-staging" などを付与
  suffix = var.env_name == "production" ? "" : "-${var.env_name}"

  # BigQueryなどはアンダースコアが好ましいため別定義
  suffix_underscore = var.env_name == "production" ? "" : "_${var.env_name}"
}
