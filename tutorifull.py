from __future__ import (
    absolute_import,
    print_function,
)

from collections import defaultdict
import json

from flask import (
    abort,
    Flask,
    g,
    render_template,
    request,
)
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy.sql.expression import or_

from constants import (
    CONTACT_TYPE_EMAIL,
    CONTACT_TYPE_SMS,
    CONTACT_TYPE_YO,
    MAX_SEARCH_RESULTS,
)
from dbhelper import (
    connect_db,
    init_db,
)
from models import (
    Alert,
    Course,
    Klass,
)
from util import (
    contact_type_description,
    validate_course_id,
)

app = Flask(__name__)
app.config.from_object('config')

init_db('sqlite:///' + app.config['DATABASE'])


@app.before_request
def before_request():
    g.db = connect_db()


@app.teardown_request
def teardown_request(exception):
    db = getattr(g, 'db', None)
    if db is not None:
        db.commit()
        db.close()


@app.route('/', methods=['GET'])
def homepage():
    return render_template('homepage.html')


@app.route('/alert', methods=['GET'])
def show_alert():
    klass_ids = request.args.get('classids', '')
    try:
        klass_ids = [int(klass_id) for klass_id in klass_ids.split(',')]
    except ValueError:
        abort(418)  # TODO: render with error I guess

    # get course info from db
    # TODO: refactor this so less copy pasty from below
    courses_dict = defaultdict(list)
    for klass_id in klass_ids:
        # TODO: check giving this strings/non-existent ids
        try:
            klass = g.db.query(Klass).filter_by(klass_id=klass_id).one()
        except NoResultFound:
            continue
        courses_dict[klass.course.compound_id].append(klass)

    if not courses_dict:
        # no classes to display on the alert page
        abort(418)  # TODO: render with error I guess

    courses = [{'course_id': course_id,
                'classes': [c.to_dict() for c in sorted(classes, key=lambda c: (c.klass_type, c.day, c.start_time))]}
               for course_id, classes in sorted(courses_dict.iteritems())]

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
    courses_dict = defaultdict(list)
    for klass_id in post_data.get('classids', []):
        try:
            klass = g.db.query(Klass).filter_by(klass_id=klass_id).one()
        except NoResultFound:
            continue
        # insert the fact that they want to be notified into the db
        alert = Alert(klass_id=klass_id, contact_type=contact_type, contact=contact)
        g.db.add(alert)

        courses_dict[klass.course.compound_id].append(klass)

    courses = [{'course_id': course_id,
                'classes': [c.to_dict() for c in sorted(classes, key=lambda c: (c.klass_type, c.day, c.start_time))]}
               for course_id, classes in sorted(courses_dict.iteritems())]

    return render_template('success.html',
                           contact_type=contact_type_description(contact_type),
                           contact=contact,
                           courses=courses)


@app.route('/api/courses', methods=['GET'])
def search_courses():
    search_query = '%' + request.args.get('q', '') + '%'
    courses = g.db.query(Course).filter(or_(Course.name.like(search_query),
                                            Course.compound_id.like(search_query))).limit(MAX_SEARCH_RESULTS).all()
    courses = [c.to_dict() for c in courses]
    return json.dumps(courses)


@app.route('/api/courses/<course_id>', methods=['GET'])
def course_info(course_id):
    course_id = course_id.upper()
    dept_id, course_id = validate_course_id(course_id)
    course = g.db.query(Course).filter_by(dept_id=dept_id, course_id=course_id).one()
    return json.dumps(course.to_dict(with_classes=True))


if __name__ == '__main__':
    app.run()
