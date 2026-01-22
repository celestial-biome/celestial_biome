from django.urls import path

from .views import AuthLogView, UserManageView

urlpatterns = [
    path("log/", AuthLogView.as_view(), name="auth_log"),
    path("me/", UserManageView.as_view(), name="user_manage"),
]
