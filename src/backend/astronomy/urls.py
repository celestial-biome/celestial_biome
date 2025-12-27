from django.urls import path

from . import views
from .views import SolarSystemEphemerisView

urlpatterns = [
    path("positions/", SolarSystemEphemerisView.as_view(), name="solar-positions"),
    path("space-weather/", views.space_weather_list, name="space_weather_list"),
]
