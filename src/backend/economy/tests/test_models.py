from django.db.utils import IntegrityError
from django.test import TestCase

from economy.models import EconomicIndicator


class EconomicIndicatorModelTest(TestCase):
    def test_string_representation(self):
        """モデルの文字列変換(__str__)が期待通りであることを確認"""
        indicator = EconomicIndicator.objects.create(
            country_iso3="USA", date="2024-01-01", indicator_type="GDP", value=100.0
        )
        # get_xxx_display() が使われているか確認
        expected_str = "United States - GDP (Constant 2015 US$) (2024-01-01)"
        self.assertEqual(str(indicator), expected_str)

    def test_unique_constraint(self):
        """(国, 日付, 指標タイプ) の組み合わせがユニークであることを確認"""
        EconomicIndicator.objects.create(country_iso3="JPN", date="2024-01-01", indicator_type="STOCK", value=100.0)

        # 同じ組み合わせで作成しようとするとエラーになるはず
        with self.assertRaises(IntegrityError):
            EconomicIndicator.objects.create(country_iso3="JPN", date="2024-01-01", indicator_type="STOCK", value=200.0)
