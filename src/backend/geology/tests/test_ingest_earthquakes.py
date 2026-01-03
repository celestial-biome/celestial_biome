from unittest.mock import MagicMock, patch

import pandas as pd
import pytest
from django.core.management import call_command

# テスト用のダミーGeoJSONデータ
SAMPLE_GEOJSON = {
    "features": [
        {
            "id": "us1000abcd",
            "properties": {
                "mag": 5.0,
                "place": "10km S of Tokyo",
                "time": 1704067200000,  # 2024-01-01 00:00:00 UTC
            },
            "geometry": {
                "coordinates": [139.69, 35.68, 10.0]  # lon, lat, depth
            },
        },
        {
            "id": "us1000efgh",
            "properties": {
                "mag": None,  # マグニチュード欠損のケース
                "place": None,
                "time": 1704153600000,
            },
            "geometry": {"coordinates": [140.0, 36.0, 20.0]},
        },
    ]
}


@pytest.fixture
def mock_requests_get():
    """requests.get をモック化"""
    with patch("geology.management.commands.ingest_earthquakes.requests.get") as mock:
        yield mock


@pytest.fixture
def mock_bigquery_client():
    """BigQuery Client をモック化"""
    with patch("geology.management.commands.ingest_earthquakes.bigquery.Client") as mock:
        yield mock


class TestIngestEarthquakes:
    def test_ingest_success(self, mock_requests_get, mock_bigquery_client):
        """正常系のテスト: API取得からBigQueryロードまで"""
        # 1. APIレスポンスのモック設定
        mock_response = MagicMock()
        mock_response.json.return_value = SAMPLE_GEOJSON
        mock_response.raise_for_status.return_value = None
        mock_requests_get.return_value = mock_response

        # 2. BigQuery Clientのモック設定
        mock_bq_instance = mock_bigquery_client.return_value
        mock_load_job = MagicMock()
        mock_bq_instance.load_table_from_dataframe.return_value = mock_load_job

        # 3. コマンド実行
        call_command("ingest_earthquakes", days=3, min_mag=2.0)

        # 4. 検証: APIが正しいパラメータで呼ばれたか
        args, kwargs = mock_requests_get.call_args
        assert kwargs["params"]["minmagnitude"] == 2.0
        assert kwargs["params"]["format"] == "geojson"

        # 5. 検証: BigQueryへのロードが呼ばれたか
        assert mock_bq_instance.load_table_from_dataframe.called

        # DataFrameの中身を検証（引数の1つ目）
        call_args = mock_bq_instance.load_table_from_dataframe.call_args
        df_arg = call_args[0][0]

        assert isinstance(df_arg, pd.DataFrame)
        assert len(df_arg) == 2
        assert df_arg.iloc[0]["usgs_id"] == "us1000abcd"
        assert df_arg.iloc[0]["magnitude"] == 5.0
        # マグニチュード欠損時は 0.0 になるロジックを確認
        assert df_arg.iloc[1]["magnitude"] == 0.0

    def test_no_earthquakes_found(self, mock_requests_get, mock_bigquery_client):
        """データが空の場合のテスト"""
        # 空のレスポンス
        mock_response = MagicMock()
        mock_response.json.return_value = {"features": []}
        mock_requests_get.return_value = mock_response

        # コマンド実行
        call_command("ingest_earthquakes")

        # BQへのロードは行われないはず
        mock_bq_instance = mock_bigquery_client.return_value
        assert not mock_bq_instance.load_table_from_dataframe.called

    def test_api_failure(self, mock_requests_get):
        """APIエラー時のテスト"""
        # requestsが例外を投げるように設定
        mock_requests_get.side_effect = Exception("API Error")

        # SystemExitが発生することを確認 (sys.exit(1)のため)
        with pytest.raises(SystemExit):
            call_command("ingest_earthquakes")
