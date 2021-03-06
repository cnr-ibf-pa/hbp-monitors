from django.http import HttpResponse
from django.shortcuts import render

from bsp_monitor.utils.tools import g

import json
import datetime
import bisect
import numpy as np


class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        else:
            return super(NpEncoder, self).default(obj)


# @login_required(login_url=LOGIN_URL)
def index(request):
    return render(request, 'bsp_index.html')


# @login_required(login_url=LOGIN_URL)
def get_access_token(request, token_type=""):
    """"
    Get token to grant access to google services
    """
    if token_type == "ganalytics" or token_type == "gsheet":
        g.GoogleStatManager.get_token(token_type)
        return HttpResponse(json.dumps({'access_token' + '_' + token_type: g.GoogleStatManager.get_token(token_type)}),
                            content_type="application/json")

    elif token_type == "all":
        access_token_ganalytics = g.GoogleStatManager.get_token("ganalytics")
        access_token_gsheet = g.GoogleStatManager.get_token("gsheet")
        final_dict = {"access_token_ganalytics": access_token_ganalytics, "access_token_gsheet": access_token_gsheet}
        return HttpResponse(json.dumps(final_dict), content_type="application/json")


# @login_required(login_url=LOGIN_URL)
def get_gs(request):
    client = g.GoogleStatManager.get_gs_client()
    sheet = client.open('Usecases - Collabs (Responses)').sheet1
    usecases = sheet.get_all_records()
    return HttpResponse(json.dumps({"Response": "OK"}), content_type="application/json")


# @login_required(login_url=LOGIN_URL)
def get_uc(request, start_date="0", end_date="0"):
    """
    Get usecases stats
    """

    sheet = g.GoogleStatManager.get_gs_sheet()
    result = sheet.col_values(1)

    col_id = sheet.col_values(6)
    res = []
    result_no_alex = []

    del col_id[0]
    del result[0]
    i = 0
    count_alex = 0
    for u_id in col_id:
        if u_id != '305933' and u_id != '305664' and u_id != '305650':
            res.append(u_id)
            result_no_alex.append(result[i])
            i = i + 1
        else:
            count_alex += 1
            i = i + 1

    uc_name = []
    uc_topics = []
    print("###########################")
    print("no alex:", len(result_no_alex))
    print("alex:", len(result))
    print("count alex:", count_alex)
    print("###########################")
    dates = g.GoogleStatManager.convert_to_datetime(result_no_alex[1:], "gsheet")

    if start_date == "0":
        last_day = datetime.datetime.today()
        first_day = last_day - datetime.timedelta(days=1)
    else:
        first_day = g.GoogleStatManager.convert_to_datetime([start_date], "short")[0]
        last_day = g.GoogleStatManager.convert_to_datetime([end_date], "short")[0]

    lower = bisect.bisect_left(dates, first_day)
    upper = bisect.bisect_right(dates, last_day)

    if lower == upper:
        response = "KO"
        rt_uc_num = 0
        uc_topics = []
        uc_topics_count = []
    else:
        uc_names = sheet.range("C" + str(lower) + ":C" + str(upper))
        uc_names_str = [x.value for x in uc_names]

        uc_list = g.FileManager.get_uc_json()
        uc_topics_names = g.FileManager.get_name_convention()

        uc_topics = []

        # create final dictionary
        uc_full = {}
        for i in uc_list:
            uctn = uc_topics_names[uc_list[i]]
            if uctn not in uc_full:
                uc_full[uctn] = {}
            if i not in uc_full[uctn]:
                uc_full[uctn][i] = 0

        for i in uc_names_str:
            if i not in uc_list:
                continue
            uctn = uc_topics_names[uc_list[i]]
            uc_topics.append(uctn)
            if start_date is not "0":
                uc_full[uctn][i] += 1

        uc_topics_np = np.array(uc_topics)
        uc_topics_unique, uc_topics_count = np.unique(uc_topics_np, return_counts=True)

        rt_uc_num = upper - lower

        response = "OK"

    return HttpResponse(json.dumps({"Response": response, "rt_uc_num": int(rt_uc_num),
                                    "uc_topics": list(uc_topics_unique),
                                    "uc_topics_count": list(uc_topics_count),
                                    "uc_topics_full": uc_full}, cls=NpEncoder),
                        content_type="application/json")


# @login_required(login_url=LOGIN_URL)
def get_uc_item_list(request):
    uc_topics_names = g.FileManager.get_name_convention()
    return HttpResponse(json.dumps({"Response": "OK", "UC_TOPICS_NAMES": uc_topics_names}),
                        content_type="application/json")
