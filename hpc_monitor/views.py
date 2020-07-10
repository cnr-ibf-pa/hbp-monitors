# Create your views here.
# -*- coding: utf-8 -*-

from django.shortcuts import render
from django.http import HttpResponse, JsonResponse

from hpc_monitor.utils.hpc import HPC_SYSTEMS

import requests
import json
import pprint


def index(request):
    data = {"hpc": json.dumps(HPC_SYSTEMS)}
    return render(request, 'hpc_index.html', data)


def get_hpc_info(request):
    url = ''
    headers = {
        'Authorization': request.META['HTTP_AUTHORIZATION'],
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    if 'HTTP_X_UNICORE_USER_PREFERENCES' in request.META:
        headers['HTTP_X_UNICORE_USER_PREFERENCES'] = request.META['HTTP_X_UNICORE_USER_PREFERENCES']

    if request.path == '/hpc-monitor/pizdaint':
        url = 'https://brissago.cscs.ch:8080/DAINT-CSCS/rest/core'
    elif request.path == '/hpc-monitor/pizdaint/projects':
        url = 'https://brissago.cscs.ch:8080/DAINT-CSCS/rest/core/factories/default_target_system_factory'
    elif request.path == '/hpc-monitor/galileo':
        url = 'https://grid.hpc.cineca.it:9111/CINECA-GALILEO/rest/core'
    elif request.path == '/hpc-monitor/galileo/projects':
        url = 'https://grid.hpc.cineca.it:9111/CINECA-GALILEO/rest/core/factories/default_target_system_factory'
    r = requests.get(url=url, headers=headers, verify=False)
    try:
        jj = r.json()
        pprint.pprint(jj)
        return JsonResponse(data=jj, status=r.status_code)
    except KeyError:
        print('error')
    return HttpResponse(status=r.status_code, content=r.content)


def check_job_submission(request):
    hpc = None
    pprint.pprint(request.META)

    if request.path == '/hpc-monitor/pizdaint/check':
        hpc = HPC_SYSTEMS['1']
    elif request.path == '/hpc-monitor/galileo/check':
        hpc = HPC_SYSTEMS['2']

    job = hpc['job']['on_system']
    # job['Resources']['Project'] = 
    pprint.pprint(job)
    headers = {
        'Authorization': request.META['HTTP_AUTHORIZATION'],
        'Content-Type': 'application/json'
    }
    if 'HTTP_X_UNICORE_USER_PREFERENCES' in request.META:
        headers['HTTP_X_UNICORE_USER_PREFERENCES'] = request.META['HTTP_X_UNICORE_USER_PREFERENCES']

    r = requests.post(url=hpc['submit_url'], headers=headers, data=job, verify=False)
    print(r.status_code, r.content, sep='\n')
    return HttpResponse(status=r.status_code, content=r.content)
