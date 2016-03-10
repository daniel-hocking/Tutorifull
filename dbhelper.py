from __future__ import (
    absolute_import,
    print_function,
)

from sqlalchemy import (
    create_engine,
    event,
)
from sqlalchemy.engine import Engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()


def init_db(path):
    engine = create_engine(path)
    Base.metadata.create_all(engine)
    global Session
    Session = sessionmaker(bind=engine)


def connect_db():
    return Session()


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
