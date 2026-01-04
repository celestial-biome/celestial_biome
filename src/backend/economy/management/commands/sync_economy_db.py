from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from google.cloud import bigquery

from economy.models import EconomicIndicator


class Command(BaseCommand):
    help = "Sync data from BigQuery to Cloud SQL with robust fetching"

    def handle(self, *args, **options):
        client = bigquery.Client()
        project_id = settings.GOOGLE_CLOUD_PROJECT

        # データの存在確認
        count_query = f"SELECT count(*) as total FROM `{project_id}.celestial_biome_data.economy_raw`"
        count_job = client.query(count_query)
        total_rows = list(count_job)[0].total
        self.stdout.write(f"BigQuery Total Rows: {total_rows}")

        if total_rows == 0:
            self.stdout.write(self.style.WARNING("No data in BigQuery table."))
            return

        # 全データ取得 (DISTINCTを追加して重複排除)
        # ingested_at は含めないことで、取り込み時刻違いの同一データを排除します
        query = f"""
            SELECT DISTINCT country_iso3, date, indicator_type, value
            FROM `{project_id}.celestial_biome_data.economy_raw`
            WHERE date >= '2000-01-01'
            ORDER BY date ASC
        """

        query_job = client.query(query)
        rows = query_job.result()  # イテレータを取得

        batch_size = 5000
        total_synced = 0

        self.stdout.write("Fetching and parsing data...")

        # 一旦全削除 (洗い替え)
        with transaction.atomic():
            EconomicIndicator.objects.all().delete()
            self.stdout.write("Existing data deleted.")

            # バッチインサート
            temp_batch = []
            for row in rows:
                temp_batch.append(
                    EconomicIndicator(
                        country_iso3=row.country_iso3, date=row.date, indicator_type=row.indicator_type, value=row.value
                    )
                )

                if len(temp_batch) >= batch_size:
                    EconomicIndicator.objects.bulk_create(temp_batch)
                    total_synced += len(temp_batch)
                    self.stdout.write(f"Synced {total_synced} rows...")
                    temp_batch = []

            # 残りのデータをインサート
            if temp_batch:
                EconomicIndicator.objects.bulk_create(temp_batch)
                total_synced += len(temp_batch)

        self.stdout.write(self.style.SUCCESS(f"Successfully synced {total_synced} records to Cloud SQL."))
