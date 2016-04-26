from __future__ import (
    absolute_import,
    print_function,
)

from collections import defaultdict
import requests

from config import YO_API_KEY
from constants import (
    CONTACT_TYPE_EMAIL,
    CONTACT_TYPE_SMS,
    CONTACT_TYPE_YO,
)


def send_alerts(alerts):
    # organizes the alerts by contact info then sends one alert per contact info

    klasses_by_contact = defaultdict(list)

    for alert in alerts:
        klasses_by_contact[(alert.contact, alert.contact_type)].append(alert.klass)

    for contact, klasses in klasses_by_contact.iteritems():
        contact, contact_type = contact
        if contact_type == CONTACT_TYPE_EMAIL:
            alert_by_email(contact, klasses)
        elif contact_type == CONTACT_TYPE_SMS:
            alert_by_sms(contact, klasses)
        elif contact_type == CONTACT_TYPE_YO:
            alert_by_yo(contact, klasses)


def alert_by_email(email, klasses):
    print('sending email to', email)


def alert_by_sms(phone_number, klasses):
    print('sending sms to', phone_number)


def alert_by_yo(username, klasses):
    print('sending yo to', username)
    send_yo(username, 'meme.school?name=' + str(len(klasses)))


def send_yo(username, link=None):
    requests.post("http://api.justyo.co/yo/",
                  data={'api_token': YO_API_KEY,
                        'username': username,
                        'link': link,
                        'text': 'A spot has opened up!'})
