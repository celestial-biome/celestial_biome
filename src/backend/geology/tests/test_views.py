from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from geology.models import Earthquake


@pytest.mark.django_db
class TestEarthquakeListView:
    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def create_sample_data(self):
        """テストデータ作成"""
        now = timezone.now()

        # 1. 最新で大きい地震 (今日, M6.0) -> Tokyo
        Earthquake.objects.create(
            usgs_id="eq1",
            timestamp=now,
            magnitude=6.0,
            place="Tokyo",
            depth=30.0,
            latitude=35.6,
            longitude=139.7,
        )
        # 2. 最新だが小さい地震 (今日, M4.5) -> Osaka
        Earthquake.objects.create(
            usgs_id="eq2",
            timestamp=now - timedelta(minutes=5),
            magnitude=4.5,
            place="Osaka",
            depth=10.0,
            latitude=34.7,
            longitude=135.5,
        )
        # 3. 古い地震 (10日前, M7.0) -> Sendai
        Earthquake.objects.create(
            usgs_id="eq3",
            timestamp=now - timedelta(days=10),
            magnitude=7.0,
            place="Sendai",
            depth=20.0,
            latitude=38.2,
            longitude=140.8,
        )

    def test_get_earthquake_list_default(self, api_client, create_sample_data):
        """パラメータなしのデフォルト動作（過去7日間）"""
        url = reverse("earthquake-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # デフォルトは7日なので、10日前の eq3 は除外され、eq1, eq2 の2件になるはず
        assert len(response.data) == 2

        # 降順確認 (eq1 -> eq2)
        assert response.data[0]["usgs_id"] == "eq1"
        assert response.data[1]["usgs_id"] == "eq2"

    def test_filter_by_days(self, api_client, create_sample_data):
        """daysパラメータによる期間フィルタリング"""
        url = reverse("earthquake-list")

        # 30日分を指定 -> 10日前の eq3 も含まれて3件になるはず
        response = api_client.get(url, {"days": 30})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3

        # 1日分を指定 -> 今日作成した eq1, eq2 のみ
        response = api_client.get(url, {"days": 1})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_filter_by_min_magnitude(self, api_client, create_sample_data):
        """min_magnitudeパラメータによるフィルタリング"""
        url = reverse("earthquake-list")

        # M5.0以上を指定 -> M4.5の eq2 が除外される (eq1のみ。eq3は7日以上前なのでデフォルトで除外)
        response = api_client.get(url, {"min_magnitude": 5.0})

        assert response.status_code == status.HTTP_200_OK
        # デフォルト7日以内で M5.0以上 は eq1 (Tokyo, M6.0) のみ
        assert len(response.data) == 1
        assert response.data[0]["usgs_id"] == "eq1"

    def test_filter_days_and_magnitude(self, api_client, create_sample_data):
        """days と min_magnitude の組み合わせテスト"""
        url = reverse("earthquake-list")

        # 30日以内 かつ M5.0以上 -> eq1(今日, M6.0) と eq3(10日前, M7.0) が対象
        response = api_client.get(url, {"days": 30, "min_magnitude": 5.0})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        ids = {item["usgs_id"] for item in response.data}
        assert "eq1" in ids
        assert "eq3" in ids
        assert "eq2" not in ids  # M4.5なので除外

    def test_empty_list(self, api_client):
        """データが空の場合のテスト"""
        url = reverse("earthquake-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data == []
