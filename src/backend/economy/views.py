from collections import defaultdict
from datetime import date, datetime

from django.db.models import Avg
from django.db.models.functions import TruncMonth
from drf_spectacular.types import OpenApiTypes

# Swagger (drf-spectacular)
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import EconomicIndicator


class EconomyDashboardView(APIView):
    """
    世界経済データの取得API (月次集計版・フィルタリング対応)
    """

    @extend_schema(
        summary="世界経済データの取得 (月次集計版)",
        description="指定された期間・条件で経済指標データを取得し、月ごとの平均値に集約して返します。\n\n"
        "レスポンス構造: `{国コード: {指標タイプ: [時系列データ]}}`",
        # ▼ ここにパラメータ定義を追加
        parameters=[
            OpenApiParameter(
                name="start_date",
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description="データの取得開始日 (YYYY-MM-DD)。指定がない場合は 2000-01-01。",
                required=False,
                examples=[OpenApiExample("Example", value="2020-01-01")],
            ),
            OpenApiParameter(
                name="end_date",
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description="データの取得終了日 (YYYY-MM-DD)。指定がない場合は最新まで。",
                required=False,
            ),
            OpenApiParameter(
                name="country",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="国コード (ISO3) で絞り込む場合に指定 (例: USA)。カンマ区切りで複数指定も可 (例: USA,JPN)。",  # noqa: E501
                required=False,
            ),
        ],
        responses={200: OpenApiTypes.OBJECT},
        examples=[
            OpenApiExample(
                "Response Example",
                summary="成功時のレスポンス例",
                description="国コードをキーとし、指標タイプごとの時系列データ配列が含まれます。",
                value={
                    "USA": {"STOCK": [{"date": "2020-01-01", "value": 100.5}, {"date": "2020-02-01", "value": 102.3}]}
                },
                response_only=True,
            )
        ],
    )
    def get(self, request):
        # --- 1. パラメータの取得とデフォルト値の設定 ---

        # 開始日 (デフォルト: 2000-01-01)
        start_date_param = request.query_params.get("start_date")
        start_date = date(2000, 1, 1)
        if start_date_param:
            try:
                start_date = datetime.strptime(start_date_param, "%Y-%m-%d").date()
            except ValueError:
                pass  # フォーマット不正時はデフォルトを使用

        # 基本のクエリセット作成
        queryset = EconomicIndicator.objects.filter(date__gte=start_date)

        # 終了日 (オプション)
        end_date_param = request.query_params.get("end_date")
        if end_date_param:
            try:
                end_date = datetime.strptime(end_date_param, "%Y-%m-%d").date()
                queryset = queryset.filter(date__lte=end_date)
            except ValueError:
                pass

        # 国コードフィルタ (オプション)
        country_param = request.query_params.get("country")
        if country_param:
            # "USA,JPN" のようにカンマ区切りが来ても対応できるようにリスト化
            countries = [c.strip() for c in country_param.split(",") if c.strip()]
            if countries:
                queryset = queryset.filter(country_iso3__in=countries)

        # --- 2. 月次集計とデータ取得 ---
        queryset = (
            queryset.annotate(month=TruncMonth("date"))
            .values("month", "country_iso3", "indicator_type")
            .annotate(value=Avg("value"))
            .order_by("month")
        )

        # --- 3. レスポンス構築 ---
        response_data = defaultdict(lambda: defaultdict(list))

        for item in queryset:
            country = item["country_iso3"]
            ind_type = item["indicator_type"]
            date_str = item["month"].strftime("%Y-%m-%d")

            response_data[country][ind_type].append({"date": date_str, "value": item["value"]})

        return Response(response_data)
