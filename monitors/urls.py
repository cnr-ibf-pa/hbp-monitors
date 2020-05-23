"""monitors URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path, include, register_converter

from monitors import views
from monitors.utils import converters


register_converter(converters.ApplicationConverter, 'app')


urlpatterns = [
    path('', views.home, name='home'),
    path('user', views.get_user, name='user'),
    path('get-data', views.get_data, name='get_data'),
    path('get-data/<int:user_id>', views.get_data, name='get_data'),
    path('get-data/<app:application>', views.get_data, name='get_data'),
    path('get-data/<int:user_id>/<app:application>', views.get_data, name='get_data'),

    path('bsp-monitor/', include('bsp_monitor.urls')),
    path('hpc-monitor/', include('hpc_monitor.urls')),
]  # + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
