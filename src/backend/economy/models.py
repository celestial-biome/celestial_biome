from django.db import models


class EconomicIndicator(models.Model):
    """
    国別・年/日別の経済指標データ（Data Mart）
    """

    COUNTRY_CHOICES = [
        ("USA", "United States"),
        ("JPN", "Japan"),
        ("CHN", "China"),
        ("IND", "India"),
        ("DEU", "Germany"),
        ("GBR", "United Kingdom"),
        ("FRA", "France"),
        ("CAN", "Canada"),
        ("AUS", "Australia"),
    ]

    TYPE_CHOICES = [
        ("STOCK", "Stock Index"),
        ("GDP", "GDP (Constant 2015 US$)"),
        ("INFLATION", "Inflation (CPI %)"),
    ]

    country_iso3 = models.CharField(max_length=3, choices=COUNTRY_CHOICES, db_index=True)
    date = models.DateField(db_index=True)
    indicator_type = models.CharField(max_length=20, choices=TYPE_CHOICES, db_index=True)
    value = models.FloatField(null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("country_iso3", "date", "indicator_type")
        indexes = [
            models.Index(fields=["country_iso3", "indicator_type", "date"]),
        ]

    def __str__(self):
        """
        管理画面などでオブジェクトを表示する際の文字列表現
        例: Japan - GDP (Constant 2015 US$) (2024-01-01)
        """
        return f"{self.get_country_iso3_display()} - {self.get_indicator_type_display()} ({self.date})"
