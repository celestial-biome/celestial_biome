from collections import defaultdict
from datetime import timedelta

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SpaceWeatherLog
from .serializers import SpaceWeatherLogSerializer


class SpaceWeatherListView(APIView):
    """
    直近7日間の宇宙天気データを取得し、フロントエンド用に整形して返すAPI
    """

    def get(self, request):
        # 1. 期間設定 (直近7日)
        threshold = timezone.now() - timedelta(days=7)

        # 2. DBからデータ取得
        # NOTE: データが空の場合は 'python manage.py ingest_space_weather' を実行して最新データを取得してください
        queryset = SpaceWeatherLog.objects.filter(timestamp__gte=threshold).order_by("timestamp")

        # 3. シリアライザでデータ検証・整形
        serializer = SpaceWeatherLogSerializer(queryset, many=True)
        serialized_data = serializer.data

        # 4. データ整形 (Long Format -> Wide Format)
        grouped_data = defaultdict(dict)

        for item in serialized_data:
            ts = item["timestamp"]
            metric = item["metric"]
            value = item["value"]
            grouped_data[ts][metric] = value

        # 5. リスト化と時系列ソート
        sorted_timestamps = sorted(grouped_data.keys())
        response_data = []

        last_kp = None  # Kp指数の欠損埋め用

        for ts in sorted_timestamps:
            row = grouped_data[ts]

            # Kp指数の前方埋め処理 (Forward Fill)
            if "kp_index" in row and row["kp_index"] is not None:
                last_kp = row["kp_index"]
            elif last_kp is not None:
                row["kp_index"] = last_kp

            item_data = {"timestamp": ts}
            item_data.update(row)
            response_data.append(item_data)

        return Response(response_data)
