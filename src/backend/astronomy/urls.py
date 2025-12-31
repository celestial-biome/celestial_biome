from django.urls import path

from . import views

urlpatterns = [
    path("space-weather/", views.space_weather_list, name="space_weather_list"),
]
