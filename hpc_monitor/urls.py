from django.urls import path
from hpc_monitor import views

urlpatterns = [

    path('', views.index, name='index'),

    # path('user', views.get_user, name='user'),

    path('pizdaint', views.get_hpc_info, name='pizdaint'),
    path('pizdaint/projects', views.get_hpc_info, name='pizdaint-projects'),
    path('pizdaint/check', views.check_job_submission, name='pizdaint-check-job-submission'),
    path('galileo', views.get_hpc_info, name='galileo'),
    path('galileo/projects', views.get_hpc_info, name='galileo-projects'),
    path('galileo/check', views.check_job_submission, name='galileo-check-job-submission')

]
