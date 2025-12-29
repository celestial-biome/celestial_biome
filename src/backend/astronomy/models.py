from django.db import models


class SpaceWeatherLog(models.Model):
    """
    BigQueryから同期された宇宙天気データ（直近7日分）
    """

    timestamp = models.DateTimeField(db_index=True)  # 検索用にインデックス推奨
    metric = models.CharField(max_length=50)
    value = models.FloatField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # 重複データを防ぐための複合ユニーク制約（念のため）
        unique_together = ("timestamp", "metric")
        indexes = [
            models.Index(fields=["timestamp", "metric"]),
        ]

    def __str__(self):
        return f"{self.timestamp} - {self.metric}: {self.value}"
