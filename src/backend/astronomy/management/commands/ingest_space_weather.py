import sys
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import pandas as pd
import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from google.cloud import bigquery

# -----------------------------
# Constants
# -----------------------------
GOES_PRIMARY = "https://services.swpc.noaa.gov/json/goes/primary"
SOLAR_WIND = "https://services.swpc.noaa.gov/products/solar-wind"
KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"

# BigQuery Config
DATASET_ID = "celestial_biome_data"
TABLE_ID = "space_weather_metrics"


class Command(BaseCommand):
    help = "Fetches space weather data from NOAA SWPC and ingests it into BigQuery."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=7, help="Fetch last N days (max 7 for SWPC JSONs)")
        parser.add_argument("--project", type=str, default=None, help="GCP Project ID (optional if inferred)")

    def handle(self, *args, **options):
        days = options["days"]
        project_id = options["project"] or settings.GOOGLE_CLOUD_PROJECT

        if not project_id:
            self.stdout.write(self.style.WARNING("No Google Cloud Project ID found. Trying default credentials..."))

        # --- 1. 時間範囲の計算 (UTC) ---
        now = datetime.now(ZoneInfo("UTC"))
        start_ts = pd.Timestamp((now - timedelta(days=days)).isoformat(), tz="UTC")
        end_ts = pd.Timestamp(now.isoformat(), tz="UTC") + pd.Timedelta("23:59:59")

        self.stdout.write(f"Fetching data from {start_ts} to {end_ts} ...")

        try:
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
                self.stdout.write(self.style.WARNING("No data found for the specified period."))
                return

            result_df = pd.concat(frames)
            result_df.index.name = "timestamp"
            result_df = result_df.reset_index()

            result_df["timestamp"] = pd.to_datetime(result_df["timestamp"])
            result_df["metric"] = result_df["metric"].astype(str)
            result_df["value"] = result_df["value"].astype(float)

            self.stdout.write(f"Prepared {len(result_df)} rows for ingestion.")

            # --- 4. BigQuery への Insert ---
            client = bigquery.Client(project=project_id)
            table_ref = f"{client.project}.{DATASET_ID}.{TABLE_ID}"

            job_config = bigquery.LoadJobConfig(
                write_disposition="WRITE_APPEND",
                schema=[
                    # mode="REQUIRED" を明示して Terraform 側の定義と合わせます
                    bigquery.SchemaField("timestamp", "TIMESTAMP", mode="REQUIRED"),
                    bigquery.SchemaField("metric", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("value", "FLOAT", mode="NULLABLE"),
                ],
            )

            job = client.load_table_from_dataframe(result_df, table_ref, job_config=job_config)
            job.result()

            self.stdout.write(self.style.SUCCESS(f"Successfully loaded data to {table_ref}"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error during ingestion: {e}"))
            sys.exit(1)


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

    # 修正: set_indexしてから数値変換することで整合性を維持
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

    # 修正
    return pd.to_numeric(df.set_index("time_tag")[col], errors="coerce").dropna().sort_index()


def load_kp(start_ts, end_ts) -> pd.Series:
    df = load_swpc_table(KP_URL)
    if df.empty or "time_tag" not in df.columns:
        return pd.Series(dtype=float)

    col = pick_first_existing(df, ["Kp", "kp", "kp_index"])
    if not col:
        return pd.Series(dtype=float)

    df = df[df["time_tag"].between(start_ts, end_ts)]

    # 修正
    return pd.to_numeric(df.set_index("time_tag")[col], errors="coerce").dropna().sort_index()
