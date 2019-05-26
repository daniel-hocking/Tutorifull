from __future__ import absolute_import, print_function

from Tutorifull.config import DATABASE, REDIS_PORT
from flask import g
from redis import StrictRedis

def get_redis():
    redis = getattr(g, '_redis', None)
    if redis is None:
        redis = g._redis = StrictRedis(host='localhost', port=REDIS_PORT, db=0)
    return redis
