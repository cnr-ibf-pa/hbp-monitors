from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.core.serializers.json import DjangoJSONEncoder

from monitors.settings import ADMIN_ID, HBP_MY_USER_URL as USER_URL
from monitors.models import *

import requests
import json


def get_status(request):
    if request.method == 'GET':
        content = {'bsp-hpc-monitor-status': 1}
        return HttpResponse(json.dumps(content), content_type='application/json')


def get_user(request):
    user_id = -1
    application = request.META['HTTP_CONTEXT']

    headers = {
        'Authorization': request.META['HTTP_AUTHORIZATION'],
        'Content-Type': 'application/json'
    }
    r = requests.get(url=USER_URL, headers=headers)
    if r.status_code == 200:
        user_id=int(r.json()['id'])
    
    response = HttpResponse()
    if user_id > -1:
        Access(user_id=user_id, application=application).save()
        response.status_code = 200
        response.content = b'OK'
    else:
        response.status_code = 401
        response.content = b'User not recognized'
    return response


def home(request):
    return render(request, 'home.html')


def get_data(request, user_id=None, application=None):
    
    headers = {
        'Authorization': request.META['HTTP_AUTHORIZATION'],
        'Content-Type': 'application/json'
    }
    r = requests.get(url=USER_URL, headers=headers)
    if r.status_code == 200:
        admin_id = int(r.json()['id'])
        if admin_id in ADMIN_ID:
            
            accesses = Access.objects.all()
            if user_id:
                accesses = accesses.filter(user_id=user_id)
            if application:
                accesses = accesses.filter(application=application.upper())
            
            data = {'accesses': [a.as_json() for a in accesses]}
            return JsonResponse(status=200, data=json.dumps(data, cls=DjangoJSONEncoder), safe=False)

        else:
            return HttpResponse(status=401, content=b'User not allowed')
    else:
        return HttpResponse(status=401, content=b'User not recognized')

