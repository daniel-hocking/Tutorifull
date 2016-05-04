from __future__ import (
    absolute_import,
    print_function,
)

import argparse
from datetime import datetime
import logging
import re
import sys
import time

from bs4 import BeautifulSoup
import requests

from constants import CURRENT_SEM
from contact import send_alerts
from dbhelper import (
    db_session,
    get_redis,
)
from models import (
    Alert,
    Course,
    Dept,
    Klass,
)
from tutorifull import app
from util import (
    hour_of_day_to_seconds_since_midnight,
    web_day_to_int_day,
    web_status_to_db_status,
)


def scrape_course_and_classes(course_id, dept_id, name, klasses):
    '''scrape all the classes in a course'''
    # add the course to the db
    course = Course(course_id=course_id, dept_id=dept_id, name=name)
    db_session.merge(course)

    klasses_to_delete = {klass.klass_id: klass for klass in db_session.query(Klass)
                         .filter_by(course_id=course_id, dept_id=dept_id)
                         .all()}

    for row in klasses:
        klass_type, _, klass_id, _, status, enrollment, _, time_and_place = (d.get_text() for d in row)
        status = web_status_to_db_status(status)
        klass_id = int(klass_id)
        m = re.search(r'(\d+)/(\d+).*', enrollment)
        enrolled = int(m.group(1))
        capacity = int(m.group(2))
        # separate the time from the place

        logging.debug('Storing class with class id:', klass_id)
        logging.debug('Class row fields:', [d.get_text() for d in row])

        m = re.search(r'(\w+) +(\d+(?::\d+)?(?:-\d+(?::\d+)?)?) *#? *(?: *\((?:.*, *)*(.*?)\))?',
                      time_and_place) if time_and_place else None
        if m:
            day = web_day_to_int_day(m.group(1))
            time = m.group(2)
            if '-' in time:
                start_time, end_time = map(hour_of_day_to_seconds_since_midnight, time.split('-'))
            else:
                start_time = hour_of_day_to_seconds_since_midnight(time)
                end_time = start_time + 60 * 60
            location = m.group(3)
            # as a last resort, filter out any locations we've extracted that don't have a letter in them
            # also filter out anything that looks like a range of weeks (eg. w1-12)
            if location is not None and (
                    not re.search(r'[a-zA-Z]', location) or
                    re.match(r'^w\d+(?:-\d+)?$', location)):
                location = None
        else:
            day = None
            start_time = None
            end_time = None
            location = None

        klass = Klass(klass_id=klass_id,
                      course_id=course_id,
                      dept_id=dept_id,
                      klass_type=klass_type,
                      status=status,
                      enrolled=enrolled,
                      capacity=capacity,
                      day=day,
                      start_time=start_time,
                      end_time=end_time,
                      location=location)
        db_session.merge(klass)
        klasses_to_delete.pop(klass_id, None)

    for klass in klasses_to_delete.values():
        logging.debug('Deleting klass %s' % klass)
        db_session.delete(klass)


def scrape_dept(dept_id, name, page):
    '''scrape all the courses in a department'''
    # add the dept to the db
    dept = Dept(dept_id=dept_id, name=name)
    db_session.merge(dept)

    courses_to_delete = {course.compound_id_tuple: course for course in db_session.query(
        Course).filter_by(dept_id=dept_id).all()}

    r = requests.get('http://classutil.unsw.edu.au/' + page)
    dept_page = BeautifulSoup(r.text, 'html.parser')
    klasses = []
    course_id = ''
    for row in dept_page.find_all('table')[2].find_all('tr'):
        data = row.find_all('td')
        if data[0].get('class', [''])[0] == 'cucourse':
            # row is the code and name of a course
            row_course_id = data[0].b.get_text()[4:8]
            if row_course_id == course_id:
                # every now and again we get multiple title rows for the same course
                continue
            if klasses:
                # scrape all the classes from the previous course and empty the array
                courses_to_delete.pop((dept_id, course_id), None)
                scrape_course_and_classes(course_id, dept_id, name, klasses)
                klasses = []
            course_id = row_course_id
            name = data[1].get_text()
        elif row.get('class', [''])[0] == 'rowHighlight' or row.get('class', [''])[0] == 'rowLowlight':
            # row is info about a class
            klasses.append(data)
    # scrape the classes from the last course
    courses_to_delete.pop((dept_id, course_id), None)
    scrape_course_and_classes(course_id, dept_id, name, klasses)

    for course in courses_to_delete.values():
        logging.debug('Deleting course %s' % course)
        db_session.delete(course)

    db_session.commit()


def wait_until_updated():
    # keep checking classutil until it updates
    retry_count = 0
    while True:
        r = requests.get('http://classutil.unsw.edu.au/', stream=True)
        last_time = get_redis().get('last_classutil_update_time')
        if r.headers['Last-Modified'] == last_time:
            retry_count += 1
            if retry_count > 20:
                logging.warn('scraper failed to update, too many retries\n')
                return False

            time.sleep(10)
            continue

        get_redis().set('last_classutil_update_time', r.headers['Last-Modified'])
        break

    return True


def update_classes(force_update=False):
    if not force_update and not wait_until_updated():
        sys.exit(1)

    depts_to_delete = {dept.dept_id: dept for dept in db_session.query(Dept).all()}

    r = requests.get('http://classutil.unsw.edu.au/')
    main_page = BeautifulSoup(r.text, 'html.parser')

    # loop through all the departments on the main page
    for row in main_page.find_all('table')[1].find_all('tr'):
        data = row.find_all('td')
        if data[0]['class'][0] == 'cutabhead':
            # row describes the campus of the below departments
            pass
        elif data[0]['class'][0] == 'data':
            # row describes a department
            links = data[:3]
            dept_info = data[3:]
            links = [d.a['href'] if d.a is not None else None for d in links]
            dept_id, name = (d.get_text() for d in dept_info)
            link = links[CURRENT_SEM]
            # check if the department runs in the current semester
            if link is not None:
                depts_to_delete.pop(dept_id, None)
                scrape_dept(dept_id, name, link)

    for dept in depts_to_delete.values():
        logging.debug('Deleting dept %s' % dept)
        db_session.delete(dept)

    db_session.commit()


def check_alerts():
    triggered_alerts = []
    for alert in db_session.query(Alert):
        if alert.should_alert():
            triggered_alerts.append(alert)
            db_session.delete(alert)

    send_alerts(triggered_alerts)

    db_session.commit()

if __name__ == '__main__':
    print('Starting scraper at %s' % datetime.now())
    with app.app_context():
        parser = argparse.ArgumentParser()
        parser.add_argument('--no-update', action="store_true", help="don't update the database from classutil")
        parser.add_argument('--no-alert', action="store_true", help="don't send out or delete alerts")
        parser.add_argument('--force-update', action="store_true",
                            help="update the database from classutil even if it hasn't updated")
        args = parser.parse_args()

        logging.basicConfig(filename='scraper.log', level=logging.WARNING,
                            format='%(levelname)s:%(asctime)s - %(message)s')

        if not args.no_update:
            update_classes(args.force_update)
        if not args.no_alert:
            check_alerts()
