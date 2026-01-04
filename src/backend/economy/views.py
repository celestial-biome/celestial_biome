from collections import defaultdict

from rest_framework.response import Response
from rest_framework.views import APIView

from .models import EconomicIndicator


class EconomyDashboardView(APIView):
    def get(self, request):
        # 全データを一括取得してPython側で整形（データ量によるが、今回はシンプル化）
        data = EconomicIndicator.objects.all().order_by("date")

        # 構造: { 'USA': { 'STOCK': [{date, value}, ...], 'GDP': ... } }
        response_data = defaultdict(lambda: defaultdict(list))

        for item in data:
            response_data[item.country_iso3][item.indicator_type].append(
                {"date": item.date.strftime("%Y-%m-%d"), "value": item.value}
            )

        return Response(response_data)
