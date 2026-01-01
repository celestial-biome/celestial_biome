from django.urls import path

from .views import EarthquakeListView

urlpatterns = [
    path("earthquakes/", EarthquakeListView.as_view(), name="earthquake-list"),
]
