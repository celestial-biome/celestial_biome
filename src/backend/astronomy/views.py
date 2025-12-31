from datetime import timedelta

import pandas as pd
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view

from .models import SpaceWeatherLog


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
