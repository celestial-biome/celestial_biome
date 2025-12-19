from django.urls import path

from .views import SolarSystemEphemerisView

urlpatterns = [
    path("positions/", SolarSystemEphemerisView.as_view(), name="solar-positions"),
]
