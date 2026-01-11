from collections import defaultdict
from datetime import timedelta

from django.utils import timezone

# OpenApiParameter を追加インポート
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SpaceWeatherLog
from .serializers import SpaceWeatherLogSerializer


class SpaceWeatherListView(APIView):
    """
    指定した期間（デフォルト7日間）の宇宙天気データを取得し、フロントエンド用に整形して返すAPI
    """

    # swagger用のドキュメント情報
    @extend_schema(
        summary="宇宙天気データの時系列取得",
        description="指定した期間（daysパラメータ）のデータを取得し、タイムスタンプごとのオブジェクトに整形して返します。",
        # ▼ ここに Parameters の設定を追加しました ▼
        parameters=[
            OpenApiParameter(
                name="days",
                type=int,
                location=OpenApiParameter.QUERY,
                description="取得する過去の日数 (デフォルト: 7)",
                required=False,
                default=7,
            ),
        ],
        responses={
            200: OpenApiResponse(
                description="整形された宇宙天気データのリスト",
                # 実際に返却される辞書の構造をここで定義します
                response=inline_serializer(
                    name="SpaceWeather",
                    many=True,  # リスト形式で返ることを指定
                    fields={
                        "timestamp": serializers.DateTimeField(),
                        "solar_wind_speed": serializers.FloatField(help_text="太陽風速度 (km/s)", required=False),
                        "solar_wind_density": serializers.FloatField(help_text="太陽風密度 (p/cm3)", required=False),
                        "kp_index": serializers.FloatField(help_text="Kp指数", required=False),
                        # 他に metric があればここに追加
                    },
                ),
            )
        },
    )
    def get(self, request):
        # 1. 期間設定 (パラメータから取得、デフォルト7日)
        # URLの ?days=30 などを受け取ります
        days_param = request.query_params.get("days", 7)
        try:
            days = int(days_param)
        except ValueError:
            days = 7  # 不正な値の場合はデフォルトに戻す

        threshold = timezone.now() - timedelta(days=days)

        # 2. DBからデータ取得
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

        last_kp = None

        for ts in sorted_timestamps:
            row = grouped_data[ts]

            # Kp指数の前方埋め処理
            if "kp_index" in row and row["kp_index"] is not None:
                last_kp = row["kp_index"]
            elif last_kp is not None:
                row["kp_index"] = last_kp

            item_data = {"timestamp": ts}
            item_data.update(row)
            response_data.append(item_data)

        return Response(response_data)
