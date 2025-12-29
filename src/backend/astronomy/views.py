from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pandas as pd
from django.http import JsonResponse
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import serializers, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SpaceWeatherLog
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


@api_view(["GET"])
def space_weather_list(request):
    """
    PostgreSQL (Data Mart) から直近7日間の宇宙天気データを取得し、
    グラフ描画用に整形して返すAPI
    """
    try:
        # 1. DBからデータ取得 (高速)
        # 直近7日分を取得
        threshold = timezone.now() - timedelta(days=7)
        qs = SpaceWeatherLog.objects.filter(timestamp__gte=threshold).order_by("timestamp")

        # データがない場合
        if not qs.exists():
            return JsonResponse([], safe=False)

        # 2. DataFrameに変換
        # QuerySet -> List of Dict -> DataFrame
        data_list = list(qs.values("timestamp", "metric", "value"))
        df = pd.DataFrame(data_list)

        # ---------------------------------------------------------
        # データ整形 (Long Format -> Wide Format)
        # ---------------------------------------------------------
        # DBですでにユニークになっているはずですが、念のため重複排除
        df = df.groupby(["timestamp", "metric"])["value"].mean().reset_index()

        # Pivot: 行=時刻, 列=指標, 値=value
        pivoted = df.pivot(index="timestamp", columns="metric", values="value")

        # --- Kp指数の欠損を「直前の値」で埋める処理 ---
        if "kp_index" in pivoted.columns:
            pivoted["kp_index"] = pivoted["kp_index"].ffill()
        # ----------------------------------------------------

        # index(timestamp) を列に戻す
        pivoted.reset_index(inplace=True)

        # timestampを文字列(ISO format)に変換
        pivoted["timestamp"] = pivoted["timestamp"].apply(lambda x: x.isoformat())

        # NaN (欠損値) を None に置換
        pivoted = pivoted.astype(object).where(pd.notnull(pivoted), None)

        # リスト形式の辞書に変換
        data = pivoted.to_dict(orient="records")

        return JsonResponse(data, safe=False)

    except Exception as e:
        print(f"Error fetching data: {e}")
        return JsonResponse({"error": str(e)}, status=500)
