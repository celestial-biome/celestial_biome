from datetime import timedelta

from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics

from .models import Earthquake
from .serializers import EarthquakeSerializer


class EarthquakeListView(generics.ListAPIView):
    """
    指定した期間の地震データを返すエンドポイント
    """

    serializer_class = EarthquakeSerializer
    permission_classes = []  # 必要に応じて権限設定

    @extend_schema(
        summary="地震データの取得",
        description="指定した期間（days）や最小マグニチュード（min_magnitude）に基づいて地震データを取得します。",
        parameters=[
            OpenApiParameter(
                name="days",
                type=int,
                location=OpenApiParameter.QUERY,
                description="取得する過去の日数 (デフォルト: 7)",
                required=False,
                default=7,
            ),
            OpenApiParameter(
                name="min_magnitude",
                type=float,
                location=OpenApiParameter.QUERY,
                description="最小マグニチュード (例: 5.0)",
                required=False,
            ),
        ],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        """
        クエリパラメータに基づいてデータをフィルタリングして返す
        """
        queryset = Earthquake.objects.all().order_by("-timestamp")

        # 1. days パラメータの処理 (Astronomy と同様のロジック)
        days_param = self.request.query_params.get("days", 7)
        try:
            days = int(days_param)
        except ValueError:
            days = 7  # 不正な値の場合はデフォルト

        threshold = timezone.now() - timedelta(days=days)
        queryset = queryset.filter(timestamp__gte=threshold)

        # 2. min_magnitude パラメータの処理 (追加機能)
        min_mag = self.request.query_params.get("min_magnitude")
        if min_mag:
            try:
                queryset = queryset.filter(magnitude__gte=float(min_mag))
            except ValueError:
                pass  # 無効な値は無視

        return queryset
