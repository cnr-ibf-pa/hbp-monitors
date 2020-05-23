"""bsp_monitor URL Configuration

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
from django.urls import path, register_converter

from bsp_monitor.utils import converters

from bsp_monitor import views

register_converter(converters.DateConverter, 'date_format')
register_converter(converters.TokenTypeConverter, 'token_type')


urlpatterns = [
    path('', views.index),
    path('get-access-token/<token_type:token_type>/', views.get_access_token),
    path('get-gs/', views.get_gs),
    path('get-uc-item-list/', views.get_uc_item_list),
    path('get-uc/<date_format:start_date>/<date_format:end_date>/', views.get_uc),
]

# if settings.DEBUG:
#     urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
