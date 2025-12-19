from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import OrbitalCalculator


class PlanetCoordinatesSerializer(serializers.Serializer):
    x = serializers.ListField(child=serializers.FloatField())
    y = serializers.ListField(child=serializers.FloatField())


class SolarSystemResponseSerializer(serializers.Serializer):
    timestamps = serializers.ListField(child=serializers.CharField())
    bodies = serializers.DictField(child=PlanetCoordinatesSerializer())


class SolarSystemEphemerisView(APIView):
    """
    指定期間の太陽系惑星座標(x, y in AU)を取得する。
    太陽中心・黄道座標系。
    """

    @extend_schema(
        parameters=[
            OpenApiParameter(name="start_date", description="開始日 (ISO8601, default: now)", required=False, type=str),
            OpenApiParameter(name="days", description="取得期間の日数 (default: 365)", required=False, type=int),
            OpenApiParameter(name="steps", description="データ点数 (default: 100)", required=False, type=int),
        ],
        responses={200: SolarSystemResponseSerializer},
    )
    def get(self, request):
        # パラメータ取得
        start_str = request.query_params.get("start_date")
        days = int(request.query_params.get("days", 365))
        steps = int(request.query_params.get("steps", 100))

        # 期間設定
        tz = ZoneInfo("UTC")
        if start_str:
            try:
                start_dt = datetime.fromisoformat(start_str)
                if start_dt.tzinfo is None:
                    start_dt = start_dt.replace(tzinfo=tz)
            except ValueError:
                return Response({"error": "Invalid date format"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            start_dt = datetime.now(tz)

        end_dt = start_dt + timedelta(days=days)

        # 計算実行
        try:
            calculator = OrbitalCalculator()
            data = calculator.calculate_positions(start_dt, end_dt, steps)
            return Response(data)
        except Exception as e:
            # 本番ではロギングを行う
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
