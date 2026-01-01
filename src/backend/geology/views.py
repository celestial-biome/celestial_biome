from rest_framework import generics

from .models import Earthquake
from .serializers import EarthquakeSerializer


class EarthquakeListView(generics.ListAPIView):
    """
    直近7日間の地震データを返すエンドポイント
    """

    queryset = Earthquake.objects.all().order_by("-timestamp")
    serializer_class = EarthquakeSerializer
    permission_classes = []  # 必要に応じて権限設定
