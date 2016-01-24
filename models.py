from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy import ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


def init_db(engine):
    Base.metadata.create_all(bind=engine)

# Put your models here


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String)
    fullname = Column(String)
    password = Column(String)

    def __repr__(self):
        return "<User(name='%s', fullname='%s', password='%s')>" % (
            self.name, self.fullname, self.password)


class Location(Base):
    __tablename__ = 'locations'
    id = Column(Integer, primary_key=True)
    name = Column(String)
    lng = Column(String)
    lat = Column(String)

    def __repr__(self):
        return "<Location(id='%s', lng='%s', lat='%s')>" % (
            self.id, self.lng, self.lat)


class Event(Base):
    __tablename__ = 'events'
    id = Column(Integer, primary_key=True)
    type = Column(Integer)
    location_id = Column(Integer, ForeignKey('locations.id'))
    name = Column(String)
    factor = Column(Integer)
    snapshot = Column(String)
    dt = Column(DateTime)
    status = Column(Integer)  # 0 init, 1 handled

    def __repr__(self):
        return "<Event(id='%s', type='%s', Location='%s'>" % (
            self.id, self.type, self.location_id)


class Department(Base):
    __tablename__ = 'departments'
    id = Column(Integer, primary_key=True)
    type = Column(Integer)
    name = Column(String)
    person = Column(String)
    phone = Column(String)
    mobile = Column(String)
    email = Column(String)

    def __repr__(self):
        return "<Department(id='%s'>" % (self.id)


class Management(Base):
    __tablename__ = 'managements'
    id = Column(Integer, primary_key=True)
    event_type = Column(Integer)
    department_id = Column(Integer, ForeignKey('departments.id'))

    def __repr__(self):
        return "<Management(id='%s'>" % (self.id)
