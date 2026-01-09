import pytest
from django.utils import timezone

from astronomy.models import SpaceWeatherLog
from astronomy.serializers import SpaceWeatherLogSerializer


@pytest.mark.django_db
def test_serializer_contains_expected_fields():
    """
    シリアライザが必要なフィールドを正しく出力できるか確認
    """
    # 1. テストデータ作成
    now = timezone.now()
    log = SpaceWeatherLog.objects.create(timestamp=now, metric="xray_flux", value=1.5)

    # 2. シリアライズ実行
    serializer = SpaceWeatherLogSerializer(log)
    data = serializer.data

    # 3. 検証
    # キーが存在することを確認
    assert set(data.keys()) == {"timestamp", "metric", "value"}

    # 値が正しいことを確認
    # DRFのDateTimeFieldはデフォルトでISOフォーマットの文字列になる
    assert data["timestamp"] == now.isoformat().replace("+00:00", "Z")
    assert data["metric"] == "xray_flux"
    assert data["value"] == 1.5
