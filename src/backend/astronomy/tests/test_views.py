import json
from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from astronomy.models import SpaceWeatherLog
from astronomy.views import SpaceWeatherListView


@pytest.mark.django_db
def test_space_weather_list_empty():
    """データがない場合、空リストが返ることを確認"""
    factory = APIRequestFactory()
    request = factory.get("/astronomy/api/space-weather/")

    view = SpaceWeatherListView.as_view()
    response = view(request)
    response.render()

    assert response.status_code == 200
    data = json.loads(response.content)
    assert data == []


@pytest.mark.django_db
def test_space_weather_list_pivot_and_fill():
    """
    データ整形ロジックのテスト
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

    # API実行
    factory = APIRequestFactory()
    request = factory.get("/astronomy/api/space-weather/")

    view = SpaceWeatherListView.as_view()
    response = view(request)
    response.render()

    assert response.status_code == 200
    data = json.loads(response.content)

    assert len(data) == 2

    # 【修正ポイント】DRFの出力(Z)に合わせて検索用文字列を作成
    # isoformat() は "2024-01-01T12:00:00+00:00" を返すが、
    # DRFは "2024-01-01T12:00:00Z" を返す可能性があるため置換して統一する
    t1_str = t1.isoformat().replace("+00:00", "Z")
    t2_str = t2.isoformat().replace("+00:00", "Z")

    # --- T1 の検証 ---
    row1 = next(d for d in data if d["timestamp"] == t1_str)
    assert row1["solar_wind_speed"] == 400.0
    assert row1["kp_index"] == 3.0

    # --- T2 の検証 (ffillの確認) ---
    row2 = next(d for d in data if d["timestamp"] == t2_str)
    assert row2["solar_wind_speed"] == 500.0
    assert row2["kp_index"] == 3.0


@pytest.mark.django_db
def test_space_weather_list_filter_days():
    """
    daysパラメータによる期間フィルタリングのテスト
    """
    now = timezone.now()

    # 1. データ作成
    # 3日前（デフォルト7日に含まれる）
    t_recent = now - timedelta(days=3)
    SpaceWeatherLog.objects.create(timestamp=t_recent, metric="solar_wind_speed", value=300.0)

    # 10日前（デフォルト7日に含まれない）
    t_old = now - timedelta(days=10)
    SpaceWeatherLog.objects.create(timestamp=t_old, metric="solar_wind_speed", value=300.0)

    factory = APIRequestFactory()
    view = SpaceWeatherListView.as_view()

    # --- ケースA: パラメータなし（デフォルト7日） ---
    # 期待値: 3日前のデータのみ取得できる
    request = factory.get("/astronomy/api/space-weather/")
    response = view(request)
    response.render()  # ★ここを追加
    data = json.loads(response.content)

    assert len(data) == 1
    # 日付文字列の比較（"Z"対応）
    expected_ts = t_recent.isoformat().replace("+00:00", "Z")
    assert data[0]["timestamp"] == expected_ts

    # --- ケースB: days=30 を指定 ---
    # 期待値: 10日前のデータも含まれて、合計2件取得できる
    request_long = factory.get("/astronomy/api/space-weather/", {"days": 30})
    response_long = view(request_long)
    response_long.render()  # ★ここを追加
    data_long = json.loads(response_long.content)

    assert len(data_long) == 2

    # --- ケースC: days=1 を指定 ---
    # 期待値: 3日前のデータも範囲外になり、0件になる
    request_short = factory.get("/astronomy/api/space-weather/", {"days": 1})
    response_short = view(request_short)
    response_short.render()  # ★ここを追加
    data_short = json.loads(response_short.content)

    assert len(data_short) == 0
