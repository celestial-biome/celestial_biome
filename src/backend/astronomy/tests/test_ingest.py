from datetime import datetime, timedelta
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

import pandas as pd
import pytest
from django.core.management import call_command

# モック対象のパス
MODULE_PATH = "astronomy.management.commands.ingest_space_weather"


@pytest.fixture
def mock_noaa_responses(mocker):
    """NOAAのAPIレスポンスをシミュレートするフィクスチャ（現在時刻ベース）"""
    mock_get = mocker.patch(f"{MODULE_PATH}.requests.get")

    # テスト実行時の「現在」を基準にデータを作成
    # これにより、いつテストを実行しても期間外エラーにならない
    now = datetime.now(ZoneInfo("UTC"))
    recent_time = now - timedelta(hours=2)  # 2時間前のデータ

    # フォーマット定義
    # 1. ISO format (GOES用): "2025-12-31T12:00:00Z"
    fmt_iso = recent_time.strftime("%Y-%m-%dT%H:%M:%SZ")

    # 2. SQL/Log like format (SolarWind, Kp用): "2025-12-31 12:00:00.000"
    fmt_sql = recent_time.strftime("%Y-%m-%d %H:%M:%S.000")

    def side_effect(url, timeout=30):
        mock_resp = MagicMock()
        mock_resp.status_code = 200

        # 1. GOES X-ray
        if "goes/primary/xrays" in url:
            mock_resp.json.return_value = [
                {"time_tag": fmt_iso, "energy": "0.1-0.8nm", "flux": 1.5e-5},
            ]

        # 2. Solar Wind Plasma
        elif "products/solar-wind/plasma" in url:
            mock_resp.json.return_value = [
                ["time_tag", "speed", "density", "temperature"],
                [fmt_sql, "450.5", "5.2", "100000"],
            ]

        # 3. Solar Wind Mag (Bz)
        elif "products/solar-wind/mag" in url:
            mock_resp.json.return_value = [
                ["time_tag", "bz_gsm", "bt"],
                [fmt_sql, "-2.5", "5.0"],
            ]

        # 4. Kp Index
        elif "noaa-planetary-k-index.json" in url:
            mock_resp.json.return_value = [
                ["time_tag", "Kp", "a_running", "station_count"],
                [fmt_sql, "3.0", "15", "8"],
            ]
        else:
            mock_resp.json.return_value = []

        return mock_resp

    mock_get.side_effect = side_effect
    return mock_get


@pytest.mark.django_db
def test_ingest_command_success(mocker, mock_noaa_responses):
    """
    正常系テスト:
    1. NOAA APIが正常なデータ（現在時刻付近）を返す
    2. DataFrameが作成される
    3. BigQueryへのロードが呼ばれる
    """
    # BigQuery Clientのモック
    mock_bq_client = mocker.patch(f"{MODULE_PATH}.bigquery.Client")
    mock_client_instance = mock_bq_client.return_value

    # コマンド実行 (days=1)
    call_command("ingest_space_weather", days=1)

    # 検証 1: APIリクエストが呼ばれたか
    assert mock_noaa_responses.call_count >= 4

    # 検証 2: BigQueryへのロードメソッドが呼ばれたか
    assert mock_client_instance.load_table_from_dataframe.called

    # 検証 3: ロードしようとしたデータの中身を確認
    call_args = mock_client_instance.load_table_from_dataframe.call_args
    df_arg = call_args[0][0]

    assert isinstance(df_arg, pd.DataFrame)
    assert not df_arg.empty

    # カラムと指標の検証
    expected_columns = {"timestamp", "metric", "value"}
    assert set(df_arg.columns) == expected_columns

    metrics = df_arg["metric"].unique()
    assert "xray_flux" in metrics
    assert "solar_wind_speed" in metrics
    # その他のメトリクスも確認可能


@pytest.mark.django_db
def test_ingest_command_no_data(mocker):
    """
    データ空テスト:
    APIが空のリストを返した場合、BigQueryへのロードはスキップされるべき
    """
    # requests.get が常に空リストを返すようにモック
    mock_get = mocker.patch(f"{MODULE_PATH}.requests.get")
    mock_get.return_value.json.return_value = []
    mock_get.return_value.status_code = 200

    # BigQuery Clientのモック
    mock_bq_client = mocker.patch(f"{MODULE_PATH}.bigquery.Client")
    mock_client_instance = mock_bq_client.return_value

    # コマンド実行
    call_command("ingest_space_weather", days=1)

    # 検証: データがないのでロード処理は呼ばれないはず
    assert not mock_client_instance.load_table_from_dataframe.called
