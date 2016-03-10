#!/usr/bin/python

from __future__ import (
    absolute_import,
    print_function,
)

import re
import requests

CLASSUTIL_URL = "http://classutil.unsw.edu.au/"
SEMESTER = "S2"
YO_API_TOKEN = "2b172b99-5329-4313-989e-6d6f34d6f1fb"

to_check = {'ARTS1631': ['6242', '6248', '6253']}

for course, classes in to_check:
    f = requests.get("%s%s_%s.html" % (CLASSUTIL_URL, course[:4], SEMESTER))
    classutil_html = f.text

    for c in classes:
        status = re.search(r'<td>\s*%s\s*</td><td>.*?</td><td>(.*?)</td>' %
                           c, classutil_html, re.MULTILINE)
        print(status.group(1))
        if status.group(1) != 'Full':
            requests.post("http://api.justyo.co/yo/",
                          data={'api_token': YO_API_TOKEN, 'username': 'CHYBBY',
                                'link': 'http://classutil.unsw.edu.au/ARTS_S2.html\
                                   #ARTS1631T2'})
