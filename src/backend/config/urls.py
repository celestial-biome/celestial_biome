from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import IsAdminUser

urlpatterns = [
    path("admin/", admin.site.urls),
    # APIエンドポイント
    path("api/v1/astronomy/", include("astronomy.urls")),
    path("api/v1/geology/", include("geology.urls")),
    path("api/v1/economy/", include("economy.urls")),
]

# Swagger関連の定義
if settings.DEBUG:
    # 開発環境
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/schema/swagger-ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    ]
else:
    # 本番環境: 管理者(IsAdminUser)のみアクセスOK
    # as_view の引数で permission_classes を指定する
    urlpatterns += [
        # 1. スキーマJSON (管理者のみ)
        path("api/schema/", SpectacularAPIView.as_view(permission_classes=[IsAdminUser]), name="schema"),
        # 2. Swagger UI (管理者のみ)
        path(
            "api/schema/swagger-ui/",
            SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[IsAdminUser]),
            name="swagger-ui",
        ),
    ]
