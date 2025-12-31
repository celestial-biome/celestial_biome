import pytest
from django.utils import timezone

from astronomy.models import SpaceWeatherLog


@pytest.mark.django_db
def test_create_space_weather_log():
    """SpaceWeatherLogモデルが正しく作成できるか確認"""
    now = timezone.now()
    log = SpaceWeatherLog.objects.create(timestamp=now, metric="solar_wind_speed", value=500.5)

    assert SpaceWeatherLog.objects.count() == 1
    assert log.metric == "solar_wind_speed"
    assert log.value == 500.5
