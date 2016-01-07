# -*- coding:utf-8 -*-
from sqlalchemy import create_engine
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from models import User
from models import Location
import models

engine = create_engine(
    'sqlite:///./insight.db', convert_unicode=True, echo=True)
db_session = scoped_session(sessionmaker(autocommit=False,
                                         autoflush=False,
                                         bind=engine))
Base = declarative_base()
Base.query = db_session.query_property()


def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == '__main__':
    models.init_db(engine)
    loc1 = Location(name=u'异常', lng="120.662445", lat="31.153545")
    loc2 = Location(name=u'件', lng="120.663445", lat="31.152545")
    loc3 = Location(name=u'发生', lng="120.664445", lat="31.151545")

    db_session.add(loc1)
    db_session.add(loc2)
    db_session.add(loc3)
    db_session.commit()

    our_loc = db_session.query(Location).all()

    for instance in our_loc:
        print instance.name, instance.lng, instance.lat
