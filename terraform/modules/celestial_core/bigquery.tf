# ------------------------------------------------------------------------------
# 設定値 (Locals)
# ここにテーブル定義を追記していくだけで、自動的にリソースが作成されるようになります
# ------------------------------------------------------------------------------
locals {
  # データセット定義
  datasets = {
    "celestial_biome_data" = {
      dataset_id    = "celestial_biome_data${local.suffix_underscore}"
      friendly_name = "Celestial Biome Data"
      description   = "Space weather and environmental data"
      location      = var.region
    }
    # 将来データセットが増えたらここに追記
    # "another_dataset" = { ... }
  }

  # テーブル定義
  # key: テーブルID
  # value: 設定詳細
  tables = {
    "space_weather_metrics" = {
      dataset_id = "celestial_biome_data" # 所属するデータセットID
      schema     = "schemas/space_weather.json"
      partition  = true
      deletion_protection = true
    },
    "earthquakes_raw" = {
      dataset_id = "celestial_biome_data"     # 既存のデータセットを使用
      schema     = "schemas/earthquakes.json" # Step 1 で作成したスキーマファイル
      partition  = true                       # 日付パーティションを有効化
      deletion_protection = true
    },
    "economy_raw" = {
      dataset_id = "celestial_biome_data"
      schema     = "schemas/economy.json"
      partition  = true
      partition_field = "date"  # デフォルトの "timestamp" 以外のフィールドでパーティションを切る場合
      partition_type  = "MONTH"
      deletion_protection = false
    }
    # 将来テーブルが増えたらここに追記するだけ
    # "solar_wind_speed" = {
    #   dataset_id = "celestial_biome_data"
    #   schema     = "schemas/solar_wind.json"
    #   partition  = true
    #   deletion_protection = true  # 保護を有効化
    # }
  }
}

# ------------------------------------------------------------------------------
# Dataset Resource (Loop)
# ------------------------------------------------------------------------------
resource "google_bigquery_dataset" "default" {
  for_each = local.datasets

  dataset_id                  = try(each.value.dataset_id, each.key)
  friendly_name               = each.value.friendly_name
  description                 = each.value.description
  location                    = each.value.location
  default_table_expiration_ms = null

  labels = {
    env = var.env_name
  }
}

# ------------------------------------------------------------------------------
# Table Resource (Loop)
# ------------------------------------------------------------------------------
resource "google_bigquery_table" "default" {
  for_each = local.tables

  # data.google_bigquery_dataset.default[each.value.dataset_id].dataset_id ではなく
  # リソースの依存関係を明示するために、作成したデータセットリソースを参照します
  dataset_id = google_bigquery_dataset.default[each.value.dataset_id].dataset_id
  table_id   = each.key

  # パーティション設定 (flagがtrueの場合のみ有効化)
  dynamic "time_partitioning" {
    for_each = each.value.partition ? [1] : []
    content {
      type  = try(each.value.partition_type, "DAY")
      field = try(each.value.partition_field, "timestamp")
    }
  }

  schema = file("${path.module}/${each.value.schema}")

  # localsの設定値を使う (設定がない場合は true [保護] をデフォルトにする)
  deletion_protection = var.deletion_protection && try(each.value.deletion_protection, true)
}

# ------------------------------------------------------------------------------
# State Migration (重要)
# すでに作成済みのリソースを、破壊せずに新しい resource "..." "default" ブロックに紐付け直します
# ------------------------------------------------------------------------------

# 1. データセットの移行
moved {
  from = google_bigquery_dataset.celestial_biome_data
  to   = google_bigquery_dataset.default["celestial_biome_data"]
}

# 2. テーブルの移行
moved {
  from = google_bigquery_table.space_weather
  to   = google_bigquery_table.default["space_weather_metrics"]
}
