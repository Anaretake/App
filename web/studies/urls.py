from django.urls import path
from . import views 

urlpatterns = [
    path('studies',views.home, name = 'home' ),
    path('upload/', views.upload_study, name = 'upload_study'),
    path('studies/list/',views.study_list,name='study_list'),
]
