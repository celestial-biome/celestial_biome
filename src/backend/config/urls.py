from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


# テスト用の簡易APIビュー関数
def hello_world(request):
    return JsonResponse({"message": "Hello from Celestial Biome Backend! hello hirotaka"})


urlpatterns = [
    path("admin/", admin.site.urls),
    # APIのエンドポイントを追加
    path("api/hello/", hello_world),
    path("api/v1/astronomy/", include("astronomy.urls")),
]
