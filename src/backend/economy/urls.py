from django.urls import path

from .views import EconomyDashboardView

urlpatterns = [
    path("world-economy/", EconomyDashboardView.as_view()),
]
