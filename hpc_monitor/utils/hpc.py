# HPC System enabled

from monitors.settings import ROOT_SITE_URL as ROOT_URL


HPC_SYSTEMS = {

    '0': {
        'name': 'JURECA (JSC)',
        'id': 'JURECA',
        'root_url': 'https://hbp-unic.fz-juelich.de:7112/HBP_JURECA/rest/core',
        'submit_url': 'https://hbp-unic.fz-juelich.de:7112/HBP_JURECA/rest/core/jobs',
        'quota_url': 'https://hbp-unic.fz-juelich.de:7112/HBP_JURECA/rest/core/factories/default_target_system_factory',
        'system': 'UNICORE',
        'job': {
            'on_system': "{'Executable': '/bin/date', 'Resources': {'Runtime': '60'}}",
            'on_service_account': "none"
        }
    },

    '1': {
        'name': 'PIZDAINT (CSCS)',
        'id': 'PIZDAINT',
        'root_url': ROOT_URL + '/hpc-monitor/pizdaint',
        'submit_url': 'https://unicoregw.cscs.ch:8080/DAINT-CSCS/rest/core/jobs',
        'quota_url': ROOT_URL + '/hpc-monitor/pizdaint/projects',
        'system': 'UNICORE',
        'job': {
            'on_system': "{'Executable': '/bin/date', 'Resources': {'Runtime': '60', 'NodeConstraints': 'mc'}}",
            'on_service_account': {
                'is_link': True,
                'value': 'https://bspsa.cineca.it/jobs/pizdaint/'
            }
        }
    },

    '2': {
        'name': 'GALILEO (CINECA)',
        'id': 'GALILEO',
        'root_url': ROOT_URL + '/hpc-monitor/galileo',
        'submit_url': 'https://grid.hpc.cineca.it:9111/CINECA-GALILEO/rest/core/jobs',
        'quota_url': ROOT_URL + '/hpc-monitor/galileo/projects',
        'system': 'UNICORE',
        'job': {
            'on_system': "{'Executable': '/bin/date', 'Resources': {'Runtime': '60'}}",
            'on_service_account': "none"
        }
    },

    '3': {
        'name': 'NSG',
        'id': 'NSG',
        'root_url': 'https://nsgr.sdsc.edu:8443/cipresrest/v1',
        'system': 'UNKNOWN',
        'job': {
            'on_system': 'none',
            'on_service_account': {
                'is_link': True,
                'value': 'https://bspsa.cineca.it/jobs/nsg/'
            }
        }
    }

}
