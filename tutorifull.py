from __future__ import (
    absolute_import,
    print_function,
)

import json

from flask import (
    abort,
    Flask,
    render_template,
    request,
)
from sqlalchemy.sql.expression import or_

from constants import (
    CONTACT_TYPE_EMAIL,
    CONTACT_TYPE_SMS,
    CONTACT_TYPE_YO,
    MAX_SEARCH_RESULTS,
)
from dbhelper import db_session
from models import (
    Alert,
    Course,
    Klass,
)
from util import (
    contact_type_description,
    klasses_to_template_courses,
    validate_course_id,
)

app = Flask(__name__)
app.config.from_object('config')


@app.teardown_appcontext
def shutdown_session(exception=None):
    db_session.remove()


@app.route('/', methods=['GET'])
def homepage():
    return render_template('homepage.html')


@app.route('/alert', methods=['GET'])
def show_alert():
    klass_ids = request.args.get('classids', '')
    klass_ids = klass_ids.split(',')

    # get course info from db
    klasses = db_session.query(Klass).filter(Klass.klass_id.in_(klass_ids)).all()
    if not klasses:
        abort(500)  # TODO: render with error

    courses = klasses_to_template_courses(klasses)

    return render_template('alert.html', courses=courses)


@app.route('/api/alerts', methods=['POST'])
def save_alerts():
    # get info from the form
    post_data = request.get_json()
    if post_data.get('email'):
        contact = post_data['email'].lower()
        contact_type = CONTACT_TYPE_EMAIL
    elif post_data.get('phonenumber'):
        contact = post_data['phonenumber']
        contact_type = CONTACT_TYPE_SMS
    elif post_data.get('yoname'):
        contact = post_data['yoname'].upper()
        contact_type = CONTACT_TYPE_YO
    else:
        abort(500)  # TODO: render homepage with error

    # get course info from db
    klass_ids = post_data.get('classids', [])
    klasses = db_session.query(Klass).filter(Klass.klass_id.in_(klass_ids)).all()
    if not klasses:
        abort(500)  # TODO: render homepage with error

    for klass in klasses:
        alert = Alert(klass_id=klass.klass_id, contact_type=contact_type, contact=contact)
        db_session.add(alert)
    db_session.commit()
    courses = klasses_to_template_courses(klasses)

    return render_template('success.html',
                           contact_type=contact_type_description(contact_type),
                           contact=contact,
                           courses=courses)


@app.route('/api/courses', methods=['GET'])
def search_courses():
    search_query = '%' + request.args.get('q', '') + '%'
    courses = db_session.query(Course).filter(or_(Course.name.like(search_query),
                                                  Course.compound_id.like(search_query))).limit(MAX_SEARCH_RESULTS).all()
    courses = [c.to_dict() for c in courses]
    return json.dumps(courses)


@app.route('/api/courses/<course_id>', methods=['GET'])
def course_info(course_id):
    course_id = course_id.upper()
    dept_id, course_id = validate_course_id(course_id)
    course = db_session.query(Course).filter_by(dept_id=dept_id, course_id=course_id).one()
    return json.dumps(course.to_dict(with_classes=True))


if __name__ == '__main__':
    app.run()
