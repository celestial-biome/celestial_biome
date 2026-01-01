from rest_framework import serializers

from .models import Earthquake


class EarthquakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Earthquake
        fields = ["id", "usgs_id", "timestamp", "magnitude", "place", "depth", "latitude", "longitude"]
