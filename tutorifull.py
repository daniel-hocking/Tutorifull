from __future__ import (
    absolute_import,
    print_function,
)

import json

from flask import (
    abort,
    flash,
    Flask,
    g,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
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
)
from util import (
    contact_type_description,
    validate_course_id,
    validate_klass_id,
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


@app.route('/', methods=['GET', 'POST'])
def homepage():
    if request.method == 'POST':
        # get info from the form
        klass_id = validate_klass_id(request.form['klassid'])
        if request.form['email']:
            contact = request.form['email']
            contact_type = CONTACT_TYPE_EMAIL
        elif request.form['phonenumber']:
            contact = request.form['phonenumber']
            contact_type = CONTACT_TYPE_SMS
        elif request.form['yoname']:
            contact = request.form['yoname']
            contact_type = CONTACT_TYPE_YO
        else:
            abort(500)  # TODO: render homepage with error
        # insert the fact that they want to be notified into the db
        alert = Alert(klass_id=klass_id, contact_type=contact_type, contact=contact)
        g.db.add(alert)
        return render_template('success.html',
                               contact_type=contact_type_description(contact_type),
                               contact=contact)
    return render_template('homepage.html')


@app.route('/api/course', methods=['GET'])
def search_courses():
    search_query = '%' + request.args.get('q', '') + '%'
    courses = g.db.query(Course).filter(or_(Course.name.like(search_query),
                                            Course.compound_id.like(search_query))).limit(MAX_SEARCH_RESULTS).all()
    courses = [c.to_dict() for c in courses]
    return json.dumps(courses)


@app.route('/api/course/<course_id>', methods=['GET'])
def course_info(course_id):
    course_id = course_id.upper()
    dept_id, course_id = validate_course_id(course_id)
    course = g.db.query(Course).filter_by(dept_id=dept_id, course_id=course_id).one()
    return json.dumps(course.to_dict(with_classes=True))


if __name__ == '__main__':
    app.run()
