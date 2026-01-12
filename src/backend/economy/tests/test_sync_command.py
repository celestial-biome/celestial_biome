from collections import namedtuple
from datetime import date
from unittest.mock import MagicMock, patch

from django.core.management import call_command
from django.test import TestCase

from economy.models import EconomicIndicator


class SyncEconomyCommandTest(TestCase):
    @patch("economy.management.commands.sync_economy_db.bigquery.Client")
    def test_handle(self, mock_bq_client):
        """BigQueryからデータを取得し、ローカルDBに同期するテスト"""

        # --- 1. Mock BigQuery Setup ---
        mock_client_instance = MagicMock()
        mock_bq_client.return_value = mock_client_instance

        # 1-1. Count Queryのモック (データがある場合: count > 0)
        mock_count_job = MagicMock()
        # count_jobの結果は list(job)[0].total で取得される
        MockRow = namedtuple("Row", ["total"])
        mock_count_job.__iter__.return_value = [MockRow(total=10)]

        # 1-2. Data Fetch Queryのモック
        mock_query_job = MagicMock()

        # 返却される行データ (namedtuple風オブジェクト)
        DataRow = namedtuple("DataRow", ["country_iso3", "date", "indicator_type", "value"])
        mock_rows = [
            DataRow("USA", date(2024, 1, 1), "STOCK", 100.0),
            DataRow("JPN", date(2024, 1, 1), "GDP", 500000.0),
        ]
        mock_query_job.result.return_value = mock_rows  # query_job.result() が行を返す

        # Client.query() が呼ばれた順番でモックを返すように設定 (side_effect)
        # 1回目: Count, 2回目: Fetch Data
        mock_client_instance.query.side_effect = [mock_count_job, mock_query_job]

        # --- 2. 事前データの準備 (洗い替えの確認用) ---
        EconomicIndicator.objects.create(country_iso3="OLD", date=date(1990, 1, 1), indicator_type="OLD", value=0.0)
        self.assertEqual(EconomicIndicator.objects.count(), 1)

        # --- 3. コマンド実行 ---
        call_command("sync_economy_db")

        # --- 4. 検証 ---
        # 古いデータが消え、新しいデータ2件が入っていること
        self.assertEqual(EconomicIndicator.objects.count(), 2)

        # データの中身確認
        usa_data = EconomicIndicator.objects.get(country_iso3="USA")
        self.assertEqual(usa_data.value, 100.0)
        self.assertEqual(usa_data.indicator_type, "STOCK")
