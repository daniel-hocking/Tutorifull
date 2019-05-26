from __future__ import absolute_import, print_function

from Tutorifull.constants import STATUS_OPEN
from Tutorifull.app import db

class Alert(db.Model):
    '''An alert that notifies the given contact information when the class has
    an empty space'''
    __tablename__ = 'alerts'

    alert_id = db.Column(db.Integer, primary_key=True)
    klass_id = db.Column(db.Integer, db.ForeignKey('klasses.klass_id'), nullable=False)
    contact_type = db.Column(db.Integer, nullable=False)
    contact = db.Column(db.String, nullable=False)

    klass = db.relationship('Klass', back_populates='alerts')

    def __repr__(self):
        return ("<Alert(alert_id='%d', klass_id='%d', contact_type='%s', " +
                "contact='%s')>" % (self.alert_id, self.klass_id,
                                    self.contact_type, self.contact))

    def should_alert(self):
        if (self.klass.status == STATUS_OPEN and
                self.klass.enrolled < self.klass.capacity):
            return True
        return False


class Dept(db.Model):
    '''A department eg. COMP'''
    __tablename__ = 'depts'
    dept_id = db.Column(db.String, primary_key=True)
    name = db.Column(db.String, nullable=False)

    courses = db.relationship('Course', order_by='Course.course_id',
                           back_populates='dept',
                           cascade="all, delete, delete-orphan")

    def __repr__(self):
        return "<Dept(dept_id='%s', name='%s')>" % (self.dept_id, self.name)


class Course(db.Model):
    '''A course eg. COMP2041'''
    __tablename__ = 'courses'
    course_id = db.Column(db.String, primary_key=True)
    dept_id = db.Column(db.String, db.ForeignKey('depts.dept_id'), primary_key=True)
    name = db.Column(db.String, nullable=False)

    dept = db.relationship('Dept', back_populates='courses')
    klasses = db.relationship('Klass', back_populates='course',
                           cascade="all, delete, delete-orphan")

    compound_id = db.column_property(dept_id + course_id)

    def __repr__(self):
        return "<Course(dept_id='%s, 'course_id='%s', name='%s')>" % (
            self.dept_id, self.course_id, self.name)

    @property
    def compound_id_tuple(self):
        return (self.dept_id, self.course_id)

    def to_dict(self, with_classes=False):

        def sort_key(c):
            return (c.klass_type,
                    c.timeslots[0].day if c.timeslots else None,
                    c.timeslots[0].start_time if c.timeslots else None)

        d = {'course_id': self.compound_id,
             'course_name': self.name}
        if with_classes:
            d['classes'] = [klass.to_dict()
                            for klass in sorted(self.klasses,
                                                key=sort_key)]
        return d


class Klass(db.Model):
    '''A class you can choose when you are enrolling
    (a lab, a series of lectures, etc.)'''
    __tablename__ = 'klasses'
    klass_id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.String, nullable=False)
    dept_id = db.Column(db.String, nullable=False)
    klass_type = db.Column(db.String, nullable=False)  # LEC/LAB/TUT etc.
    status = db.Column(db.Integer, nullable=False)
    enrolled = db.Column(db.Integer, nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    # to check whether we need to update the timeslots
    timeslot_raw_string_hash = db.Column(db.Integer, nullable=False)
    __table_args__ = (
        db.ForeignKeyConstraint(
            ['course_id', 'dept_id'],
            ['courses.course_id', 'courses.dept_id'],
            name="fk_course"
        ),
    )

    timeslots = db.relationship('Timeslot', back_populates='klass',
                             cascade="all, delete, delete-orphan")
    course = db.relationship('Course', back_populates='klasses')
    alerts = db.relationship('Alert', order_by='Alert.alert_id',
                          back_populates='klass',
                          cascade="all, delete, delete-orphan")

    def __repr__(self):
        return ("<Klass(klass_id='%d', dept_id='%s', course_id='%s', " +
                "klass_type='%s')>" % (self.klass_id, self.dept_id,
                                       self.course_id, self.klass_type))

    def to_dict(self):
        from Tutorifull.util import db_status_to_text_status

        if self.capacity == 0:
            percentage = 0
        else:
            percentage = int((float(self.enrolled) / self.capacity) * 100)

        return {'class_id': self.klass_id,
                'type': self.klass_type,
                'timeslots': [timeslot.to_dict()
                              for timeslot in self.timeslots],
                'status': db_status_to_text_status(self.status),
                'enrolled': self.enrolled,
                'capacity': self.capacity,
                'percentage': percentage}


class Timeslot(db.Model):
    __tablename__ = 'timeslots'
    timeslot_id = db.Column(db.Integer, primary_key=True)
    klass_id = db.Column(db.Integer, db.ForeignKey('klasses.klass_id'), nullable=False)
    day = db.Column(db.Integer)
    start_time = db.Column(db.Integer)
    end_time = db.Column(db.Integer)
    location = db.Column(db.String)

    def __repr__(self):
        from Tutorifull.util import (
            int_day_to_text_day,
            seconds_since_midnight_to_hour_of_day,
        )

        return ("<Timeslot(day='%d', start_time='%d', end_time='%s', " +
                "location='%s')>" % (int_day_to_text_day(self.day),
                                     seconds_since_midnight_to_hour_of_day(
                    self.start_time),
                    seconds_since_midnight_to_hour_of_day(
                    self.end_time),
                    self.location))

    def to_dict(self):
        from Tutorifull.util import (
            int_day_to_text_day,
            seconds_since_midnight_to_hour_of_day,
        )

        return {'day': int_day_to_text_day(self.day),
                'start_time': seconds_since_midnight_to_hour_of_day(
                    self.start_time),
                'end_time': seconds_since_midnight_to_hour_of_day(
                    self.end_time),
                'location': self.location}

    klass = db.relationship('Klass', back_populates='timeslots')

def init_db():
    db.create_all()

if __name__ == '__main__':
    init_db()
