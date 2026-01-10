from collections import defaultdict

from rest_framework.response import Response
from rest_framework.views import APIView

from .models import EconomicIndicator
from .serializers import EconomicIndicatorSerializer


class EconomyDashboardView(APIView):
    """
    2020年から世界経済のデータを取得し、フロントエンド用に整形して返すAPI
    """

    def get(self, request):
        # 1. データを取得
        queryset = EconomicIndicator.objects.all().order_by("date")

        # 2. シリアライザでデータを検証・整形（ここでModelオブジェクト -> 辞書リストに変換）
        serializer = EconomicIndicatorSerializer(queryset, many=True)
        serialized_data = serializer.data

        # 3. フロントエンドが期待する構造（国 > 指標 > 配列）に再構築
        # 構造: { 'USA': { 'STOCK': [{date, value}, ...], ... } }
        response_data = defaultdict(lambda: defaultdict(list))

        for item in serialized_data:
            country = item["country_iso3"]
            ind_type = item["indicator_type"]

            # 必要なデータだけを抽出してリストに追加
            response_data[country][ind_type].append({"date": item["date"], "value": item["value"]})

        return Response(response_data)
