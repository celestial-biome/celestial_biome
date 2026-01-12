from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from economy.models import EconomicIndicator


class EconomyDashboardViewTest(APITestCase):
    def setUp(self):
        # テストデータの作成
        # USA: 2024年1月に2つのデータ（集計の平均確認用）
        EconomicIndicator.objects.create(country_iso3="USA", date=date(2024, 1, 1), indicator_type="STOCK", value=100.0)
        EconomicIndicator.objects.create(
            country_iso3="USA", date=date(2024, 1, 15), indicator_type="STOCK", value=200.0
        )
        # USA: 2024年2月
        EconomicIndicator.objects.create(country_iso3="USA", date=date(2024, 2, 1), indicator_type="STOCK", value=300.0)
        # JPN: 2024年1月 (国フィルタ確認用)
        EconomicIndicator.objects.create(country_iso3="JPN", date=date(2024, 1, 1), indicator_type="STOCK", value=500.0)
        # 過去データ (期間フィルタ確認用)
        EconomicIndicator.objects.create(
            country_iso3="USA", date=date(1999, 12, 31), indicator_type="STOCK", value=50.0
        )

        # URLの解決 (urls.pyの設定に合わせて名前を変更してください)
        # 例: path('world-economy/', EconomyDashboardView.as_view(), name='economy-dashboard')
        # ここでは直接エンドポイントを指定するか、name="world-economy" と仮定します
        self.url = "/api/v1/economy/world-economy/"  # 実際のURLに合わせて変更してください

    def test_get_monthly_aggregation(self):
        """日次データが月ごとに平均化されているか確認"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()

        # USAのSTOCKデータを確認
        usa_stock = data["USA"]["STOCK"]

        # 2024-01: (100 + 200) / 2 = 150.0
        jan_data = next(d for d in usa_stock if d["date"] == "2024-01-01")
        self.assertEqual(jan_data["value"], 150.0)

        # 2024-02: 300.0
        feb_data = next(d for d in usa_stock if d["date"] == "2024-02-01")
        self.assertEqual(feb_data["value"], 300.0)

    def test_default_date_filter(self):
        """デフォルトで2000年1月1日以降のデータのみ取得されるか"""
        response = self.client.get(self.url)
        data = response.json()
        usa_stock = data["USA"]["STOCK"]

        # 1999年のデータが含まれていないこと
        dates = [d["date"] for d in usa_stock]
        self.assertNotIn("1999-12-31", dates)

    def test_country_filter(self):
        """国コードでフィルタリングできるか"""
        response = self.client.get(self.url, {"country": "JPN"})
        data = response.json()

        self.assertIn("JPN", data)
        self.assertNotIn("USA", data)

    def test_date_range_filter(self):
        """期間指定(start_date, end_date)が機能するか"""
        params = {"start_date": "2024-02-01", "end_date": "2024-03-01"}
        response = self.client.get(self.url, params)
        data = response.json()
        usa_stock = data["USA"]["STOCK"]

        # 2024-01 は除外され、2024-02 は含まれるはず
        dates = [d["date"] for d in usa_stock]
        self.assertNotIn("2024-01-01", dates)
        self.assertIn("2024-02-01", dates)
