from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base

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
    name = Column(String)
    lng = Column(String)
    lat = Column(String)

    def __repr__(self):
        return "<Location(id='%s', lng='%s', lat='%s')>" % (
            self.id, self.lng, self.lat)
