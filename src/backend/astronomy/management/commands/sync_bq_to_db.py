import logging
import os

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from google.cloud import bigquery

from astronomy.models import SpaceWeatherLog

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Sync space weather data from BigQuery to PostgreSQL (Data Mart)"

    def handle(self, *args, **options):
        project_id = settings.GOOGLE_CLOUD_PROJECT
        dataset_id = os.getenv("BQ_DATASET_ID", "celestial_biome_data")
        # ローカル実行時に .env から読み込めていない場合のガード
        if not project_id:
            # フォールバック (必要であれば記述、基本は設定エラーとして扱う)
            self.stdout.write(self.style.ERROR("GOOGLE_CLOUD_PROJECT is not set."))
            return

        try:
            client = bigquery.Client(project=project_id)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to create BigQuery client: {e}"))
            return

        # 直近7日間のデータを取得するクエリ
        query = f"""
            SELECT timestamp, metric, AVG(value) as value
            FROM `{project_id}.{dataset_id}.space_weather_metrics`
            WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 DAY)
            GROUP BY timestamp, metric
            ORDER BY timestamp ASC
        """

        try:
            self.stdout.write(f"Executing query on {project_id}...")
            query_job = client.query(query)
            rows = list(query_job.result())

            self.stdout.write(f"Fetched {len(rows)} rows. Updating database...")

            # -----------------------------------------------
            # 洗い替え処理 (Atomic Transaction)
            # -----------------------------------------------
            with transaction.atomic():
                # 1. 全データ削除
                SpaceWeatherLog.objects.all().delete()

                # 2. オブジェクト作成
                new_objects = [
                    SpaceWeatherLog(timestamp=row.timestamp, metric=row.metric, value=row.value) for row in rows
                ]

                # 3. 一括保存 (高速化)
                SpaceWeatherLog.objects.bulk_create(new_objects, batch_size=1000)

            self.stdout.write(self.style.SUCCESS(f"Successfully synced {len(new_objects)} records."))

        except Exception as e:
            logger.error(f"Failed to sync data: {e}")
            self.stdout.write(self.style.ERROR(f"Error: {e}"))
            raise
