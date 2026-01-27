import logging
import os
import sys
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import pandas as pd
import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from google.cloud import bigquery

logger = logging.getLogger(__name__)

# -----------------------------
# Constants
# -----------------------------
GOES_PRIMARY = "https://services.swpc.noaa.gov/json/goes/primary"
SOLAR_WIND = "https://services.swpc.noaa.gov/products/solar-wind"
KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"

# BigQuery Config
DATASET_ID = os.getenv("BQ_DATASET_ID", "celestial_biome_data")
TABLE_ID = "space_weather_metrics"


class Command(BaseCommand):
    help = "Fetches space weather data and ingests ONLY NEW data into BigQuery."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=7, help="Fetch last N days")
        parser.add_argument("--project", type=str, default=None, help="GCP Project ID")

    def handle(self, *args, **options):
        # 実行開始を構造化ログで記録
        command_name = "ingest_space_weather"
        logger.info(f"Starting {command_name}", extra={"job_name": command_name, "phase": "startup"})

        days = options["days"]
        project_id = options["project"] or settings.GOOGLE_CLOUD_PROJECT

        # BQクライアントを早めに初期化
        client = bigquery.Client(project=project_id)
        table_ref = f"{client.project}.{DATASET_ID}.{TABLE_ID}"

        # --- 0. BigQueryから各メトリクスの最新日時を取得 ---
        latest_timestamps = self.get_latest_timestamps(client, table_ref)
        self.stdout.write(f"Latest timestamps in BQ: {latest_timestamps}")

        # --- 1. 時間範囲の計算 (UTC) ---
        now = datetime.now(ZoneInfo("UTC"))
        start_ts = pd.Timestamp((now - timedelta(days=days)).isoformat(), tz="UTC")
        end_ts = pd.Timestamp(now.isoformat(), tz="UTC") + pd.Timedelta("23:59:59")

        self.stdout.write(f"Fetching data from {start_ts} to {end_ts} ...")

        try:
            # 処理の進捗を記録
            logger.info(f"Fetching data for last {days} days", extra={"job_name": command_name, "days": days})

            # --- 2. データ取得 & 整形 ---
            s_xray = load_goes_xrsb(start_ts, end_ts, days)
            s_speed = load_solarwind_speed(start_ts, end_ts, days)
            s_bz = load_solarwind_bz(start_ts, end_ts, days)
            s_kp = load_kp(start_ts, end_ts)

            # --- 3. Long Format への変換 ---
            frames = []

            if not s_xray.empty:
                df = s_xray.to_frame(name="value")
                df["metric"] = "xray_flux"
                frames.append(df)

            if not s_speed.empty:
                df = s_speed.to_frame(name="value")
                df["metric"] = "solar_wind_speed"
                frames.append(df)

            if not s_bz.empty:
                df = s_bz.to_frame(name="value")
                df["metric"] = "imf_bz"
                frames.append(df)

            if not s_kp.empty:
                df = s_kp.to_frame(name="value")
                df["metric"] = "kp_index"
                frames.append(df)

            if not frames:
                self.stdout.write(self.style.WARNING("No data fetched from NOAA."))
                return

            result_df = pd.concat(frames)
            result_df.index.name = "timestamp"
            result_df = result_df.reset_index()

            # 型変換
            result_df["timestamp"] = pd.to_datetime(result_df["timestamp"])
            result_df["metric"] = result_df["metric"].astype(str)
            result_df["value"] = result_df["value"].astype(float)

            # --- 3.5 重複排除 ---
            # BQにある最新日時より新しいデータのみに絞る
            new_rows = []
            for metric, group in result_df.groupby("metric"):
                last_ts = latest_timestamps.get(metric)
                if last_ts:
                    # BQにデータがある場合: 最新日時より後のものだけ抽出
                    filtered = group[group["timestamp"] > last_ts]
                    if not filtered.empty:
                        new_rows.append(filtered)
                else:
                    # BQにデータがない場合: 全て新規
                    new_rows.append(group)

            if new_rows:
                result_df = pd.concat(new_rows)
            else:
                self.stdout.write(self.style.SUCCESS("No new data to ingest (all duplicates)."))
                return

            if result_df.empty:
                self.stdout.write(self.style.SUCCESS("No new data to ingest (result empty)."))
                return

            self.stdout.write(f"Prepared {len(result_df)} new rows for ingestion.")

            # --- 4. BigQuery への Insert ---
            job_config = bigquery.LoadJobConfig(
                write_disposition="WRITE_APPEND",
                schema=[
                    bigquery.SchemaField("timestamp", "TIMESTAMP", mode="REQUIRED"),
                    bigquery.SchemaField("metric", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("value", "FLOAT", mode="NULLABLE"),
                ],
            )

            job = client.load_table_from_dataframe(result_df, table_ref, job_config=job_config)
            job.result()

            self.stdout.write(self.style.SUCCESS(f"Successfully loaded data to {table_ref}"))

            logger.info(
                f"Successfully ingested data to {table_ref}", extra={"job_name": command_name, "phase": "complete"}
            )

        except Exception as e:
            # 失敗時の詳細ログ（スタックトレースを含める）
            logger.error(
                f"Failed to execute {command_name}: {str(e)}",
                exc_info=True,  # これでスタックトレースがJSONの 'exc_info' フィールドに入ります
                extra={"job_name": command_name, "phase": "execution_error", "error_type": type(e).__name__},
            )
            self.stdout.write(self.style.ERROR(f"Error during ingestion: {e}"))
            sys.exit(1)

    def get_latest_timestamps(self, client, table_ref) -> dict:
        """
        BigQueryから各metricごとの最新のtimestampを取得して辞書で返す
        """
        try:
            client.get_table(table_ref)
        except Exception:
            return {}

        query = f"""
            SELECT metric, MAX(timestamp) as max_ts
            FROM `{table_ref}`
            GROUP BY metric
        """
        try:
            query_job = client.query(query)
            results = query_job.result()
            return {row.metric: pd.Timestamp(row.max_ts).tz_convert("UTC") for row in results}
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Could not fetch latest timestamps (First run?): {e}"))
            return {}


# -----------------------------
# Helper Functions
# -----------------------------
def fetch_json(url: str, timeout: int = 30) -> Any:
    r = requests.get(url, timeout=timeout)
    r.raise_for_status()
    return r.json()


def pick_first_existing(df: pd.DataFrame, candidates: list[str]) -> str | None:
    cols = list(df.columns)
    lower_map = {c.lower(): c for c in cols}
    for c in candidates:
        if c in cols:
            return c
        lc = c.lower()
        if lc in lower_map:
            return lower_map[lc]
    return None


def load_swpc_table(url: str) -> pd.DataFrame:
    data = fetch_json(url)
    if isinstance(data, list) and len(data) >= 2 and isinstance(data[0], list):
        cols = data[0]
        rows = data[1:]
        df = pd.DataFrame(rows, columns=cols)
    elif isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
        df = pd.DataFrame(data)
    else:
        return pd.DataFrame()

    if "time_tag" in df.columns:
        df["time_tag"] = pd.to_datetime(df["time_tag"], utc=True, errors="coerce")
    return df


def pick_goes_xray_url(span_days: int) -> str:
    if span_days <= 1:
        return f"{GOES_PRIMARY}/xrays-1-day.json"
    if span_days <= 3:
        return f"{GOES_PRIMARY}/xrays-3-day.json"
    return f"{GOES_PRIMARY}/xrays-7-day.json"


def pick_solarwind_url(kind: str, span_days: int) -> str:
    suffix = "1-day" if span_days <= 1 else "3-day" if span_days <= 3 else "7-day"
    return f"{SOLAR_WIND}/{kind}-{suffix}.json"


def load_goes_xrsb(start_ts, end_ts, days) -> pd.Series:
    url = pick_goes_xray_url(days)
    data = fetch_json(url)
    df = pd.DataFrame(data)
    if "time_tag" not in df.columns:
        return pd.Series(dtype=float)

    df["time_tag"] = pd.to_datetime(df["time_tag"], utc=True, errors="coerce")
    df = df.dropna(subset=["time_tag"])
    df = df[df["time_tag"].between(start_ts, end_ts)]

    val_col = pick_first_existing(df, ["observed_flux", "flux"])
    if not val_col:
        return pd.Series(dtype=float)

    if "energy" in df.columns:
        pv = df.pivot(index="time_tag", columns="energy", values=val_col)
        if "0.1-0.8nm" in pv.columns:
            return pd.to_numeric(pv["0.1-0.8nm"], errors="coerce").dropna().sort_index()
    return pd.Series(dtype=float)


def load_solarwind_speed(start_ts, end_ts, days) -> pd.Series:
    url = pick_solarwind_url("plasma", days)
    df = load_swpc_table(url)
    if df.empty or "time_tag" not in df.columns:
        return pd.Series(dtype=float)

    col = pick_first_existing(df, ["speed"])
    if not col:
        return pd.Series(dtype=float)

    df = df[df["time_tag"].between(start_ts, end_ts)]
    return pd.to_numeric(df.set_index("time_tag")[col], errors="coerce").dropna().sort_index()


def load_solarwind_bz(start_ts, end_ts, days) -> pd.Series:
    url = pick_solarwind_url("mag", days)
    df = load_swpc_table(url)
    if df.empty or "time_tag" not in df.columns:
        return pd.Series(dtype=float)

    col = pick_first_existing(df, ["bz_gsm"])
    if not col:
        return pd.Series(dtype=float)

    df = df[df["time_tag"].between(start_ts, end_ts)]
    return pd.to_numeric(df.set_index("time_tag")[col], errors="coerce").dropna().sort_index()


def load_kp(start_ts, end_ts) -> pd.Series:
    df = load_swpc_table(KP_URL)
    if df.empty or "time_tag" not in df.columns:
        return pd.Series(dtype=float)

    col = pick_first_existing(df, ["Kp", "kp", "kp_index"])
    if not col:
        return pd.Series(dtype=float)

    df = df[df["time_tag"].between(start_ts, end_ts)]
    return pd.to_numeric(df.set_index("time_tag")[col], errors="coerce").dropna().sort_index()
