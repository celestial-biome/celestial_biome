from datetime import datetime

import pandas as pd
import wbgapi as wb
import yfinance as yf
from django.conf import settings
from django.core.management.base import BaseCommand
from google.cloud import bigquery

# 定数定義
COUNTRIES = {
    "USA": "^GSPC",
    "JPN": "^N225",
    "CHN": "000001.SS",
    "IND": "^BSESN",
    "DEU": "^GDAXI",
    "GBR": "^FTSE",
    "FRA": "^FCHI",
    "CAN": "^GSPTSE",
    "AUS": "^AXJO",
}
INDICATORS = {"GDP": "NY.GDP.MKTP.KD", "Inflation": "FP.CPI.TOTL.ZG"}

DATASET_ID = "celestial_biome_data"
TABLE_ID = "economy_raw"


class Command(BaseCommand):
    help = "Ingest economic data to BigQuery (Full Refresh)"

    def handle(self, *args, **options):
        client = bigquery.Client()
        table_ref = f"{settings.GOOGLE_CLOUD_PROJECT}.{DATASET_ID}.{TABLE_ID}"

        rows_to_insert = []
        start_year = 2000

        # --- 1. Stock Data ---
        self.stdout.write("Fetching Stock Data...")
        for iso3, ticker in COUNTRIES.items():
            try:
                stock = yf.download(ticker, start=f"{start_year}-01-01", progress=False)
                # MultiIndex対応
                if isinstance(stock.columns, pd.MultiIndex):
                    # Tickerレベルが存在する場合のみxsを使用
                    if ticker in stock.columns.get_level_values(1):
                        stock = stock.xs(ticker, level=1, axis=1)

                # Closeのみ抽出
                if "Close" in stock.columns:
                    df = stock[["Close"]].dropna().reset_index()
                    for _, row in df.iterrows():
                        rows_to_insert.append(
                            {
                                "country_iso3": iso3,
                                # datetime型を文字列に変換 (BQのDATE型対応)
                                "date": row["Date"].strftime("%Y-%m-%d"),
                                "indicator_type": "STOCK",
                                "value": float(row["Close"]),
                                "ingested_at": datetime.now().isoformat(),
                            }
                        )
            except Exception as e:
                self.stderr.write(f"Error fetching stock {iso3}: {e}")

        # --- 2. WB Data ---
        self.stdout.write("Fetching WB Data...")
        # (以下WBのロジックは元のまま維持)
        iso_list = list(COUNTRIES.keys())
        for ind_name, code in INDICATORS.items():
            try:
                df = wb.data.DataFrame(code, iso_list, time=range(start_year, datetime.now().year + 1))
                df = df.reset_index()
                df_melted = df.melt(id_vars=["economy"], var_name="year", value_name="value")

                for _, row in df_melted.iterrows():
                    if pd.notna(row["value"]):
                        # "YR2020" -> 2020
                        year_str = str(row["year"]).replace("YR", "")
                        rows_to_insert.append(
                            {
                                "country_iso3": row["economy"],
                                "date": f"{year_str}-01-01",
                                "indicator_type": ind_name.upper(),
                                "value": float(row["value"]),
                                "ingested_at": datetime.now().isoformat(),
                            }
                        )
            except Exception as e:
                self.stderr.write(f"Error fetching WB {ind_name}: {e}")

        # --- 3. BigQuery Load (Load Job + WRITE_TRUNCATE) ---
        if rows_to_insert:
            total_rows = len(rows_to_insert)
            self.stdout.write(f"Total rows collected: {total_rows}. Starting Load Job...")

            # ジョブ設定: スキーマ指定 と WRITE_TRUNCATE（上書き）
            job_config = bigquery.LoadJobConfig(
                schema=[
                    bigquery.SchemaField("country_iso3", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("date", "DATE", mode="REQUIRED"),  # 文字列からDATEへ自動変換
                    bigquery.SchemaField("indicator_type", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("value", "FLOAT"),
                    bigquery.SchemaField("ingested_at", "TIMESTAMP"),
                ],
                write_disposition="WRITE_TRUNCATE",  # これにより重複を防ぐ(全置換)
            )

            try:
                # insert_rows_json ではなく load_table_from_json を使用
                job = client.load_table_from_json(rows_to_insert, table_ref, job_config=job_config)

                job.result()  # ジョブの完了を待つ

                self.stdout.write(
                    self.style.SUCCESS(f"Successfully loaded {total_rows} rows to {table_ref} (Overwritten).")
                )

            except Exception as e:
                self.stderr.write(f"BQ Load Job Failed: {e}")
                # 詳細なエラーがある場合は表示
                if hasattr(e, "errors"):
                    self.stderr.write(str(e.errors))
        else:
            self.stdout.write("No data fetched.")
