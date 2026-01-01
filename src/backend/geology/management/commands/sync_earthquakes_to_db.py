import logging

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from google.cloud import bigquery

from geology.models import Earthquake

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Sync earthquake data from BigQuery to Cloud SQL (Data Mart)"

    def handle(self, *args, **options):
        project_id = settings.GOOGLE_CLOUD_PROJECT

        if not project_id:
            self.stdout.write(self.style.ERROR("GOOGLE_CLOUD_PROJECT is not set."))
            return

        try:
            client = bigquery.Client(project=project_id)

            # クエリ: 直近7日間のデータを取得
            # 同じ usgs_id が複数ある場合は最新のものを採用 (Deduplication)
            query = f"""
                SELECT * EXCEPT(rn)
                FROM (
                    SELECT
                        *,
                        ROW_NUMBER() OVER (PARTITION BY usgs_id ORDER BY timestamp DESC) as rn
                    FROM `{project_id}.celestial_biome_data.earthquakes_raw`
                    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
                )
                WHERE rn = 1
                ORDER BY timestamp DESC
            """

            self.stdout.write(f"Executing query on {project_id}...")
            query_job = client.query(query)
            rows = list(query_job.result())

            self.stdout.write(f"Fetched {len(rows)} rows from BigQuery. Updating local database...")

            # Transaction内で安全に洗い替え
            with transaction.atomic():
                # 1. 全削除
                Earthquake.objects.all().delete()

                # 2. オブジェクト生成
                new_objects = [
                    Earthquake(
                        usgs_id=row.usgs_id,
                        timestamp=row.timestamp,
                        magnitude=row.magnitude,
                        place=row.place,
                        depth=row.depth,
                        latitude=row.latitude,
                        longitude=row.longitude,
                    )
                    for row in rows
                ]

                # 3. 一括挿入
                Earthquake.objects.bulk_create(new_objects, batch_size=1000)

            self.stdout.write(self.style.SUCCESS(f"Successfully synced {len(new_objects)} earthquakes."))

        except Exception as e:
            logger.error(f"Failed to sync data: {e}")
            self.stdout.write(self.style.ERROR(f"Sync failed: {e}"))
            raise
