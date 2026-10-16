from django.urls import path
from . import views


urlpatterns = [
    path("detect-topogram/<int:study_id>/",views.detect_topogram,name="detect_topogram"),
    path("topogram-image/<int:study_id>/",views.topogram_image,name="topogram_image"),
    path( "classify-study/<int:study_id>/", views.classify_study, name="classify_study" ),
]

