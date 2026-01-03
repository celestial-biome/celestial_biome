import pytest
from django.utils import timezone

from geology.models import Earthquake


@pytest.mark.django_db
class TestEarthquakeModel:
    def test_string_representation(self):
        """__str__ メソッドが期待通りのフォーマットかテスト"""
        eq = Earthquake.objects.create(
            usgs_id="us1000test",
            timestamp=timezone.now(),
            magnitude=5.5,
            place="Test Location",
            depth=10.0,
            latitude=35.0,
            longitude=139.0,
        )
        # models.pyの __str__ 実装: f"M{self.magnitude} - {self.place} ({self.timestamp})"
        assert str(eq).startswith("M5.5 - Test Location")

    def test_default_ordering(self):
        """Metaクラスの ordering = ['-timestamp'] が効いているかテスト"""
        time_old = timezone.now() - timezone.timedelta(hours=1)
        time_new = timezone.now()

        # 古いデータを先に作成
        Earthquake.objects.create(
            usgs_id="id_old", timestamp=time_old, magnitude=1, place="Old", depth=0, latitude=0, longitude=0
        )
        # 新しいデータを後に作成
        Earthquake.objects.create(
            usgs_id="id_new", timestamp=time_new, magnitude=2, place="New", depth=0, latitude=0, longitude=0
        )

        earthquakes = Earthquake.objects.all()
        # 新しい順（降順）になっているか確認
        assert earthquakes[0].usgs_id == "id_new"
        assert earthquakes[1].usgs_id == "id_old"
