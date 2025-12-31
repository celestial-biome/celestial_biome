import json
from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from astronomy.models import SpaceWeatherLog
from astronomy.views import space_weather_list


@pytest.mark.django_db
def test_space_weather_list_empty():
    """データがない場合、空リストが返ることを確認"""
    factory = APIRequestFactory()
    request = factory.get("/astronomy/api/space-weather/")

    response = space_weather_list(request)

    assert response.status_code == 200
    data = json.loads(response.content)
    assert data == []


@pytest.mark.django_db
def test_space_weather_list_pivot_and_fill():
    """
    データ整形ロジックのテスト
    1. 異なる指標(solar_wind, kp)が同じ時刻行にまとまるか (Pivot)
    2. Kp指数が欠損している時刻で、直前の値が入るか (Forward Fill)
    """
    now = timezone.now()
    # 時刻を厳密に合わせるため、変数を固定
    t1 = now - timedelta(hours=2)
    t2 = now - timedelta(hours=1)

    # --- T1: 全データあり ---
    SpaceWeatherLog.objects.create(timestamp=t1, metric="solar_wind_speed", value=400.0)
    SpaceWeatherLog.objects.create(timestamp=t1, metric="kp_index", value=3.0)

    # --- T2: Kp指数が欠損（Solar windのみ） ---
    SpaceWeatherLog.objects.create(timestamp=t2, metric="solar_wind_speed", value=500.0)
    # ここで Kp=3.0 が埋められることを期待

    # API実行
    factory = APIRequestFactory()
    request = factory.get("/astronomy/api/space-weather/")
    response = space_weather_list(request)

    assert response.status_code == 200
    data = json.loads(response.content)

    # データ件数確認
    assert len(data) == 2

    # --- T1 の検証 ---
    # timestampはISO形式文字列になっているため一致検索
    row1 = next(d for d in data if d["timestamp"] == t1.isoformat())
    assert row1["solar_wind_speed"] == 400.0
    assert row1["kp_index"] == 3.0

    # --- T2 の検証 (ffillの確認) ---
    row2 = next(d for d in data if d["timestamp"] == t2.isoformat())
    assert row2["solar_wind_speed"] == 500.0

    # ここが重要: DBにはないが、T1の値(3.0)で埋められているはず
    assert row2["kp_index"] == 3.0
