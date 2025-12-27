from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pandas as pd
from django.conf import settings
from django.http import JsonResponse
from drf_spectacular.utils import OpenApiParameter, extend_schema
from google.cloud import bigquery
from rest_framework import serializers, status
from rest_framework.decorators import api_view
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


@api_view(["GET"])
def space_weather_list(request):
    """
    BigQueryから直近7日間の宇宙天気データを取得し、
    グラフ描画用に整形して返すAPI
    """
    try:
        client = bigquery.Client()

        # SQL: 直近7日間のデータを取得
        # データがまだ少ない場合やUTCのズレを考慮して少し広めに取るか、LIMITをつけるのも手です
        query = f"""
            SELECT timestamp, metric, value
            FROM `{settings.GOOGLE_CLOUD_PROJECT}.celestial_biome_data.space_weather_metrics`
            WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
            ORDER BY timestamp ASC
        """

        query_job = client.query(query)
        rows = query_job.result()
        df = rows.to_dataframe()

        if df.empty:
            return JsonResponse([], safe=False)

        # ---------------------------------------------------------
        # データ整形 (Long Format -> Wide Format)
        # ---------------------------------------------------------
        # 1. 重複排除: 同じ時刻・同じ指標なら平均をとる
        df = df.groupby(["timestamp", "metric"])["value"].mean().reset_index()

        # 2. Pivot: 行=時刻, 列=指標, 値=value
        pivoted = df.pivot(index="timestamp", columns="metric", values="value")

        if "kp_index" in pivoted.columns:
            # Kp指数は3時間ごとなので、間の1分刻みのデータは直前の値で埋める(ffill)
            pivoted["kp_index"] = pivoted["kp_index"].ffill()
            # データの先頭がnullの場合に備えて0埋め等はせず、描画時に任せます

        # 3. index(timestamp) を列に戻す
        pivoted.reset_index(inplace=True)

        # 4. timestampを文字列(ISO format)に変換 (JSON化のため)
        pivoted["timestamp"] = pivoted["timestamp"].apply(lambda x: x.isoformat())

        # 5. NaN (欠損値) を None に置換 (JSONのnullになる)
        # astype(object) を追加して、確実に None が入るようにします
        pivoted = pivoted.astype(object).where(pd.notnull(pivoted), None)

        # 6. リスト形式の辞書に変換
        data = pivoted.to_dict(orient="records")

        return JsonResponse(data, safe=False)

    except Exception as e:
        print(f"Error fetching BigQuery data: {e}")
        return JsonResponse({"error": str(e)}, status=500)
