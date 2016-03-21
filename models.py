from __future__ import (
    absolute_import,
    print_function,
)

from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    ForeignKeyConstraint,
)
from sqlalchemy.orm import (
    relationship,
    column_property,
)

from dbhelper import Base


class Alert(Base):
    '''An alert that notifies the given contact information when the class has an empty space'''
    __tablename__ = 'alerts'

    alert_id = Column(Integer, primary_key=True)
    klass_id = Column(Integer, ForeignKey('klasses.klass_id'), nullable=False)
    contact_type = Column(Integer, nullable=False)
    contact = Column(String, nullable=False)

    klass = relationship('Klass', back_populates='alerts')

    def __repr__(self):
        return "<Alert(alert_id='%d', klass_id='%d', contact_type='%s', contact='%s')>" % (
            self.alert_id, self.klass_id, self.contact_type, self.contact)

    def should_alert(self):
        if self.klass.enrolled < self.klass.capacity:
            return True
        return False


class Dept(Base):
    '''A department eg. COMP'''
    __tablename__ = 'depts'
    dept_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)

    courses = relationship('Course', order_by='Course.course_id',
                           back_populates='dept', cascade="all, delete, delete-orphan")

    def __repr__(self):
        return "<Dept(dept_id='%s', name='%s')>" % (self.dept_id, self.name)


class Course(Base):
    '''A course eg. COMP2041'''
    __tablename__ = 'courses'
    course_id = Column(String, primary_key=True)
    dept_id = Column(String, ForeignKey('depts.dept_id'), primary_key=True)
    name = Column(String, nullable=False)

    dept = relationship('Dept', back_populates='courses')
    klasses = relationship('Klass', order_by='Klass.start_time', back_populates='course',
                           cascade="all, delete, delete-orphan")

    compound_id = column_property(dept_id + course_id)

    def __repr__(self):
        return "<Course(dept_id='%s, 'course_id='%s', name='%s')>" % (self.dept_id, self.course_id, self.name)

    @property
    def compound_id_tuple(self):
        return (self.dept_id, self.course_id)

    def to_dict(self, with_classes=False):
        d = {'course_id': self.compound_id,
             'course_name': self.name}
        if with_classes:
            d['classes'] = [klass.to_dict() for klass in sorted(self.klasses, key=lambda c: (c.klass_type, c.day))]
        return d


class Klass(Base):
    '''A class time eg. COMP2041 tutelab on Wednesday from 3pm to 6pm'''
    __tablename__ = 'klasses'
    klass_id = Column(Integer, primary_key=True)
    course_id = Column(String, nullable=False)
    dept_id = Column(String, nullable=False)
    klass_type = Column(String, nullable=False)  # LEC/LAB/TUT etc.
    status = Column(Integer, nullable=False)
    enrolled = Column(Integer, nullable=False)
    capacity = Column(Integer, nullable=False)
    day = Column(Integer)
    start_time = Column(Integer)
    end_time = Column(Integer)
    location = Column(String)
    __table_args__ = (
        ForeignKeyConstraint(
            ['course_id', 'dept_id'],
            ['courses.course_id', 'courses.dept_id'],
            name="fk_course"
        ),
    )

    course = relationship('Course', back_populates='klasses')
    alerts = relationship('Alert', order_by='Alert.alert_id', back_populates='klass',
                          cascade="all, delete, delete-orphan")

    def __repr__(self):
        return "<Klass(klass_id='%d', dept_id='%s', course_id='%s', klass_type='%s')>" % (
            self.klass_id, self.dept_id, self.course_id, self.klass_type)

    def to_dict(self):
        from util import (
            db_status_to_text_status,
            int_day_to_text_day,
            seconds_since_midnight_to_hour_of_day,
        )
        return {'class_id': self.klass_id,
                'type': self.klass_type,
                'day': int_day_to_text_day(self.day),
                'start_time': seconds_since_midnight_to_hour_of_day(self.start_time),
                'end_time': seconds_since_midnight_to_hour_of_day(self.end_time),
                'location': self.location,
                'status': db_status_to_text_status(self.status),
                'enrolled': self.enrolled,
                'capacity': self.capacity,
                'percentage': int((float(self.enrolled) / self.capacity) * 100)}
