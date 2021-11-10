from json.decoder import JSONDecodeError
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.core.serializers.json import DjangoJSONEncoder

from monitors.settings import ADMIN_ID, EBRAINS_USER_URL as USER_URL
from monitors.models import *

import requests
import json


def get_status(request):
    if request.method == 'GET':
        content = {'bsp-hpc-monitor-status': 1}
        return HttpResponse(json.dumps(content), content_type='application/json')


def get_user(request):
    user_id = -1
    username = ''
    application = request.META['HTTP_CONTEXT']

    access_token = request.session.get('oidc_access_token')
    if not access_token:
        return HttpResponse(status=401)

    headers = {
        'Authorization': 'Bearer ' + access_token,
        'Content-Type': 'application/json'
    }
    
    try:
        r = requests.get(url=USER_URL, headers=headers)
        if r.status_code == 200:
            user_id = r.json()['sub']
            username = r.json()['preferred_username']

        data = {'access_token': None, 'username': None}
        if user_id:
            Access(user_id=user_id, application=application).save()
            data = {'access_token': access_token, 'username': username}
            return JsonResponse(data, safe=False)
    
    except Exception as e:
        print('ERROR > ' + str(e))

    return HttpResponse(status=401)


def get_user_avatar(request):
    url = 'https://wiki.ebrains.eu/bin/download/XWiki/' + request.user.username \
        + '/avatar.png?width=36&height=36&keepAspectRatio=true'
    r = requests.get(url, verify=False)
    return HttpResponse(content=r.content, content_type='image/png;', charset='UTF-8')


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

