from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView


# テスト用の簡易APIビュー関数
def hello_world(request):
    return JsonResponse({"message": "Hello from Celestial Biome Backend! hello hirotaka"})


urlpatterns = [
    path("admin/", admin.site.urls),
    # APIのエンドポイントを追加
    path("api/hello/", hello_world),
    path("api/v1/astronomy/", include("astronomy.urls")),
    path("api/v1/geology/", include("geology.urls")),
    path("api/v1/economy/", include("economy.urls")),
    # == OpenAPI/Swagger ドキュメントの設定 ==
    # 1. スキーマファイル(YAML/JSON)自体のダウンロード用URL
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    # 2. Swagger UI (ブラウザで見やすいAPIドキュメント)
    path("api/schema/swagger-ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # 3. Redoc (別のデザインのドキュメント、お好みで)
    path("api/schema/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
