from django.db import models


class Earthquake(models.Model):
    """
    BigQueryから同期された地震データ（直近7日分）
    """

    usgs_id = models.CharField(max_length=50, unique=True, help_text="USGS Event ID")
    timestamp = models.DateTimeField(db_index=True)
    magnitude = models.FloatField()
    place = models.CharField(max_length=255)
    depth = models.FloatField(help_text="Depth in km")
    latitude = models.FloatField()
    longitude = models.FloatField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # マグニチュード順や発生時刻順で取得することが多いためインデックスを貼る
        indexes = [
            models.Index(fields=["timestamp", "magnitude"]),
        ]
        ordering = ["-timestamp"]
        verbose_name = "Earthquake"
        verbose_name_plural = "Earthquakes"

    def __str__(self):
        return f"M{self.magnitude} - {self.place} ({self.timestamp})"
