from unittest.mock import MagicMock, patch

import pandas as pd
from django.core.management import call_command
from django.test import TestCase


class IngestEconomyCommandTest(TestCase):
    @patch("economy.management.commands.ingest_economy.bigquery.Client")
    @patch("economy.management.commands.ingest_economy.wb.data.DataFrame")
    @patch("economy.management.commands.ingest_economy.yf.download")
    def test_handle(self, mock_yf, mock_wb, mock_bq_client):
        """
        全リフレッシュ取り込みコマンドの正常系テスト
        外部APIとBQ接続をモック化してロジックを確認する
        """
        # --- 1. Mock Yahoo Finance (Stock) ---
        # 期待されるDataFrame構造を作成
        mock_stock_df = pd.DataFrame(
            {"Close": [100.0, 101.0], "Date": [pd.Timestamp("2024-01-01"), pd.Timestamp("2024-01-02")]}
        )
        # yfinanceがMultiIndexを返すケースも考慮されているが、ここでは単純なケースでテスト
        mock_yf.return_value = mock_stock_df

        # --- 2. Mock World Bank (WB) ---
        # wbgapiが返すDataFrame構造 (melt前)
        mock_wb_df = pd.DataFrame({"economy": ["USA", "JPN"], "YR2020": [1.5, 0.5], "YR2021": [2.0, 0.6]}).set_index(
            "economy"
        )
        mock_wb.return_value = mock_wb_df

        # --- 3. Mock BigQuery ---
        mock_client_instance = MagicMock()
        mock_bq_client.return_value = mock_client_instance

        mock_load_job = MagicMock()
        mock_client_instance.load_table_from_json.return_value = mock_load_job
        mock_load_job.result.return_value = None  # ジョブ完了待ちのモック

        # --- 4. コマンド実行 ---
        call_command("ingest_economy")

        # --- 5. 検証 ---
        # yfinanceが国ごとに呼ばれたか (COUNTRIESの数だけ)
        # COUNTRIES定数は9カ国定義されていると仮定
        self.assertTrue(mock_yf.called)
        self.assertGreaterEqual(mock_yf.call_count, 1)

        # WB APIが呼ばれたか (INDICATORSの数だけ: GDP, Inflationの2回)
        self.assertEqual(mock_wb.call_count, 2)

        # BigQueryへのロードが呼ばれたか
        self.assertTrue(mock_client_instance.load_table_from_json.called)

        # ロードされたデータの中身を検証
        call_args = mock_client_instance.load_table_from_json.call_args
        rows_to_insert = call_args[0][0]  # 第1引数がデータリスト

        # データがリスト形式で渡されているか
        self.assertIsInstance(rows_to_insert, list)
        self.assertGreater(len(rows_to_insert), 0)

        # データの構造チェック
        first_row = rows_to_insert[0]
        self.assertIn("country_iso3", first_row)
        self.assertIn("value", first_row)
        self.assertIn("ingested_at", first_row)
