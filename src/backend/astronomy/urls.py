from django.urls import path

from .views import SpaceWeatherListView

urlpatterns = [
    path("space-weather/", SpaceWeatherListView.as_view(), name="space-weather-list"),
]
