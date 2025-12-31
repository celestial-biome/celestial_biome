from unittest.mock import MagicMock

import pytest
from django.core.management import call_command

from astronomy.models import SpaceWeatherLog


@pytest.mark.django_db
def test_sync_bq_to_db_command(mocker):
    """BigQueryのレスポンスをモックして、DBへの同期処理をテストする"""

    # 1. BigQuery Client をモック化
    # 注意: インポート元のパスを指定してパッチを当てる必要があります
    mock_client_cls = mocker.patch("astronomy.management.commands.sync_bq_to_db.bigquery.Client")
    mock_client_instance = mock_client_cls.return_value

    # 2. クエリ結果 (rows) のモックデータを作成
    # Rowは通常オブジェクトのように振る舞うため、MagicMockで属性を持たせる
    row1 = MagicMock()
    row1.timestamp = "2025-01-01T00:00:00Z"
    row1.metric = "solar_wind_speed"
    row1.value = 450.0

    row2 = MagicMock()
    row2.timestamp = "2025-01-01T01:00:00Z"
    row2.metric = "kp_index"
    row2.value = 3.0

    # query().result() がリストを返すように設定
    mock_query_job = mock_client_instance.query.return_value
    mock_query_job.result.return_value = [row1, row2]

    # 3. コマンド実行 (引数なし)
    call_command("sync_bq_to_db")

    # 4. 検証
    # BigQuery Clientが正しいプロジェクトIDで呼ばれたか
    assert mock_client_cls.called

    # DBにデータが保存されたか
    assert SpaceWeatherLog.objects.count() == 2

    obj = SpaceWeatherLog.objects.get(metric="solar_wind_speed")
    assert obj.value == 450.0
