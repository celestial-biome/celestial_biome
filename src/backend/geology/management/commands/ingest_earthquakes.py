import sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pandas as pd
import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from google.cloud import bigquery

# Constants
USGS_API_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"
DATASET_ID = "celestial_biome_data"
TABLE_ID = "earthquakes_raw"


class Command(BaseCommand):
    help = "Fetches earthquake data from USGS and ingests it into BigQuery."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=7, help="Fetch last N days")
        parser.add_argument("--min-mag", type=float, default=2.5, help="Minimum magnitude")
        parser.add_argument("--project", type=str, default=None, help="GCP Project ID")

    def handle(self, *args, **options):
        days = options["days"]
        min_mag = options["min_mag"]
        project_id = options["project"] or settings.GOOGLE_CLOUD_PROJECT

        if not project_id:
            self.stdout.write(self.style.WARNING("No GCP Project ID found. Using default credentials."))

        # 1. 時間範囲の設定 (UTC)
        end_time = datetime.now(ZoneInfo("UTC"))
        start_time = end_time - timedelta(days=days)

        # USGS API パラメータ
        params = {
            "format": "geojson",
            "starttime": start_time.isoformat(),
            "endtime": end_time.isoformat(),
            "minmagnitude": min_mag,
            "orderby": "time",
        }

        self.stdout.write(f"Fetching USGS data (M{min_mag}+) from {start_time}...")

        try:
            # 2. データ取得
            resp = requests.get(USGS_API_URL, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()

            features = data.get("features", [])
            if not features:
                self.stdout.write(self.style.WARNING("No earthquakes found."))
                return

            # 3. データ整形 (GeoJSON -> List of Dicts)
            rows = []
            for feature in features:
                props = feature["properties"]
                geom = feature["geometry"]
                lon, lat, depth = geom["coordinates"]

                # Timestamp (ms -> datetime)
                ts = pd.to_datetime(props["time"], unit="ms", utc=True)

                rows.append(
                    {
                        "timestamp": ts,
                        "usgs_id": feature["id"],
                        "magnitude": float(props["mag"]) if props["mag"] is not None else 0.0,
                        "place": props["place"] or "Unknown",
                        "depth": float(depth),
                        "latitude": float(lat),
                        "longitude": float(lon),
                    }
                )

            df = pd.DataFrame(rows)
            self.stdout.write(f"Prepared {len(df)} rows for ingestion.")

            # 4. BigQuery Insert
            client = bigquery.Client(project=project_id)
            table_ref = f"{client.project}.{DATASET_ID}.{TABLE_ID}"

            # スキーマ定義 (Terraformと一致させる)
            job_config = bigquery.LoadJobConfig(
                write_disposition="WRITE_APPEND",
                schema=[
                    bigquery.SchemaField("timestamp", "TIMESTAMP", mode="REQUIRED"),
                    bigquery.SchemaField("usgs_id", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("magnitude", "FLOAT", mode="NULLABLE"),
                    bigquery.SchemaField("place", "STRING", mode="NULLABLE"),
                    bigquery.SchemaField("depth", "FLOAT", mode="NULLABLE"),
                    bigquery.SchemaField("latitude", "FLOAT", mode="NULLABLE"),
                    bigquery.SchemaField("longitude", "FLOAT", mode="NULLABLE"),
                ],
            )

            job = client.load_table_from_dataframe(df, table_ref, job_config=job_config)
            job.result()  # 完了待ち

            self.stdout.write(self.style.SUCCESS(f"Successfully loaded {len(df)} earthquakes to BQ: {table_ref}"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))
            sys.exit(1)
