from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.decorators import permission_classes
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
    # ビューをラップして権限チェックを追加する

    # 1. スキーマJSON (管理者のみ)
    urlpatterns += [
        path("api/schema/", permission_classes([IsAdminUser])(SpectacularAPIView.as_view()), name="schema"),
        # 2. Swagger UI (管理者のみ)
        path(
            "api/schema/swagger-ui/",
            permission_classes([IsAdminUser])(SpectacularSwaggerView.as_view(url_name="schema")),
            name="swagger-ui",
        ),
    ]
