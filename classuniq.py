from __future__ import (
    absolute_import,
    print_function,
)

import requests
import re
import sys

# DWJKD

CLASSUTIL_URL = "http://classutil.unsw.edu.au/"

f = requests.get(CLASSUTIL_URL)
classutil_home_html = f.text

category_pages = re.findall(r'.{4}_S2\.html', classutil_home_html)

for category in category_pages:
    sys.stderr.write("Visiting: %s%s\n" % (CLASSUTIL_URL, category))
    f = requests.get("%s%s" % (CLASSUTIL_URL, category))
    category_html = f.text

    rows = re.findall(
        r'<tr class="row(?:High|Low)light">(.*?)</tr>', category_html, flags=re.S)
    rows = [re.findall(r'<td.*?>(.*?)</td>', row) for row in rows]
    class_codes = [row[2] for row in rows]
    for code in class_codes:
        print(code.strip())
