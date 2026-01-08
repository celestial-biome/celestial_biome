from rest_framework import serializers

from .models import EconomicIndicator


class EconomicIndicatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = EconomicIndicator
        # フロントエンドの構築に必要なフィールドを網羅します
        fields = ["country_iso3", "date", "indicator_type", "value"]
