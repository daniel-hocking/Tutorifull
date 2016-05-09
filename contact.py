from __future__ import (
    absolute_import,
    print_function,
)

from collections import defaultdict
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import render_template
import json
import requests
from subprocess import (
    Popen,
    PIPE,
)

from config import (
    DOMAIN_NAME,
    TELSTRA_CONSUMER_KEY,
    TELSTRA_CONSUMER_SECRET,
    YO_API_KEY,
)
from constants import (
    CONTACT_TYPE_EMAIL,
    CONTACT_TYPE_SMS,
    CONTACT_TYPE_YO,
)
from dbhelper import get_redis


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


def create_alert_link(klass_ids):
    return DOMAIN_NAME + '/alert?classids=' + ','.join(map(str, klass_ids))


def alert_by_email(email, klasses):
    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'A spot has opened up in a class!'
    msg['From'] = 'tutorifull@' + DOMAIN_NAME + '(Tutorifull)'
    msg['To'] = email

    text = "this is the text version of the email"
    html = render_template('email.html')

    part1 = MIMEText(text, 'plain')
    part2 = MIMEText(html, 'html')

    msg.attach(part1)
    msg.attach(part2)

    pipe = Popen(['sendmail', '-f', 'alert@%s' % DOMAIN_NAME, '-t', email], stdin=PIPE).stdin
    pipe.write(msg.as_string())
    pipe.close()


def alert_by_sms(phone_number, klasses):
    send_sms(phone_number,
             "A spot has opened up in a class: %s" % create_alert_link(k.klass_id for k in klasses))


def alert_by_yo(username, klasses):
    send_yo(username,
            create_alert_link(k.klass_id for k in klasses),
            'A spot has opened up in a class!')


def send_yo(username, link=None, text=None):
    requests.post("http://api.justyo.co/yo/",
                  data={'api_token': YO_API_KEY,
                        'username': username,
                        'link': link,
                        'text': text})
    # TODO: make sure this returns the right http code


def get_telstra_api_access_token():
    access_token = get_redis().get('telstra_api_access_token')
    if access_token is not None:
        return access_token

    r = requests.post('https://api.telstra.com/v1/oauth/token',
                      data={
                          'client_id': TELSTRA_CONSUMER_KEY,
                          'client_secret': TELSTRA_CONSUMER_SECRET,
                          'scope': 'SMS',
                          'grant_type': 'client_credentials'
                      }).json()
    # TODO: make sure this returns the right http code
    # cache the access token in redis, making it expire slightly earlier than it does on the Telstra server
    get_redis().setex('telstra_api_access_token', int(r['expires_in']) - 60, r['access_token'])
    return r['access_token']


def send_sms(phone_number, message):
    access_token = get_telstra_api_access_token()
    r = requests.post('https://api.telstra.com/v1/sms/messages',
                      headers={'Authorization': 'Bearer %s' % access_token},
                      data=json.dumps({
                          'to': phone_number,
                          'body': message
                      }))
    # TODO: make sure this returns the right http code
