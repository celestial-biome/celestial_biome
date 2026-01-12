from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from django.core.management import call_command

from geology.models import Earthquake


# BigQueryからの戻り値を模倣するクラス
class MockRow:
    def __init__(self, usgs_id, timestamp, magnitude, place, depth, latitude, longitude):
        self.usgs_id = usgs_id
        self.timestamp = timestamp
        self.magnitude = magnitude
        self.place = place
        self.depth = depth
        self.latitude = latitude
        self.longitude = longitude


@pytest.fixture
def mock_bigquery_client():
    with patch("geology.management.commands.sync_earthquakes_to_db.bigquery.Client") as mock:
        yield mock


@pytest.mark.django_db
class TestSyncEarthquakesToDB:
    def test_sync_success(self, mock_bigquery_client):
        """正常系のテスト: BigQueryからデータを取得してDBに保存"""

        # 1. BigQueryからのダミーデータ
        mock_rows = [
            MockRow(
                usgs_id="test001",
                timestamp=datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
                magnitude=5.5,
                place="Test Place 1",
                depth=10.0,
                latitude=35.0,
                longitude=139.0,
            ),
            MockRow(
                usgs_id="test002",
                timestamp=datetime(2024, 1, 2, 12, 0, 0, tzinfo=timezone.utc),
                magnitude=6.0,
                place="Test Place 2",
                depth=20.0,
                latitude=36.0,
                longitude=140.0,
            ),
        ]

        # 2. Mockの設定
        mock_client_instance = mock_bigquery_client.return_value
        mock_query_job = MagicMock()
        mock_query_job.result.return_value = mock_rows  # クエリ結果としてリストを返す
        mock_client_instance.query.return_value = mock_query_job

        # 3. 既存データの準備（洗い替え機能のテストのため）
        Earthquake.objects.create(
            usgs_id="old_data",
            timestamp=datetime(2020, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
            magnitude=1.0,
            depth=0,
            latitude=0,
            longitude=0,
        )
        assert Earthquake.objects.count() == 1

        # 4. コマンド実行
        call_command("sync_earthquakes_to_db")

        # 5. 検証
        # クエリが実行されたか
        assert mock_client_instance.query.called

        # データが洗い替えられているか（古いデータが消え、新しい2件があるか）
        assert Earthquake.objects.count() == 2

        # データの内容確認
        eq1 = Earthquake.objects.get(usgs_id="test001")
        assert eq1.magnitude == 5.5
        assert eq1.place == "Test Place 1"

    def test_bq_failure_no_db_change(self, mock_bigquery_client):
        """BigQueryでエラーが発生した場合、DBが変更されないことを確認"""

        # 1. 例外を発生させる
        mock_client_instance = mock_bigquery_client.return_value
        mock_client_instance.query.side_effect = RuntimeError("BQ Connection Error")

        # 2. 既存データ
        Earthquake.objects.create(
            usgs_id="existing_data",
            timestamp=datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
            magnitude=3.0,
            depth=0,
            latitude=0,
            longitude=0,
        )

        obj = Earthquake.objects.first()

        # 3. コマンド実行と例外確認
        with pytest.raises(RuntimeError):
            call_command("sync_earthquakes_to_db")

        # 4. 検証: DBの中身は変更されていないはず（トランザクションのアトミック性により）
        # ただし、今回のコードの実装では transaction.atomic は query.result() の後に開始されるため、
        # クエリ段階でのエラーならデータ削除処理には到達していないはず。
        assert Earthquake.objects.count() == 1
        assert obj is not None
        assert obj.usgs_id == "existing_data"
