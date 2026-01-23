from collections import namedtuple
from datetime import datetime, timedelta
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

import pytest
from django.core.management import call_command

# モック対象のパス
MODULE_PATH = "astronomy.management.commands.ingest_space_weather"

# BigQueryの行を模倣するヘルパー
MockRow = namedtuple("MockRow", ["metric", "max_ts"])


@pytest.fixture
def mock_noaa_responses(mocker):
    """NOAAのAPIレスポンスをシミュレートするフィクスチャ（現在時刻ベース）"""
    mock_get = mocker.patch(f"{MODULE_PATH}.requests.get")

    # テスト実行時の「現在」を基準にデータを作成
    now = datetime.now(ZoneInfo("UTC"))

    # 2時間前（古いデータ）と、現在（新しいデータ）を用意して
    # 差分更新のテストができるようにする
    old_time = now - timedelta(hours=2)
    new_time = now

    # フォーマット定義
    def fmt_iso(t):
        return t.strftime("%Y-%m-%dT%H:%M:%SZ")

    def fmt_sql(t):
        return t.strftime("%Y-%m-%d %H:%M:%S.000")

    def side_effect(url, timeout=30):
        mock_resp = MagicMock()
        mock_resp.status_code = 200

        # 1. GOES X-ray
        if "goes/primary/xrays" in url:
            mock_resp.json.return_value = [
                {"time_tag": fmt_iso(old_time), "energy": "0.1-0.8nm", "flux": 1.0e-5},  # 古い
                {"time_tag": fmt_iso(new_time), "energy": "0.1-0.8nm", "flux": 2.0e-5},  # 新しい
            ]

        # 2. Solar Wind Plasma
        elif "products/solar-wind/plasma" in url:
            mock_resp.json.return_value = [
                ["time_tag", "speed", "density", "temperature"],
                [fmt_sql(old_time), "400.0", "5.0", "100000"],
                [fmt_sql(new_time), "500.0", "6.0", "120000"],
            ]

        # 3. Solar Wind Mag (Bz)
        elif "products/solar-wind/mag" in url:
            mock_resp.json.return_value = [
                ["time_tag", "bz_gsm", "bt"],
                [fmt_sql(old_time), "-2.0", "5.0"],
                [fmt_sql(new_time), "-5.0", "6.0"],
            ]

        # 4. Kp Index
        elif "noaa-planetary-k-index.json" in url:
            mock_resp.json.return_value = [
                ["time_tag", "Kp", "a_running", "station_count"],
                [fmt_sql(old_time), "2.0", "10", "8"],
                [fmt_sql(new_time), "4.0", "15", "8"],
            ]
        else:
            mock_resp.json.return_value = []

        return mock_resp

    mock_get.side_effect = side_effect
    return mock_get


@pytest.fixture
def mock_bq_client(mocker):
    """BigQuery Clientのモック"""
    mock_cls = mocker.patch(f"{MODULE_PATH}.bigquery.Client")
    return mock_cls.return_value


@pytest.mark.django_db
def test_ingest_command_success_first_run(mocker, mock_noaa_responses, mock_bq_client):
    """
    正常系テスト（初回実行）:
    BigQueryにデータがない場合、取得した全てのデータがInsertされること
    """
    # 1. BigQueryの状態モック: データなし (空リスト)
    # client.query(...).result() が空リストを返す
    mock_bq_client.query.return_value.result.return_value = []

    # 2. コマンド実行
    call_command("ingest_space_weather", days=1)

    # 3. 検証: ロードが呼ばれたか
    assert mock_bq_client.load_table_from_dataframe.called

    call_args = mock_bq_client.load_table_from_dataframe.call_args
    df_arg = call_args[0][0]

    # 全データ (各メトリクス2件ずつ: old, new) が入っているはず
    # 4 metrics * 2 rows = 8 rows
    assert len(df_arg) == 8

    # タイムスタンプが2種類あることを確認
    assert df_arg["timestamp"].nunique() == 2


@pytest.mark.django_db
def test_ingest_command_differential_update(mocker, mock_noaa_responses, mock_bq_client):
    """
    正常系テスト（差分更新）:
    BigQueryにデータがある場合、それより新しいデータのみがInsertされること
    """
    # テスト基準時刻
    now = datetime.now(ZoneInfo("UTC"))
    old_time = now - timedelta(hours=2)

    # 1. BigQueryの状態モック: old_time までのデータが存在する
    # client.query(...).result() が各メトリクスの最大時刻(old_time)を返す
    mock_bq_client.query.return_value.result.return_value = [
        MockRow(metric="xray_flux", max_ts=old_time),
        MockRow(metric="solar_wind_speed", max_ts=old_time),
        MockRow(metric="imf_bz", max_ts=old_time),
        MockRow(metric="kp_index", max_ts=old_time),
    ]

    # 2. コマンド実行
    call_command("ingest_space_weather", days=1)

    # 3. 検証
    assert mock_bq_client.load_table_from_dataframe.called
    call_args = mock_bq_client.load_table_from_dataframe.call_args
    df_arg = call_args[0][0]

    # 古いデータ(old_time)は除外され、新しいデータ(now)だけが残っているはず
    # 4 metrics * 1 row (new only) = 4 rows
    assert len(df_arg) == 4

    # 残っているデータのタイムスタンプは全て old_time より後であること
    assert df_arg["timestamp"].min() > old_time


@pytest.mark.django_db
def test_ingest_command_no_new_data(mocker, mock_noaa_responses, mock_bq_client):
    """
    正常系テスト（更新なし）:
    取得データが全てBigQuery内の最新時刻以前の場合、Insertはスキップされること
    """
    now = datetime.now(ZoneInfo("UTC"))

    # 1. BigQueryの状態モック: すでに現在時刻(now)までデータが入っている
    mock_bq_client.query.return_value.result.return_value = [
        MockRow(metric="xray_flux", max_ts=now),
        MockRow(metric="solar_wind_speed", max_ts=now),
        MockRow(metric="imf_bz", max_ts=now),
        MockRow(metric="kp_index", max_ts=now),
    ]

    # 2. コマンド実行 (APIからは now と old_time が返ってくるが、どちらも <= now)
    call_command("ingest_space_weather", days=1)

    # 3. 検証: 新規データがないため、load_table_from_dataframe は呼ばれない
    assert not mock_bq_client.load_table_from_dataframe.called


@pytest.mark.django_db
def test_ingest_command_api_empty(mocker, mock_bq_client):
    """
    異常系テスト:
    API自体が空を返した場合
    """
    # APIが空リストを返すようにモック
    mock_get = mocker.patch(f"{MODULE_PATH}.requests.get")
    mock_get.return_value.json.return_value = []
    mock_get.return_value.status_code = 200

    # BQの状態は問わない（今回は空とする）
    mock_bq_client.query.return_value.result.return_value = []

    call_command("ingest_space_weather", days=1)

    assert not mock_bq_client.load_table_from_dataframe.called
