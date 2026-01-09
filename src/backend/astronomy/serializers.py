from rest_framework import serializers

from .models import SpaceWeatherLog


class SpaceWeatherLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpaceWeatherLog
        fields = ["timestamp", "metric", "value"]
