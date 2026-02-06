from django.urls import path

from .views import CelestialInferenceView

urlpatterns = [
    # ... 既存のパス ...
    path("inference/predict/", CelestialInferenceView.as_view(), name="celestial-predict"),
]
