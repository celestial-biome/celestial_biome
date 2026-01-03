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
        Earthquake.objects.create(
            usgs_id="eq1",
            timestamp=timezone.now(),
            magnitude=6.0,
            place="Tokyo",
            depth=30.0,
            latitude=35.6,
            longitude=139.7,
        )
        Earthquake.objects.create(
            usgs_id="eq2",
            timestamp=timezone.now() - timezone.timedelta(days=1),
            magnitude=4.5,
            place="Osaka",
            depth=10.0,
            latitude=34.7,
            longitude=135.5,
        )

    def test_get_earthquake_list(self, api_client, create_sample_data):
        """GETリクエストの正常系テスト"""
        # urls.py の name='earthquake-list' を使用してURLを解決
        url = reverse("earthquake-list")

        response = api_client.get(url)

        # ステータスコード 200 OK
        assert response.status_code == status.HTTP_200_OK

        # データ件数の確認 (2件作成したので2件返るはず)
        assert len(response.data) == 2

        # レスポンス構造とシリアライザのフィールド確認
        first_record = response.data[0]
        expected_fields = {"id", "usgs_id", "timestamp", "magnitude", "place", "depth", "latitude", "longitude"}
        assert set(first_record.keys()) == expected_fields

        # 内容の検証（降順なので最新の "eq1" が先頭のはず）
        assert first_record["usgs_id"] == "eq1"
        assert first_record["place"] == "Tokyo"

    def test_empty_list(self, api_client):
        """データが空の場合のテスト"""
        url = reverse("earthquake-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data == []
